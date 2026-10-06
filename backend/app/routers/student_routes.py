from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Student, Course, CourseEnrollment, User, MarkVersion, Mark, AuditLog, ReviewRequest
from ..schemas import ExplainMarksResponse, WhatIfRequest, WhatIfResponse, MarkDNAResponse, TimelineEventResponse
from ..auth import get_current_user, check_student_isolation
from ..calculation_engine import (
    calculate_student_course_marks,
    simulate_what_if,
    generate_mark_dna,
    round_decimal
)

router = APIRouter(prefix="/api/students/{student_id}", tags=["Student Portal"])


@router.get("/dashboard")
def get_student_dashboard(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_student_isolation(current_user, student_id)

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.student_id == student_id).all()
    
    courses_data = []
    total_internal_accum = 0.0

    for enr in enrollments:
        course = enr.course
        calc = calculate_student_course_marks(course, student, db)
        courses_data.append({
            "course_id": course.id,
            "course_code": course.code,
            "course_name": course.name,
            "semester": course.semester,
            "faculty_name": course.faculty.user.full_name if course.faculty and course.faculty.user else "Faculty",
            "status": course.status,
            "is_locked": course.is_locked,
            "total_internal_mark": calc["total_internal_mark"],
            "max_possible_internal": 100.0,
            "components_count": len(course.components),
            "formula": calc["calculation_formula"]
        })
        total_internal_accum += calc["total_internal_mark"]

    overall_avg = round_decimal(total_internal_accum / len(courses_data), 1) if courses_data else 0.0

    return {
        "student_id": student.id,
        "roll_no": student.roll_no,
        "full_name": student.user.full_name,
        "department": student.department,
        "semester": student.current_semester,
        "overall_internal_average": overall_avg,
        "courses": courses_data
    }


@router.get("/courses/{course_id}/explain", response_model=ExplainMarksResponse)
def explain_student_marks(
    student_id: int,
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_student_isolation(current_user, student_id)

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    result = calculate_student_course_marks(course, student, db)
    return result


@router.post("/courses/{course_id}/what-if", response_model=WhatIfResponse)
def run_what_if_simulation(
    student_id: int,
    course_id: int,
    sim_input: WhatIfRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_student_isolation(current_user, student_id)

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    inputs_dict = {item.component_id: item.simulated_marks for item in sim_input.simulated_components}
    result = simulate_what_if(course, student, inputs_dict, db)
    return result


@router.get("/courses/{course_id}/dna", response_model=MarkDNAResponse)
def get_student_mark_dna(
    student_id: int,
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_student_isolation(current_user, student_id)

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    result = generate_mark_dna(course, student, db)
    return result


@router.get("/courses/{course_id}/timeline", response_model=List[TimelineEventResponse])
def get_student_timeline(
    student_id: int,
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_student_isolation(current_user, student_id)

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    events = []

    # 1. Course Enrollment / Setup event
    events.append({
        "id": f"enroll-{course.id}",
        "timestamp": course.created_at,
        "formatted_date": course.created_at.strftime("%d %b %Y, %I:%M %p"),
        "title": f"Course Enrolled: {course.name}",
        "description": f"Enrolled into {course.code} with {len(course.components)} assessment components defined.",
        "actor": "Academic Administration",
        "category": "SETUP",
        "delta": None
    })

    # 2. Mark Versions (Initial entry + modifications)
    comp_ids = [c.id for c in course.components]
    versions = db.query(MarkVersion).filter(
        MarkVersion.student_id == student_id,
        MarkVersion.component_id.in_(comp_ids)
    ).order_by(MarkVersion.created_at.asc()).all()

    for v in versions:
        if v.version_number == 1:
            events.append({
                "id": f"ver-{v.id}",
                "timestamp": v.created_at,
                "formatted_date": v.created_at.strftime("%d %b %Y, %I:%M %p"),
                "title": f"{v.component.name} Score Uploaded",
                "description": f"Initial mark recorded: {v.marks_obtained}/{v.component.max_marks} via {v.source.replace('_', ' ').title()}.",
                "actor": v.changed_by.full_name if v.changed_by else "Faculty",
                "category": "UPLOAD",
                "delta": f"+{v.marks_obtained}"
            })
        else:
            diff = round_decimal(v.marks_obtained - (v.previous_marks or 0.0), 1)
            sign = "+" if diff > 0 else ""
            events.append({
                "id": f"ver-{v.id}",
                "timestamp": v.created_at,
                "formatted_date": v.created_at.strftime("%d %b %Y, %I:%M %p"),
                "title": f"{v.component.name} Score Corrected (v{v.version_number})",
                "description": f"Adjustment from {v.previous_marks} → {v.marks_obtained}. Reason: {v.reason}.",
                "actor": v.changed_by.full_name if v.changed_by else "Faculty",
                "category": "EDIT",
                "delta": f"{sign}{diff}"
            })

    # 3. Review Requests for this student
    reviews = db.query(ReviewRequest).filter(
        ReviewRequest.student_id == student_id,
        ReviewRequest.course_id == course_id
    ).all()

    for r in reviews:
        events.append({
            "id": f"rev-{r.id}",
            "timestamp": r.created_at,
            "formatted_date": r.created_at.strftime("%d %b %Y, %I:%M %p"),
            "title": f"Review Ticket {r.ticket_no} Submitted",
            "description": f"Review requested for {r.component.name}: '{r.student_reason}'",
            "actor": "Student",
            "category": "DISPUTE",
            "delta": None
        })

    # 4. Locking event if locked
    if course.is_locked and course.locked_at:
        events.append({
            "id": f"lock-{course.id}",
            "timestamp": course.locked_at,
            "formatted_date": course.locked_at.strftime("%d %b %Y, %I:%M %p"),
            "title": "Internal Marks Finalized & Locked",
            "description": "Official marksheet locked by Faculty/HOD. Further modifications require administrative unlock approval.",
            "actor": course.locked_by.full_name if course.locked_by else "Department HOD",
            "category": "LOCK",
            "delta": None
        })

    # Sort chronological
    events.sort(key=lambda e: e["timestamp"])
    return events
