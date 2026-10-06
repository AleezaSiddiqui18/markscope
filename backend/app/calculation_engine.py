from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .models import Course, AssessmentComponent, Mark, MarkVersion, Student


def round_decimal(val: float, places: int = 2) -> float:
    """Accurately rounds floating values using standard round half up to prevent float noise."""
    d = Decimal(str(val))
    rounded = d.quantize(Decimal(10) ** -places, rounding=ROUND_HALF_UP)
    return float(rounded)


def calculate_component_score(
    component: AssessmentComponent,
    marks_for_comp: List[Mark]
) -> Dict[str, Any]:
    """
    Calculates a component's weighted contribution, with support for standard components
    and Best-of-N rule.
    """
    if not marks_for_comp:
        return {
            "obtained_marks": 0.0,
            "max_marks": component.max_marks,
            "percentage": 0.0,
            "weightage": component.weightage,
            "weighted_contribution": 0.0,
            "is_best_of_n": component.is_best_of_n,
            "subtests": []
        }

    subtests_info = []

    if component.is_best_of_n and len(marks_for_comp) > 1:
        # Sort marks descending
        sorted_marks = sorted(marks_for_comp, key=lambda m: m.marks_obtained, reverse=True)
        count_to_take = min(component.best_of_n_count, len(sorted_marks))
        
        counted_marks = sorted_marks[:count_to_take]
        excluded_marks = sorted_marks[count_to_take:]

        # Mark excluded status in memory
        for m in counted_marks:
            subtests_info.append({
                "subtest_name": m.subtest_name or "Test",
                "marks_obtained": m.marks_obtained,
                "max_marks": component.max_marks,
                "is_counted": True,
                "exclusion_reason": None
            })
        for m in excluded_marks:
            subtests_info.append({
                "subtest_name": m.subtest_name or "Test",
                "marks_obtained": m.marks_obtained,
                "max_marks": component.max_marks,
                "is_counted": False,
                "exclusion_reason": f"Excluded by Best {component.best_of_n_count} of {len(marks_for_comp)} rule"
            })

        avg_obtained = sum(m.marks_obtained for m in counted_marks) / count_to_take
        obtained_marks = round_decimal(avg_obtained, 2)
    else:
        # Standard single or first mark
        m = marks_for_comp[0]
        obtained_marks = m.marks_obtained
        subtests_info.append({
            "subtest_name": m.subtest_name or component.name,
            "marks_obtained": m.marks_obtained,
            "max_marks": component.max_marks,
            "is_counted": True,
            "exclusion_reason": None
        })

    # Raw percentage
    pct = (obtained_marks / component.max_marks) * 100.0 if component.max_marks > 0 else 0.0
    pct = round_decimal(pct, 2)

    # Weighted contribution: (obtained / max) * weightage
    raw_contribution = (obtained_marks / component.max_marks) * component.weightage if component.max_marks > 0 else 0.0
    weighted_contribution = round_decimal(raw_contribution, 2)

    return {
        "obtained_marks": obtained_marks,
        "max_marks": component.max_marks,
        "percentage": pct,
        "weightage": component.weightage,
        "weighted_contribution": weighted_contribution,
        "is_best_of_n": component.is_best_of_n,
        "subtests": subtests_info
    }


def calculate_student_course_marks(
    course: Course,
    student: Student,
    db: Session
) -> Dict[str, Any]:
    """
    Computes overall internal marks and detailed component breakdown for a student in a course.
    """
    components = sorted(course.components, key=lambda c: c.order_index)
    component_breakdowns = []
    total_internal = 0.0

    # Fetch all marks for this student in this course
    comp_ids = [c.id for c in components]
    all_marks = db.query(Mark).filter(
        Mark.component_id.in_(comp_ids),
        Mark.student_id == student.id,
        Mark.status == "ACTIVE"
    ).all() if comp_ids else []

    marks_by_comp: Dict[int, List[Mark]] = {c.id: [] for c in components}
    for m in all_marks:
        marks_by_comp[m.component_id].append(m)

    for comp in components:
        comp_marks = marks_by_comp.get(comp.id, [])
        comp_result = calculate_component_score(comp, comp_marks)
        
        # Check for recent version updates on this component
        recent_version = db.query(MarkVersion).filter(
            MarkVersion.component_id == comp.id,
            MarkVersion.student_id == student.id
        ).order_by(MarkVersion.version_number.desc()).first()

        delta_note = None
        if recent_version and recent_version.previous_marks is not None:
            diff = round_decimal(recent_version.marks_obtained - recent_version.previous_marks, 1)
            sign = "+" if diff > 0 else ""
            delta_note = f"Score updated: {recent_version.previous_marks} → {recent_version.marks_obtained} ({sign}{diff}) by {recent_version.changed_by.full_name if recent_version.changed_by else 'Faculty'}"

        comp_result.update({
            "component_id": comp.id,
            "component_name": comp.name,
            "component_type": comp.type,
            "delta_note": delta_note
        })
        component_breakdowns.append(comp_result)
        total_internal += comp_result["weighted_contribution"]

    total_internal = round_decimal(total_internal, 2)

    # Build calculation formula string: e.g. "Tests (33.6) + Assignments (18.0) + Lab (36.0) = 87.6 / 100"
    formula_parts = [f"{c['component_name']} ({c['weighted_contribution']:.1f})" for c in component_breakdowns]
    formula = " + ".join(formula_parts) + f" = {total_internal:.1f} / 100" if formula_parts else "No components configured"

    # Fetch audit changes
    versions = db.query(MarkVersion).filter(
        MarkVersion.student_id == student.id,
        MarkVersion.component_id.in_(comp_ids)
    ).order_by(MarkVersion.created_at.desc()).all() if comp_ids else []

    version_changes = []
    for v in versions:
        if v.previous_marks is not None:
            diff = v.marks_obtained - v.previous_marks
            sign = "+" if diff > 0 else ""
            version_changes.append(
                f"Your score changed by {sign}{diff:.1f} because your {v.component.name} ({v.subtest_name}) was updated from {v.previous_marks:.1f} → {v.marks_obtained:.1f} ({v.reason})"
            )

    return {
        "student_id": student.id,
        "student_name": student.user.full_name,
        "roll_no": student.roll_no,
        "course_id": course.id,
        "course_code": course.code,
        "course_name": course.name,
        "total_internal_mark": total_internal,
        "max_possible_internal": 100.0,
        "status": course.status,
        "is_locked": course.is_locked,
        "components": component_breakdowns,
        "version_changes": version_changes,
        "calculation_formula": formula
    }


