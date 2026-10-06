import random
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ReviewRequest, Course, AssessmentComponent, Mark, MarkVersion, Student, User, AuditLog
from ..schemas import ReviewRequestCreate, ReviewRequestResolve, ReviewRequestResponse
from ..auth import get_current_user, require_roles

router = APIRouter(prefix="/api/disputes", tags=["Review Requests & Disputes"])


@router.post("", response_model=ReviewRequestResponse)
def create_review_request(
    req: ReviewRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can submit a marks review request.")

    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found.")

    comp = db.query(AssessmentComponent).filter(
        AssessmentComponent.id == req.component_id,
        AssessmentComponent.course_id == req.course_id
    ).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Assessment component not found.")

    mark = db.query(Mark).filter(
        Mark.component_id == req.component_id,
        Mark.student_id == student.id,
        Mark.subtest_name == req.subtest_name,
        Mark.status == "ACTIVE"
    ).first()

    current_score = mark.marks_obtained if mark else 0.0

    # Generate unique ticket number like MR-1028
    ticket_num = random.randint(1020, 9999)
    ticket_no = f"MR-{ticket_num}"

    review = ReviewRequest(
        ticket_no=ticket_no,
        course_id=req.course_id,
        student_id=student.id,
        component_id=req.component_id,
        subtest_name=req.subtest_name,
        current_mark=current_score,
        student_reason=req.reason.strip(),
        status="SUBMITTED"
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return {
        "id": review.id,
        "ticket_no": review.ticket_no,
        "course_id": review.course_id,
        "course_code": review.course.code,
        "course_name": review.course.name,
        "student_id": review.student_id,
        "student_roll_no": student.roll_no,
        "student_name": current_user.full_name,
        "component_id": review.component_id,
        "component_name": comp.name,
        "subtest_name": review.subtest_name,
        "current_mark": review.current_mark,
        "student_reason": review.student_reason,
        "status": review.status,
        "faculty_response": review.faculty_response,
        "resolved_mark": review.resolved_mark,
        "created_at": review.created_at,
        "updated_at": review.updated_at
    }


@router.get("", response_model=List[ReviewRequestResponse])
def list_review_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "STUDENT":
        if not current_user.student_profile:
            return []
        reviews = db.query(ReviewRequest).filter(ReviewRequest.student_id == current_user.student_profile.id).all()
    elif current_user.role == "FACULTY":
        if current_user.faculty_profile:
            course_ids = [c.id for c in current_user.faculty_profile.courses]
            reviews = db.query(ReviewRequest).filter(ReviewRequest.course_id.in_(course_ids)).all() if course_ids else []
        else:
            reviews = db.query(ReviewRequest).all()
    else:  # HOD
        reviews = db.query(ReviewRequest).all()

    res = []
    for r in sorted(reviews, key=lambda x: x.created_at, reverse=True):
        res.append({
            "id": r.id,
            "ticket_no": r.ticket_no,
            "course_id": r.course_id,
            "course_code": r.course.code,
            "course_name": r.course.name,
            "student_id": r.student_id,
            "student_roll_no": r.student.roll_no,
            "student_name": r.student.user.full_name,
            "component_id": r.component_id,
            "component_name": r.component.name,
            "subtest_name": r.subtest_name,
            "current_mark": r.current_mark,
            "student_reason": r.student_reason,
            "status": r.status,
            "faculty_response": r.faculty_response,
            "resolved_mark": r.resolved_mark,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })
    return res


@router.put("/{ticket_no}/resolve")
def resolve_review_request(
    ticket_no: str,
    body: ReviewRequestResolve,
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    review = db.query(ReviewRequest).filter(ReviewRequest.ticket_no == ticket_no).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review request ticket not found.")

    review.status = body.status
    review.faculty_response = body.faculty_response
    review.updated_at = datetime.utcnow()

    # If faculty adjusted marks as part of resolution
    if body.resolved_mark is not None and body.status == "RESOLVED":
        review.resolved_mark = body.resolved_mark
        mark = db.query(Mark).filter(
            Mark.component_id == review.component_id,
            Mark.student_id == review.student_id,
            Mark.subtest_name == review.subtest_name,
            Mark.status == "ACTIVE"
        ).first()

        prev_val = mark.marks_obtained if mark else 0.0

        if mark:
            mark.marks_obtained = body.resolved_mark
            mark.updated_at = datetime.utcnow()
        else:
            mark = Mark(
                component_id=review.component_id,
                student_id=review.student_id,
                subtest_name=review.subtest_name,
                marks_obtained=body.resolved_mark,
                status="ACTIVE"
            )
            db.add(mark)
            db.flush()

        # Add MarkVersion
        v_last = db.query(MarkVersion).filter(
            MarkVersion.component_id == review.component_id,
            MarkVersion.student_id == review.student_id,
            MarkVersion.subtest_name == review.subtest_name
        ).order_by(MarkVersion.version_number.desc()).first()
        v_num = (v_last.version_number + 1) if v_last else 2

        v = MarkVersion(
            mark_id=mark.id,
            component_id=review.component_id,
            student_id=review.student_id,
            subtest_name=review.subtest_name,
            version_number=v_num,
            marks_obtained=body.resolved_mark,
            previous_marks=prev_val,
            changed_by_id=current_user.id,
            reason=f"Review Ticket {review.ticket_no} resolved: {body.faculty_response}",
            source="DISPUTE_RESOLUTION"
        )
        db.add(v)

    audit = AuditLog(
        course_id=review.course_id,
        user_id=current_user.id,
        action="DISPUTE_RESOLVED",
        entity_type="ReviewRequest",
        entity_id=review.ticket_no,
        details_json=f"Ticket {review.ticket_no} updated to {body.status}. Note: {body.faculty_response}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Review ticket {review.ticket_no} updated to {review.status}.", "status": review.status}
