from collections import Counter
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from .models import Course, AssessmentComponent, Mark, MarkVersion, MarkConflict, Anomaly, Student


def scan_course_anomalies(course: Course, db: Session) -> List[Dict[str, Any]]:
    """
    Scans a course for academic assessment quality anomalies using neutral,
    quality-assurance language.
    """
    detected_anomalies = []

    # 1. Component Weightage Sum
    total_weight = sum(c.weightage for c in course.components)
    if abs(total_weight - 100.0) > 0.01:
        detected_anomalies.append({
            "course_id": course.id,
            "rule_type": "WEIGHT_SUM_MISMATCH",
            "severity": "HIGH",
            "student_id": None,
            "component_id": None,
            "description": f"Component weightages total {total_weight:.1f}% instead of exactly 100.0%. Review recommended.",
            "details": {"total_weightage": total_weight, "expected": 100.0}
        })

    enrolled_students = [e.student for e in course.enrollments]
    total_enrolled = len(enrolled_students)

    for comp in course.components:
        comp_marks = db.query(Mark).filter(
            Mark.component_id == comp.id,
            Mark.status == "ACTIVE"
        ).all()

        marked_student_ids = {m.student_id for m in comp_marks}

        # 2. Exceeding Max Marks
        for m in comp_marks:
            if m.marks_obtained > comp.max_marks:
                detected_anomalies.append({
                    "course_id": course.id,
                    "rule_type": "EXCEED_MAX_MARKS",
                    "severity": "HIGH",
                    "student_id": m.student_id,
                    "student_roll_no": m.student.roll_no,
                    "student_name": m.student.user.full_name,
                    "component_id": comp.id,
                    "component_name": comp.name,
                    "description": f"Score of {m.marks_obtained} exceeds maximum allowable {comp.max_marks} for {comp.name} ({m.subtest_name}).",
                    "details": {"obtained": m.marks_obtained, "max": comp.max_marks}
                })

        # 3. Missing Marks for Enrolled Students
        if course.status in ["MARKS_ENTERED", "VALIDATED", "SUBMITTED", "LOCKED"]:
            for student in enrolled_students:
                if student.id not in marked_student_ids:
                    detected_anomalies.append({
                        "course_id": course.id,
                        "rule_type": "MISSING_MARK",
                        "severity": "MEDIUM",
                        "student_id": student.id,
                        "student_roll_no": student.roll_no,
                        "student_name": student.user.full_name,
                        "component_id": comp.id,
                        "component_name": comp.name,
                        "description": f"No record entered for student {student.roll_no} in component '{comp.name}'. Potential data inconsistency.",
                        "details": {"component": comp.name, "roll_no": student.roll_no}
                    })

        # 4. Unusual Identical Mark Cluster (e.g. > 60% of students have identical score)
        if len(comp_marks) >= 5:
            scores = [m.marks_obtained for m in comp_marks]
            counts = Counter(scores)
            most_common_score, freq = counts.most_common(1)[0]
            cluster_ratio = freq / len(comp_marks)
            if cluster_ratio >= 0.60:
                detected_anomalies.append({
                    "course_id": course.id,
                    "rule_type": "IDENTICAL_SCORE_CLUSTER",
                    "severity": "LOW",
                    "student_id": None,
                    "component_id": comp.id,
                    "component_name": comp.name,
                    "description": f"Unusual pattern detected: {freq} of {len(comp_marks)} students ({cluster_ratio*100:.0f}%) received the exact same score ({most_common_score}/{comp.max_marks}) in {comp.name}.",
                    "details": {"score": most_common_score, "count": freq, "total": len(comp_marks)}
                })

    # 5. Sudden Large Modifications (> 20% swing between versions)
    comp_ids = [c.id for c in course.components]
    versions = db.query(MarkVersion).filter(
        MarkVersion.component_id.in_(comp_ids)
    ).all() if comp_ids else []

    for v in versions:
        if v.previous_marks is not None:
            comp = next((c for c in course.components if c.id == v.component_id), None)
            if comp and comp.max_marks > 0:
                delta = abs(v.marks_obtained - v.previous_marks)
                pct_shift = (delta / comp.max_marks) * 100.0
                if pct_shift >= 20.0:
                    detected_anomalies.append({
                        "course_id": course.id,
                        "rule_type": "SUDDEN_LARGE_CHANGE",
                        "severity": "MEDIUM",
                        "student_id": v.student_id,
                        "student_roll_no": v.student.roll_no,
                        "student_name": v.student.user.full_name,
                        "component_id": v.component_id,
                        "component_name": comp.name,
                        "description": f"Significant mark adjustment detected: {v.previous_marks} → {v.marks_obtained} (shift of {delta:.1f} pts, {pct_shift:.0f}% of max) by {v.changed_by.full_name}.",
                        "details": {"prev": v.previous_marks, "new": v.marks_obtained, "reason": v.reason}
                    })

    # 6. Unresolved File Conflicts
    pending_conflicts = db.query(MarkConflict).filter(
        MarkConflict.course_id == course.id,
        MarkConflict.status == "PENDING"
    ).all()

    for conf in pending_conflicts:
        detected_anomalies.append({
            "course_id": course.id,
            "rule_type": "UNRESOLVED_CONFLICT",
            "severity": "HIGH",
            "student_id": conf.student_id,
            "student_roll_no": conf.student.roll_no,
            "student_name": conf.student.user.full_name,
            "component_id": conf.component_id,
            "component_name": conf.component.name,
            "description": f"Unresolved spreadsheet conflict for {conf.student.roll_no}: existing mark is {conf.existing_mark}, uploaded mark from '{conf.source_file}' is {conf.incoming_mark}.",
            "details": {"existing": conf.existing_mark, "incoming": conf.incoming_mark, "source": conf.source_file}
        })

    return detected_anomalies


