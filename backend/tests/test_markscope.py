import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
import pandas as pd

from app.main import app
from app.database import Base, SessionLocal, engine
from app.models import User, Student, Faculty, Course, AssessmentComponent, Mark, MarkVersion
from app.auth import hash_password, create_access_token
from app.calculation_engine import (
    calculate_component_score,
    calculate_student_course_marks,
    simulate_what_if,
    generate_mark_dna,
    round_decimal
)
from app.smart_merge import detect_columns


from app.seed import seed_database

# Ensure database is seeded for tests
seed_database()

client = TestClient(app)



def test_round_decimal_accuracy():
    """Verify precise decimal rounding without floating point drift."""
    assert round_decimal(33.60000000000001, 2) == 33.6
    assert round_decimal(87.59999999999999, 2) == 87.6


def test_weighted_calculation_engine():
    """
    Test exact prompt requirement:
    Tests: 42/50 * 40 = 33.6
    Assignments: 18/20 * 20 = 18.0
    Lab: 27/30 * 40 = 36.0
    Final Internal = 33.6 + 18.0 + 36.0 = 87.6 / 100
    """
    comp_test = AssessmentComponent(id=1, name="Tests", max_marks=50.0, weightage=40.0, is_best_of_n=False)
    m_test = [Mark(marks_obtained=42.0, subtest_name="Test 1")]
    res_test = calculate_component_score(comp_test, m_test)
    assert res_test["percentage"] == 84.0
    assert res_test["weighted_contribution"] == 33.6

    comp_assign = AssessmentComponent(id=2, name="Assignments", max_marks=20.0, weightage=20.0, is_best_of_n=False)
    m_assign = [Mark(marks_obtained=18.0, subtest_name="Assignment")]
    res_assign = calculate_component_score(comp_assign, m_assign)
    assert res_assign["percentage"] == 90.0
    assert res_assign["weighted_contribution"] == 18.0

    comp_lab = AssessmentComponent(id=3, name="Lab", max_marks=30.0, weightage=40.0, is_best_of_n=False)
    m_lab = [Mark(marks_obtained=27.0, subtest_name="Lab")]
    res_lab = calculate_component_score(comp_lab, m_lab)
    assert res_lab["percentage"] == 90.0
    assert res_lab["weighted_contribution"] == 36.0

    total_internal = res_test["weighted_contribution"] + res_assign["weighted_contribution"] + res_lab["weighted_contribution"]
    assert round_decimal(total_internal, 2) == 87.6


def test_best_of_n_engine():
    """
    Test Best 2 of 3 rule:
    Scores: 35, 44, 39
    Counted: 44, 39 (average 41.5)
    Excluded: 35
    """
    comp = AssessmentComponent(
        id=1,
        name="Tests",
        max_marks=50.0,
        weightage=40.0,
        is_best_of_n=True,
        best_of_n_count=2,
        total_subtests=3
    )
    marks = [
        Mark(marks_obtained=35.0, subtest_name="Test 1"),
        Mark(marks_obtained=44.0, subtest_name="Test 2"),
        Mark(marks_obtained=39.0, subtest_name="Test 3"),
    ]
    res = calculate_component_score(comp, marks)
    
    # 44 and 39 counted -> average = 41.5
    assert res["obtained_marks"] == 41.5
    assert res["is_best_of_n"] is True
    
    counted = [s for s in res["subtests"] if s["is_counted"]]
    excluded = [s for s in res["subtests"] if not s["is_counted"]]

    assert len(counted) == 2
    assert len(excluded) == 1
    assert excluded[0]["marks_obtained"] == 35.0
    assert "Excluded by Best 2 of 3" in excluded[0]["exclusion_reason"]


def test_smart_merge_column_detection():
    """Test smart column detection with various real-world academic spreadsheet headers."""
    # Variant 1: Roll No & Marks
    df1 = pd.DataFrame([{"Roll No": "A101", "Student Name": "Alice", "Test Score": 45}])
    detected1 = detect_columns(df1)
    assert detected1["student_id_col"] == "Roll No"
    assert detected1["marks_col"] == "Test Score"

    # Variant 2: USN & Obtained
    df2 = pd.DataFrame([{"USN": "1MS21CS001", "Marks Obtained": 38.5}])
    detected2 = detect_columns(df2)
    assert detected2["student_id_col"] == "USN"
    assert detected2["marks_col"] == "Marks Obtained"

    # Variant 3: Enrollment Number & Score
    df3 = pd.DataFrame([{"Enrollment Number": "EN2026101", "Name": "Bob", "Score": 28}])
    detected3 = detect_columns(df3)
    assert detected3["student_id_col"] == "Enrollment Number"
    assert detected3["marks_col"] == "Score"


def test_student_data_isolation():
    """
    Test IDOR protection:
    Student A (ID 1) must be REJECTED with 403 Forbidden if trying to access Student B (ID 2)'s records.
    """
    db = SessionLocal()
    s1 = db.query(Student).filter(Student.roll_no == "A101").first()
    s2 = db.query(Student).filter(Student.roll_no == "A102").first()
    s1_id = s1.id
    s1_uid = s1.user_id
    s1_uname = s1.user.username
    s2_id = s2.id
    db.close()

    token = create_access_token({"sub": s1_uname, "role": "STUDENT", "user_id": s1_uid})
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch courses for student 1 (allowed)
    res_allowed = client.get(f"/api/students/{s1_id}/dashboard", headers=headers)
    assert res_allowed.status_code == 200

    # Attempt to access student 2 (blocked by IDOR guard)
    res_blocked = client.get(f"/api/students/{s2_id}/dashboard", headers=headers)
    assert res_blocked.status_code == 403
    assert "Security Violation" in res_blocked.json()["detail"]



def test_course_locking_restriction():
    """
    Verify that faculty cannot edit marks when a course is locked.
    """
    db = SessionLocal()
    c_locked = db.query(Course).filter(Course.code == "CS101").first()
    comp = c_locked.components[0]
    s = db.query(Student).first()
    db.close()

    token = create_access_token({"sub": "faculty1", "role": "FACULTY", "user_id": 2})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "entries": [
            {
                "student_id": s.id,
                "component_id": comp.id,
                "subtest_name": "Test 1",
                "marks_obtained": 48.0,
                "reason": "Unauthorized post-lock edit"
            }
        ]
    }
    res = client.post(f"/api/courses/{c_locked.id}/marks/entry", json=payload, headers=headers)
    assert res.status_code == 400
    assert "Course is locked" in res.json()["detail"]


def test_course_weightage_100_validation():
    """Verify backend enforces weightages must sum to 100%."""
    token = create_access_token({"sub": "faculty1", "role": "FACULTY", "user_id": 2})
    headers = {"Authorization": f"Bearer {token}"}

    invalid_course = {
        "code": "CS999",
        "name": "Invalid Weightage Course",
        "semester": 6,
        "academic_year": "2026-2027",
        "components": [
            {"name": "Tests", "type": "TEST", "max_marks": 50, "weightage": 50},
            {"name": "Assignments", "type": "ASSIGNMENT", "max_marks": 20, "weightage": 40}  # Sum = 90% != 100%
        ]
    }
    res = client.post("/api/courses", json=invalid_course, headers=headers)
    assert res.status_code == 400
    assert "must equal exactly 100%" in res.json()["detail"]

