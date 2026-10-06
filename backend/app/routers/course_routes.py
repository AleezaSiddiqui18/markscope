from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Course, AssessmentComponent, CourseEnrollment, Student, Faculty, User, AuditLog
from ..schemas import CourseCreate, CourseUpdate, CourseResponse, ComponentCreate, ComponentResponse
from ..auth import get_current_user, require_roles

router = APIRouter(prefix="/api/courses", tags=["Courses"])


class UnlockRequest(BaseModel):
    reason: str


@router.get("", response_model=List[CourseResponse])
def get_courses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "HOD":
        courses = db.query(Course).all()
    elif current_user.role == "FACULTY":
        if current_user.faculty_profile:
            courses = db.query(Course).filter(Course.faculty_id == current_user.faculty_profile.id).all()
        else:
            courses = db.query(Course).all()
    elif current_user.role == "STUDENT":
        if not current_user.student_profile:
            return []
        courses = db.query(Course).join(CourseEnrollment).filter(
            CourseEnrollment.student_id == current_user.student_profile.id
        ).all()
    else:
        courses = []

    res = []
    for c in courses:
        res.append({
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "semester": c.semester,
            "academic_year": c.academic_year,
            "faculty_id": c.faculty_id,
            "faculty_name": c.faculty.user.full_name if c.faculty and c.faculty.user else "Unassigned",
            "status": c.status,
            "is_locked": c.is_locked,
            "locked_at": c.locked_at,
            "enrolled_count": len(c.enrollments),
            "components": [
                {
                    "id": comp.id,
                    "course_id": comp.course_id,
                    "name": comp.name,
                    "type": comp.type,
                    "max_marks": comp.max_marks,
                    "weightage": comp.weightage,
                    "order_index": comp.order_index,
                    "is_best_of_n": comp.is_best_of_n,
                    "best_of_n_count": comp.best_of_n_count,
                    "total_subtests": comp.total_subtests
                } for comp in sorted(c.components, key=lambda x: x.order_index)
            ]
        })
    return res