def calculate_assessment_health(db: Session) -> Dict[str, Any]:
    """
    Calculates overall Assessment Health metrics for HOD / Faculty dashboard.
    """
    courses = db.query(Course).all()
    total_courses = len(courses)
    total_students = db.query(Student).count()

    if total_courses == 0:
        return {
            "data_completeness_pct": 100.0,
            "calculation_integrity_pct": 100.0,
            "unresolved_conflicts": 0,
            "missing_marks_count": 0,
            "locked_records_pct": 100.0,
            "pending_reviews_count": 0,
            "total_courses": 0,
            "total_students": total_students,
            "active_anomalies_count": 0
        }

    locked_courses = [c for c in courses if c.is_locked]
    locked_pct = (len(locked_courses) / total_courses) * 100.0

    all_anomalies = []
    for c in courses:
        all_anomalies.extend(scan_course_anomalies(c, db))

    missing_marks = [a for a in all_anomalies if a["rule_type"] == "MISSING_MARK"]
    conflicts = [a for a in all_anomalies if a["rule_type"] == "UNRESOLVED_CONFLICT"]
    critical = [a for a in all_anomalies if a["severity"] == "HIGH"]

    # Calculation integrity: 100% minus high severity anomalies impact
    integrity = max(0.0, 100.0 - (len(critical) * 5.0))
    # Data completeness: percentage of expected student-component marks present
    completeness = max(0.0, 100.0 - (len(missing_marks) * 2.0))

    from .models import ReviewRequest
    pending_reviews = db.query(ReviewRequest).filter(ReviewRequest.status != "RESOLVED").count()

    return {
        "data_completeness_pct": round(completeness, 1),
        "calculation_integrity_pct": round(integrity, 1),
        "unresolved_conflicts": len(conflicts),
        "missing_marks_count": len(missing_marks),
        "locked_records_pct": round(locked_pct, 1),
        "pending_reviews_count": pending_reviews,
        "total_courses": total_courses,
        "total_students": total_students,
        "active_anomalies_count": len(all_anomalies)
    }
