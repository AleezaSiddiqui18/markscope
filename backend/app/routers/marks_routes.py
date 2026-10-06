import io
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
import pandas as pd
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Course, AssessmentComponent, Mark, MarkVersion, Student, CourseEnrollment, User, AuditLog
from ..schemas import MarkBatchEntry, ConsolidatedMarksheetResponse, ConsolidatedStudentRow, MarkVersionResponse
from ..auth import get_current_user, require_roles
from ..calculation_engine import calculate_student_course_marks, round_decimal

router = APIRouter(prefix="/api/courses/{course_id}", tags=["Marks"])


@router.get("/consolidated", response_model=ConsolidatedMarksheetResponse)
def get_consolidated_marksheet(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id).all()
    components = sorted(course.components, key=lambda x: x.order_index)

    rows = []
    final_scores = []

    for enr in enrollments:
        student = enr.student
        calc_result = calculate_student_course_marks(course, student, db)
        
        comp_dict = {}
        for c in calc_result["components"]:
            comp_dict[c["component_name"]] = {
                "obtained": c["obtained_marks"],
                "max": c["max_marks"],
                "percentage": c["percentage"],
                "weightage": c["weightage"],
                "weighted": c["weighted_contribution"],
                "is_best_of_n": c["is_best_of_n"],
                "subtests": c["subtests"],
                "delta_note": c["delta_note"]
            }

        final_internal = calc_result["total_internal_mark"]
        final_scores.append(final_internal)

        rows.append(ConsolidatedStudentRow(
            student_id=student.id,
            roll_no=student.roll_no,
            student_name=student.user.full_name,
            component_marks=comp_dict,
            final_internal_mark=final_internal,
            status=course.status,
            anomalies_count=0
        ))

    # Sort rows by Roll No
    rows.sort(key=lambda r: r.roll_no)

    class_avg = round_decimal(sum(final_scores) / len(final_scores), 1) if final_scores else 0.0
    highest = max(final_scores) if final_scores else 0.0
    lowest = min(final_scores) if final_scores else 0.0

    return {
        "course_id": course.id,
        "course_code": course.code,
        "course_name": course.name,
        "status": course.status,
        "is_locked": course.is_locked,
        "total_students": len(rows),
        "components": [
            {
                "id": c.id,
                "course_id": c.course_id,
                "name": c.name,
                "type": c.type,
                "max_marks": c.max_marks,
                "weightage": c.weightage,
                "order_index": c.order_index,
                "is_best_of_n": c.is_best_of_n,
                "best_of_n_count": c.best_of_n_count,
                "total_subtests": c.total_subtests
            } for c in components
        ],
        "rows": rows,
        "class_average": class_avg,
        "highest_score": highest,
        "lowest_score": lowest
    }