@router.post("", response_model=CourseResponse)
def create_course(
    course_in: CourseCreate,
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    # Check course code uniqueness
    existing = db.query(Course).filter(Course.code == course_in.code.upper().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Course code '{course_in.code}' already exists.")

    faculty_id = None
    if current_user.faculty_profile:
        faculty_id = current_user.faculty_profile.id
    else:
        first_fac = db.query(Faculty).first()
        faculty_id = first_fac.id if first_fac else 1

    # Validate weightages if components provided
    if course_in.components:
        total_weight = sum(c.weightage for c in course_in.components)
        if abs(total_weight - 100.0) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Total component weightage must equal exactly 100%. Current sum: {total_weight}%."
            )

    course = Course(
        code=course_in.code.upper().strip(),
        name=course_in.name.strip(),
        semester=course_in.semester,
        academic_year=course_in.academic_year,
        faculty_id=faculty_id,
        status="DRAFT",
        is_locked=False
    )
    db.add(course)
    db.flush()

    # Add components
    for idx, comp_data in enumerate(course_in.components):
        comp = AssessmentComponent(
            course_id=course.id,
            name=comp_data.name.strip(),
            type=comp_data.type.upper(),
            max_marks=comp_data.max_marks,
            weightage=comp_data.weightage,
            order_index=idx,
            is_best_of_n=comp_data.is_best_of_n,
            best_of_n_count=comp_data.best_of_n_count,
            total_subtests=comp_data.total_subtests
        )
        db.add(comp)

    # Enroll students if IDs provided, otherwise enroll all active students
    student_ids = course_in.enrolled_student_ids
    if not student_ids:
        all_students = db.query(Student).all()
        student_ids = [s.id for s in all_students]

    for sid in student_ids:
        enroll = CourseEnrollment(course_id=course.id, student_id=sid)
        db.add(enroll)

    # Audit log
    audit = AuditLog(
        course_id=course.id,
        user_id=current_user.id,
        action="COURSE_CREATED",
        entity_type="Course",
        entity_id=str(course.id),
        details_json=f"Created course {course.code} with {len(course_in.components)} components and {len(student_ids)} students."
    )
    db.add(audit)
    db.commit()
    db.refresh(course)

    return {
        "id": course.id,
        "code": course.code,
        "name": course.name,
        "semester": course.semester,
        "academic_year": course.academic_year,
        "faculty_id": course.faculty_id,
        "faculty_name": current_user.full_name,
        "status": course.status,
        "is_locked": course.is_locked,
        "locked_at": course.locked_at,
        "enrolled_count": len(course.enrollments),
        "components": [
            {
                "id": comp.id,
                "course_id": comp.course_id,
                "name": comp.name,
                "type": comp.type,
                "max_marks": comp.max_marks,
                "weightage": comp.weightage,
                "order_index": comp.order_index,
                "is_best_of_n": comp.is_best_of_n,
                "best_of_n_count": comp.best_of_n_count,
                "total_subtests": comp.total_subtests
            } for comp in course.components
        ]
    }


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check student enrollment permission
    if current_user.role == "STUDENT":
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.student_id == current_user.student_profile.id
        ).first()
        if not enrollment:
            raise HTTPException(status_code=403, detail="You are not enrolled in this course.")

    return {
        "id": course.id,
        "code": course.code,
        "name": course.name,
        "semester": course.semester,
        "academic_year": course.academic_year,
        "faculty_id": course.faculty_id,
        "faculty_name": course.faculty.user.full_name if course.faculty and course.faculty.user else "Unassigned",
        "status": course.status,
        "is_locked": course.is_locked,
        "locked_at": course.locked_at,
        "enrolled_count": len(course.enrollments),
        "components": [
            {
                "id": comp.id,
                "course_id": comp.course_id,
                "name": comp.name,
                "type": comp.type,
                "max_marks": comp.max_marks,
                "weightage": comp.weightage,
                "order_index": comp.order_index,
                "is_best_of_n": comp.is_best_of_n,
                "best_of_n_count": comp.best_of_n_count,
                "total_subtests": comp.total_subtests
            } for comp in sorted(course.components, key=lambda x: x.order_index)
        ]
    }


@router.post("/{course_id}/lock")
def lock_course(
    course_id: int,
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.is_locked:
        raise HTTPException(status_code=400, detail="Course is already locked.")

    # Validate weightages sum before locking
    total_weight = sum(c.weightage for c in course.components)
    if abs(total_weight - 100.0) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot lock course: Component weightages must sum to 100% (currently {total_weight}%)."
        )

    course.is_locked = True
    course.status = "LOCKED"
    course.locked_at = datetime.utcnow()
    course.locked_by_id = current_user.id

    audit = AuditLog(
        course_id=course.id,
        user_id=current_user.id,
        action="COURSE_LOCKED",
        entity_type="Course",
        entity_id=str(course.id),
        details_json=f"Course {course.code} locked by {current_user.full_name} ({current_user.role})."
    )
    db.add(audit)
    db.commit()

    return {"message": f"Course {course.code} has been securely locked.", "status": "LOCKED", "is_locked": True}


@router.post("/{course_id}/unlock")
def unlock_course(
    course_id: int,
    body: UnlockRequest,
    current_user: User = Depends(require_roles(["HOD"])),  # Strictly HOD only
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if not course.is_locked:
        raise HTTPException(status_code=400, detail="Course is not locked.")

    if not body.reason or len(body.reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="An official reason of at least 5 characters is required to unlock marks.")

    course.is_locked = False
    course.status = "VALIDATED"
    course.locked_at = None
    course.locked_by_id = None

    audit = AuditLog(
        course_id=course.id,
        user_id=current_user.id,
        action="COURSE_UNLOCKED",
        entity_type="Course",
        entity_id=str(course.id),
        details_json=f"Course unlocked by HOD {current_user.full_name}. Reason: {body.reason}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Course {course.code} unlocked for revisions.", "status": "VALIDATED", "is_locked": False}
