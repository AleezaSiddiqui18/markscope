from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Course, AuditLog, User
from ..schemas import AssessmentHealthResponse, AnomalyResponse
from ..auth import get_current_user, require_roles
from ..anomaly_detector import calculate_assessment_health, scan_course_anomalies

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Health"])


@router.get("/health", response_model=AssessmentHealthResponse)
def get_assessment_health(
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    health = calculate_assessment_health(db)
    return health


@router.get("/anomalies", response_model=List[AnomalyResponse])
def get_anomalies(
    course_id: Optional[int] = Query(None),
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    if course_id:
        courses = db.query(Course).filter(Course.id == course_id).all()
    else:
        courses = db.query(Course).all()

    all_anomalies = []
    fake_id = 1
    for c in courses:
        scanned = scan_course_anomalies(c, db)
        for a in scanned:
            all_anomalies.append({
                "id": fake_id,
                "course_id": a["course_id"],
                "course_code": c.code,
                "student_roll_no": a.get("student_roll_no"),
                "student_name": a.get("student_name"),
                "component_name": a.get("component_name"),
                "rule_type": a["rule_type"],
                "severity": a["severity"],
                "description": a["description"],
                "details": a.get("details"),
                "created_at": c.created_at,
                "is_resolved": False
            })
            fake_id += 1

    return all_anomalies


@router.get("/audit-logs")
def get_audit_trail(
    limit: int = 50,
    current_user: User = Depends(require_roles(["FACULTY", "HOD"])),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details_json,
            "user_name": l.user.full_name if l.user else "System",
            "user_role": l.user.role if l.user else "ADMIN",
            "created_at": l.created_at.isoformat(),
            "formatted_date": l.created_at.strftime("%d %b %Y, %I:%M %p")
        } for l in logs
    ]
