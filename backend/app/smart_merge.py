import io
import re
from typing import Dict, Any, List, Optional
import pandas as pd
from sqlalchemy.orm import Session
from .models import Course, AssessmentComponent, Student, Mark, MarkVersion, MarkConflict, AuditLog, User


STUDENT_ID_SYNONYMS = [
    "roll no", "rollno", "roll_no", "student id", "studentid", "student_id",
    "usn", "enrollment number", "enrollment_no", "reg no", "reg_no", "id", "roll"
]

STUDENT_NAME_SYNONYMS = [
    "student name", "student_name", "name", "candidate name", "full name"
]

MARKS_SYNONYMS = [
    "marks", "marks obtained", "score", "obtained", "total", "test score",
    "assignment score", "lab marks", "mark", "internal", "points"
]


def normalize_col(col: str) -> str:
    return re.sub(r'[^a-z0-9]', '', str(col).strip().lower())


def detect_columns(df: pd.DataFrame) -> Dict[str, Optional[str]]:
    """Intelligently detects column mappings from flexible Excel/CSV headers."""
    detected = {
        "student_id_col": None,
        "name_col": None,
        "marks_col": None
    }

    cols = list(df.columns)
    
    # 1. Student ID
    for col in cols:
        norm = normalize_col(col)
        for syn in STUDENT_ID_SYNONYMS:
            if normalize_col(syn) == norm or normalize_col(syn) in norm:
                detected["student_id_col"] = str(col)
                break
        if detected["student_id_col"]:
            break

    # 2. Student Name
    for col in cols:
        norm = normalize_col(col)
        for syn in STUDENT_NAME_SYNONYMS:
            if normalize_col(syn) == norm or normalize_col(syn) in norm:
                detected["name_col"] = str(col)
                break
        if detected["name_col"]:
            break

    # 3. Marks
    for col in cols:
        if col == detected["student_id_col"] or col == detected["name_col"]:
            continue
        norm = normalize_col(col)
        for syn in MARKS_SYNONYMS:
            if normalize_col(syn) == norm or normalize_col(syn) in norm:
                detected["marks_col"] = str(col)
                break
        if detected["marks_col"]:
            break

    # Fallback for marks if not found: first numeric column that isn't student_id
    if not detected["marks_col"]:
        for col in cols:
            if col != detected["student_id_col"] and col != detected["name_col"]:
                if pd.api.types.is_numeric_dtype(df[col]):
                    detected["marks_col"] = str(col)
                    break

    return detected


def preview_import_file(
    file_bytes: bytes,
    filename: str,
    course: Course,
    component: AssessmentComponent,
    subtest_name: str,
    db: Session
) -> Dict[str, Any]:
    """
    Parses spreadsheet, performs column matching, validates records,
    detects conflicts with existing marks, and returns preview stats without committing.
    """
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_bytes))
        else:
            df = pd.read_excel(io.BytesIO(file_bytes))
    except Exception as e:
        return {"error": f"Could not read spreadsheet file: {str(e)}"}

    if df.empty:
        return {"error": "The uploaded spreadsheet is empty."}

    detected_cols = detect_columns(df)
    id_col = detected_cols["student_id_col"]
    marks_col = detected_cols["marks_col"]

    if not id_col:
        return {"error": f"Could not detect Student ID / Roll Number column in headers: {list(df.columns)}"}
    if not marks_col:
        return {"error": f"Could not detect Marks column in headers: {list(df.columns)}"}

    # Fetch enrolled students in course
    enrolled_students = {e.student.roll_no.strip().upper(): e.student for e in course.enrollments}

    # Fetch existing marks for this component and subtest
    existing_marks = {
        m.student.roll_no.strip().upper(): m
        for m in db.query(Mark).filter(
            Mark.component_id == component.id,
            Mark.subtest_name == subtest_name,
            Mark.status == "ACTIVE"
        ).all()
    }

    preview_rows = []
    matched_count = 0
    unmatched_count = 0
    conflict_count = 0
    invalid_count = 0

    seen_ids = set()

    for idx, row in df.iterrows():
        raw_id = row.get(id_col)
        raw_marks = row.get(marks_col)
        raw_name = row.get(detected_cols["name_col"]) if detected_cols["name_col"] else ""

        if pd.isna(raw_id) or str(raw_id).strip() == "":
            continue

        clean_id = str(raw_id).strip().upper()

        # Check duplicate in file
        is_dup = clean_id in seen_ids
        seen_ids.add(clean_id)

        # Parse marks
        parsed_mark = None
        mark_error = None
        try:
            if pd.isna(raw_marks) or str(raw_marks).strip() == "":
                parsed_mark = 0.0
                mark_error = "Mark is missing (set to 0.0)"
            else:
                parsed_mark = float(raw_marks)
                if parsed_mark < 0:
                    mark_error = "Marks cannot be negative"
                elif parsed_mark > component.max_marks:
                    mark_error = f"Marks ({parsed_mark}) exceed maximum ({component.max_marks})"
        except ValueError:
            mark_error = f"Invalid numeric mark value '{raw_marks}'"

        student = enrolled_students.get(clean_id)

        status = "READY"
        existing_mark_val = None

        if mark_error:
            status = "INVALID"
            invalid_count += 1
        elif not student:
            status = "UNMATCHED"
            unmatched_count += 1
        elif is_dup:
            status = "INVALID"
            mark_error = "Duplicate student ID in file"
            invalid_count += 1
        elif clean_id in existing_marks:
            existing_mark_val = existing_marks[clean_id].marks_obtained
            if abs(existing_mark_val - parsed_mark) > 0.001:
                status = "CONFLICT"
                conflict_count += 1
            else:
                status = "IDENTICAL"
                matched_count += 1
        else:
            status = "NEW"
            matched_count += 1

        preview_rows.append({
            "row_index": idx + 2,  # 1-indexed Excel row
            "roll_no": clean_id,
            "name": student.user.full_name if student else (str(raw_name) if not pd.isna(raw_name) else "Unknown"),
            "student_id": student.id if student else None,
            "incoming_mark": parsed_mark,
            "existing_mark": existing_mark_val,
            "max_marks": component.max_marks,
            "status": status,
            "error": mark_error
        })

    return {
        "filename": filename,
        "detected_columns": {
            "student_identifier": id_col,
            "student_name": detected_cols["name_col"],
            "marks": marks_col
        },
        "total_rows": len(preview_rows),
        "matched_count": matched_count,
        "unmatched_count": unmatched_count,
        "conflict_count": conflict_count,
        "invalid_count": invalid_count,
        "rows": preview_rows
    }