@router.post("/marks/entry")
def save_mark_entry(
    course_id: int,
    batch: MarkBatchEntry,
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.is_locked:
        raise HTTPException(
            status_code=400,
            detail="Course is locked. Marks cannot be edited while in locked state."
        )

    updated_count = 0
    created_count = 0

    for entry in batch.entries:
        comp = db.query(AssessmentComponent).filter(
            AssessmentComponent.id == entry.component_id,
            AssessmentComponent.course_id == course_id
        ).first()

        if not comp:
            raise HTTPException(status_code=400, detail=f"Component {entry.component_id} not found in this course.")

        if entry.marks_obtained < 0:
            raise HTTPException(status_code=400, detail="Marks cannot be negative.")

        if entry.marks_obtained > comp.max_marks:
            raise HTTPException(
                status_code=400,
                detail=f"Mark {entry.marks_obtained} exceeds maximum allowable {comp.max_marks} for {comp.name}."
            )

        existing_mark = db.query(Mark).filter(
            Mark.component_id == entry.component_id,
            Mark.student_id == entry.student_id,
            Mark.subtest_name == entry.subtest_name,
            Mark.status == "ACTIVE"
        ).first()

        prev_val = None
        new_version_num = 1

        if existing_mark:
            prev_val = existing_mark.marks_obtained
            existing_mark.marks_obtained = entry.marks_obtained
            existing_mark.updated_at = datetime.utcnow()
            
            # Fetch latest version number
            last_version = db.query(MarkVersion).filter(
                MarkVersion.component_id == entry.component_id,
                MarkVersion.student_id == entry.student_id,
                MarkVersion.subtest_name == entry.subtest_name
            ).order_by(MarkVersion.version_number.desc()).first()
            
            if last_version:
                new_version_num = last_version.version_number + 1

            updated_count += 1
            mark_id = existing_mark.id
        else:
            new_mark = Mark(
                component_id=entry.component_id,
                student_id=entry.student_id,
                subtest_name=entry.subtest_name,
                marks_obtained=entry.marks_obtained,
                status="ACTIVE"
            )
            db.add(new_mark)
            db.flush()
            mark_id = new_mark.id
            created_count += 1

        # Record version
        version = MarkVersion(
            mark_id=mark_id,
            component_id=entry.component_id,
            student_id=entry.student_id,
            subtest_name=entry.subtest_name,
            version_number=new_version_num,
            marks_obtained=entry.marks_obtained,
            previous_marks=prev_val,
            changed_by_id=current_user.id,
            reason=entry.reason or "Manual faculty entry",
            source="MANUAL"
        )
        db.add(version)

    if course.status == "DRAFT":
        course.status = "MARKS_ENTERED"

    db.commit()

    return {
        "message": f"Successfully saved marks: {created_count} new entries, {updated_count} updated entries.",
        "created_count": created_count,
        "updated_count": updated_count
    }


@router.get("/marks/history")
def get_course_mark_history(
    course_id: int,
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    comp_ids = [c.id for c in course.components]
    versions = db.query(MarkVersion).filter(
        MarkVersion.component_id.in_(comp_ids)
    ).order_by(MarkVersion.created_at.desc()).all() if comp_ids else []

    res = []
    for v in versions:
        res.append({
            "id": v.id,
            "roll_no": v.student.roll_no,
            "student_name": v.student.user.full_name,
            "component_name": v.component.name,
            "subtest_name": v.subtest_name,
            "version_number": v.version_number,
            "marks_obtained": v.marks_obtained,
            "previous_marks": v.previous_marks,
            "changed_by": v.changed_by.full_name if v.changed_by else "System",
            "reason": v.reason,
            "source": v.source,
            "created_at": v.created_at.isoformat(),
            "formatted_date": v.created_at.strftime("%d %b %Y, %I:%M %p")
        })
    return res


@router.get("/export/csv")
def export_marks_csv(
    course_id: int,
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id).all()
    components = sorted(course.components, key=lambda x: x.order_index)

    rows = []
    for enr in enrollments:
        student = enr.student
        calc_result = calculate_student_course_marks(course, student, db)
        
        row_dict = {
            "Student ID": student.roll_no,
            "Student Name": student.user.full_name
        }
        for c in calc_result["components"]:
            row_dict[f"{c['component_name']} (Raw/{c['max_marks']})"] = c["obtained_marks"]
            row_dict[f"{c['component_name']} (Weighted/{c['weightage']}%)"] = c["weighted_contribution"]

        row_dict["Final Internal Mark (/100)"] = calc_result["total_internal_mark"]
        rows.append(row_dict)

    df = pd.DataFrame(rows)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = f"attachment; filename=consolidated_{course.code}.csv"
    return response


@router.get("/export/excel")
def export_marks_excel(
    course_id: int,
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id).all()
    components = sorted(course.components, key=lambda x: x.order_index)

    rows = []
    for enr in enrollments:
        student = enr.student
        calc_result = calculate_student_course_marks(course, student, db)
        
        row_dict = {
            "Student ID": student.roll_no,
            "Student Name": student.user.full_name
        }
        for c in calc_result["components"]:
            row_dict[f"{c['component_name']} (Score)"] = f"{c['obtained_marks']}/{c['max_marks']}"
            row_dict[f"{c['component_name']} (Weighted)"] = c["weighted_contribution"]

        row_dict["Final Internal Total"] = calc_result["total_internal_mark"]
        rows.append(row_dict)

    df = pd.DataFrame(rows)
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Consolidated Marks")
    
    stream.seek(0)
    response = StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response.headers["Content-Disposition"] = f"attachment; filename=consolidated_{course.code}.xlsx"
    return response
