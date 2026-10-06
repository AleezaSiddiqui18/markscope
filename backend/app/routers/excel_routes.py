import io
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
import pandas as pd
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Course, AssessmentComponent, Mark, MarkVersion, MarkConflict, AuditLog, User, Student
from ..schemas import ConflictResolveRequest, ConflictResponse
from ..auth import get_current_user, require_roles
from ..smart_merge import preview_import_file, execute_import

router = APIRouter(prefix="/api/courses/{course_id}/excel", tags=["Excel & Smart Merge"])


@router.post("/preview")
async def preview_upload(
    course_id: int,
    file: UploadFile = File(...),
    component_id: int = Form(...),
    subtest_name: str = Form("Default"),
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.is_locked:
        raise HTTPException(status_code=400, detail="Cannot upload marks: Course is locked.")

    comp = db.query(AssessmentComponent).filter(
        AssessmentComponent.id == component_id,
        AssessmentComponent.course_id == course_id
    ).first()
    if not comp:
        raise HTTPException(status_code=400, detail="Component not found in this course.")

    file_bytes = await file.read()
    preview_res = preview_import_file(
        file_bytes=file_bytes,
        filename=file.filename,
        course=course,
        component=comp,
        subtest_name=subtest_name,
        db=db
    )

    if "error" in preview_res:
        raise HTTPException(status_code=400, detail=preview_res["error"])

    return preview_res


@router.post("/confirm")
def confirm_upload(
    course_id: int,
    body: Dict[str, Any],
    component_id: int,
    subtest_name: str = "Default",
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.is_locked:
        raise HTTPException(status_code=400, detail="Cannot import marks: Course is locked.")

    comp = db.query(AssessmentComponent).filter(
        AssessmentComponent.id == component_id,
        AssessmentComponent.course_id == course_id
    ).first()
    if not comp:
        raise HTTPException(status_code=400, detail="Component not found in this course.")

    result = execute_import(
        preview_data=body,
        course=course,
        component=comp,
        subtest_name=subtest_name,
        user=current_user,
        db=db
    )
    return result


@router.get("/conflicts", response_model=List[ConflictResponse])
def get_conflicts(
    course_id: int,
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    conflicts = db.query(MarkConflict).filter(
        MarkConflict.course_id == course_id,
        MarkConflict.status == "PENDING"
    ).all()

    res = []
    for c in conflicts:
        res.append({
            "id": c.id,
            "course_id": c.course_id,
            "student_id": c.student_id,
            "student_roll_no": c.student.roll_no,
            "student_name": c.student.user.full_name,
            "component_name": c.component.name,
            "subtest_name": c.subtest_name,
            "existing_mark": c.existing_mark,
            "incoming_mark": c.incoming_mark,
            "max_marks": c.component.max_marks,
            "source_file": c.source_file,
            "status": c.status,
            "created_at": c.created_at
        })
    return res


@router.post("/conflicts/resolve")
def resolve_conflict(
    course_id: int,
    req: ConflictResolveRequest,
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    conflict = db.query(MarkConflict).filter(
        MarkConflict.id == req.conflict_id,
        MarkConflict.course_id == course_id
    ).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")

    if conflict.status != "PENDING":
        raise HTTPException(status_code=400, detail="Conflict is already resolved.")

    existing_mark = db.query(Mark).filter(
        Mark.component_id == conflict.component_id,
        Mark.student_id == conflict.student_id,
        Mark.subtest_name == conflict.subtest_name,
        Mark.status == "ACTIVE"
    ).first()

    if req.action.upper() == "OVERWRITE":
        if existing_mark:
            prev = existing_mark.marks_obtained
            existing_mark.marks_obtained = conflict.incoming_mark
            existing_mark.updated_at = datetime.utcnow()

            # Record version
            last_version = db.query(MarkVersion).filter(
                MarkVersion.component_id == conflict.component_id,
                MarkVersion.student_id == conflict.student_id,
                MarkVersion.subtest_name == conflict.subtest_name
            ).order_by(MarkVersion.version_number.desc()).first()

            v_num = (last_version.version_number + 1) if last_version else 2

            new_v = MarkVersion(
                mark_id=existing_mark.id,
                component_id=conflict.component_id,
                student_id=conflict.student_id,
                subtest_name=conflict.subtest_name,
                version_number=v_num,
                marks_obtained=conflict.incoming_mark,
                previous_marks=prev,
                changed_by_id=current_user.id,
                reason=f"Conflict resolved: accepted {conflict.incoming_mark} from {conflict.source_file}. {req.reason}",
                source="CONFLICT_RESOLUTION"
            )
            db.add(new_v)

        conflict.status = "RESOLVED_OVERWRITTEN"
        action_msg = f"Overwrote with incoming mark ({conflict.incoming_mark})."
    else:
        conflict.status = "RESOLVED_KEPT"
        action_msg = f"Kept official mark ({conflict.existing_mark}). Rejected incoming ({conflict.incoming_mark})."

    conflict.resolved_by_id = current_user.id
    conflict.resolved_at = datetime.utcnow()

    audit = AuditLog(
        course_id=course_id,
        user_id=current_user.id,
        action="CONFLICT_RESOLVED",
        entity_type="MarkConflict",
        entity_id=str(conflict.id),
        details_json=f"Student: {conflict.student.roll_no}, Action: {req.action}, Note: {action_msg}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Conflict successfully resolved. {action_msg}", "status": conflict.status}


# Global helper router for downloading sample test files
sample_router = APIRouter(prefix="/api/samples", tags=["Sample Files"])


@sample_router.get("/download/{file_type}")
def download_sample_file(file_type: str, db: Session = Depends(get_db)):
    """Provides pre-formatted test Excel files for easy evaluation."""
    students = db.query(Student).all()
    
    if file_type == "test_master":
        data = [
            {"Roll No": s.roll_no, "Student Name": s.user.full_name, "Test Score": 42.0 if s.roll_no == "A101" else (40.0 if s.roll_no == "A102" else 36.0)}
            for s in students
        ]
        filename = "DataStructures_Test1_Master.xlsx"
    elif file_type == "conflict_sample":
        # Contains a conflicting mark for A102 (e.g. 45 instead of 40)
        data = [
            {"Student ID": "A101", "Name": "Aarav Sharma", "Marks": 42.0},
            {"Student ID": "A102", "Name": "Ananya Iyer", "Marks": 46.5},  # Conflicting mark!
            {"Student ID": "A103", "Name": "Rohan Verma", "Marks": 38.0},
        ]
        filename = "Test1_Rechecked_Conflict_Demo.xlsx"
    elif file_type == "assignments":
        data = [
            {"Enrollment Number": s.roll_no, "Candidate Name": s.user.full_name, "Assignment Score": 18.0 if s.roll_no != "A105" else None}
            for s in students
        ]
        filename = "DataStructures_Assignments.xlsx"
    elif file_type == "lab":
        data = [
            {"Roll Number": s.roll_no, "Name": s.user.full_name, "Lab Marks": 27.0}
            for s in students
        ]
        filename = "DataStructures_Lab_Final.xlsx"
    else:
        data = [{"Roll No": "A101", "Marks": 45}]
        filename = "Sample_Marks.xlsx"

    df = pd.DataFrame(data)
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Marks")
    stream.seek(0)

    response = StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response