def execute_import(
    preview_data: Dict[str, Any],
    course: Course,
    component: AssessmentComponent,
    subtest_name: str,
    user: User,
    db: Session
) -> Dict[str, Any]:
    """
    Applies validated records into database, stores version history,
    flags conflicts for faculty review without blindly overwriting.
    """
    rows = preview_data.get("rows", [])
    imported_count = 0
    conflicts_logged = 0
    errors_count = 0

    for r in rows:
        if r["status"] in ["UNMATCHED", "INVALID"]:
            errors_count += 1
            continue

        student_id = r["student_id"]
        incoming_mark = r["incoming_mark"]

        # Check existing mark
        existing_mark = db.query(Mark).filter(
            Mark.component_id == component.id,
            Mark.student_id == student_id,
            Mark.subtest_name == subtest_name,
            Mark.status == "ACTIVE"
        ).first()

        if r["status"] == "CONFLICT":
            # Record conflict in mark_conflicts table for review
            conflict = MarkConflict(
                course_id=course.id,
                component_id=component.id,
                student_id=student_id,
                subtest_name=subtest_name,
                existing_mark=existing_mark.marks_obtained if existing_mark else 0.0,
                incoming_mark=incoming_mark,
                source_file=preview_data.get("filename", "upload.xlsx"),
                status="PENDING"
            )
            db.add(conflict)
            conflicts_logged += 1
        elif r["status"] in ["NEW", "IDENTICAL"]:
            if not existing_mark:
                new_mark = Mark(
                    component_id=component.id,
                    student_id=student_id,
                    subtest_name=subtest_name,
                    marks_obtained=incoming_mark,
                    status="ACTIVE"
                )
                db.add(new_mark)
                db.flush()

                # Add version 1
                v1 = MarkVersion(
                    mark_id=new_mark.id,
                    component_id=component.id,
                    student_id=student_id,
                    subtest_name=subtest_name,
                    version_number=1,
                    marks_obtained=incoming_mark,
                    previous_marks=None,
                    changed_by_id=user.id,
                    reason=f"Initial import from {preview_data.get('filename', 'upload')}",
                    source="EXCEL_IMPORT"
                )
                db.add(v1)
                imported_count += 1

    # Update course status if in DRAFT
    if course.status == "DRAFT":
        course.status = "MARKS_ENTERED"

    # Add audit log
    audit = AuditLog(
        course_id=course.id,
        user_id=user.id,
        action="EXCEL_MARKS_IMPORTED",
        entity_type="Course",
        entity_id=str(course.id),
        details_json=f"File: {preview_data.get('filename')}, Component: {component.name} ({subtest_name}), Imported: {imported_count}, Conflicts: {conflicts_logged}"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"{imported_count} records imported successfully. {conflicts_logged} conflicts held for review. {errors_count} records require correction.",
        "imported_count": imported_count,
        "conflicts_count": conflicts_logged,
        "errors_count": errors_count
    }