def simulate_what_if(
    course: Course,
    student: Student,
    simulated_inputs: Dict[int, float],
    db: Session
) -> Dict[str, Any]:
    """
    Simulates hypothetical scores for a student without modifying official records.
    """
    official_data = calculate_student_course_marks(course, student, db)
    current_total = official_data["total_internal_mark"]

    projected_total = 0.0
    component_deltas = []

    for comp in course.components:
        orig_comp = next((c for c in official_data["components"] if c["component_id"] == comp.id), None)
        orig_obtained = orig_comp["obtained_marks"] if orig_comp else 0.0
        orig_contribution = orig_comp["weighted_contribution"] if orig_comp else 0.0

        if comp.id in simulated_inputs:
            sim_obtained = min(max(simulated_inputs[comp.id], 0.0), comp.max_marks)
            sim_pct = (sim_obtained / comp.max_marks) * 100.0 if comp.max_marks > 0 else 0.0
            sim_contribution = round_decimal((sim_obtained / comp.max_marks) * comp.weightage, 2)
            delta = round_decimal(sim_contribution - orig_contribution, 2)
            score_diff = round_decimal(sim_obtained - orig_obtained, 2)
        else:
            sim_obtained = orig_obtained
            sim_contribution = orig_contribution
            delta = 0.0
            score_diff = 0.0

        projected_total += sim_contribution
        component_deltas.append({
            "component_id": comp.id,
            "component_name": comp.name,
            "max_marks": comp.max_marks,
            "weightage": comp.weightage,
            "original_obtained": orig_obtained,
            "simulated_obtained": sim_obtained,
            "score_diff": score_diff,
            "original_contribution": orig_contribution,
            "simulated_contribution": sim_contribution,
            "contribution_delta": delta
        })

    projected_total = round_decimal(projected_total, 2)
    difference = round_decimal(projected_total - current_total, 2)
    pct_change = round_decimal((difference / 100.0) * 100.0, 2)

    return {
        "current_internal": current_total,
        "projected_internal": projected_total,
        "difference": difference,
        "percentage_change": pct_change,
        "component_deltas": component_deltas,
        "disclaimer": "SIMULATION — NOT OFFICIAL"
    }


def generate_mark_dna(
    course: Course,
    student: Student,
    db: Session
) -> Dict[str, Any]:
    """
    Generates a personalized "Mark DNA" profile explaining the composition of the student's mark.
    """
    data = calculate_student_course_marks(course, student, db)
    total_score = data["total_internal_mark"]
    components = data["components"]

    slices = []
    strongest_comp = None
    strongest_pct = -1.0

    largest_comp = None
    largest_points = -1.0

    headroom_comp = None
    max_headroom = -1.0

    for c in components:
        # Share of total achieved internal score
        share_pct = (c["weighted_contribution"] / total_score * 100.0) if total_score > 0 else (100.0 / len(components) if components else 0.0)
        share_pct = round_decimal(share_pct, 1)

        # Efficiency: percentage of max weightage captured
        efficiency = (c["weighted_contribution"] / c["weightage"] * 100.0) if c["weightage"] > 0 else 0.0
        efficiency = round_decimal(efficiency, 1)

        # Headroom: potential points remaining to gain in this component
        headroom = round_decimal(c["weightage"] - c["weighted_contribution"], 1)

        slices.append({
            "name": c["component_name"],
            "share_percentage": share_pct,
            "actual_contribution": c["weighted_contribution"],
            "weightage": c["weightage"],
            "efficiency": efficiency
        })

        if efficiency > strongest_pct:
            strongest_pct = efficiency
            strongest_comp = c["component_name"]

        if c["weighted_contribution"] > largest_points:
            largest_points = c["weighted_contribution"]
            largest_comp = c["component_name"]

        if headroom > max_headroom:
            max_headroom = headroom
            headroom_comp = c["component_name"]

    overall_eff = round_decimal((total_score / 100.0) * 100.0, 1)

    return {
        "student_id": student.id,
        "roll_no": student.roll_no,
        "student_name": student.user.full_name,
        "slices": slices,
        "strongest_component": strongest_comp or "N/A",
        "strongest_points": round_decimal(strongest_pct, 1),
        "largest_contribution_component": largest_comp or "N/A",
        "largest_contribution_points": round_decimal(largest_points, 1),
        "headroom_component": headroom_comp or "N/A",
        "headroom_points": round_decimal(max_headroom, 1),
        "overall_efficiency": overall_eff
    }
