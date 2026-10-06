from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from .database import engine, Base, SessionLocal
from .models import (
    User, Student, Faculty, Course, CourseEnrollment,
    AssessmentComponent, Mark, MarkVersion, MarkConflict,
    ReviewRequest, AuditLog
)
from .auth import hash_password


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already contains data. Skipping initial seeding.")
            return

        print("Seeding MarkScope academic database with realistic demonstration scenarios...")

        # 1. HOD User
        hod_user = User(
            username="hod",
            email="hod@college.edu",
            full_name="Dr. Arvind Sharma",
            hashed_password=hash_password("hod123"),
            role="HOD",
            department="Computer Science & Engineering"
        )
        db.add(hod_user)

        # 2. Faculty Users
        fac1_user = User(
            username="faculty1",
            email="faculty1@college.edu",
            full_name="Prof. Rajesh Kumar",
            hashed_password=hash_password("faculty123"),
            role="FACULTY",
            department="Computer Science & Engineering"
        )
        db.add(fac1_user)
        db.flush()

        fac1 = Faculty(
            user_id=fac1_user.id,
            faculty_code="FAC-CS-01",
            designation="Associate Professor",
            department="Computer Science & Engineering"
        )
        db.add(fac1)

        fac2_user = User(
            username="faculty2",
            email="faculty2@college.edu",
            full_name="Prof. Sneha Patel",
            hashed_password=hash_password("faculty123"),
            role="FACULTY",
            department="Computer Science & Engineering"
        )
        db.add(fac2_user)
        db.flush()

        fac2 = Faculty(
            user_id=fac2_user.id,
            faculty_code="FAC-CS-02",
            designation="Assistant Professor",
            department="Computer Science & Engineering"
        )
        db.add(fac2)
        db.flush()

        # 3. 10 Students
        student_data = [
            ("student_a101", "aarav@college.edu", "Aarav Sharma", "A101"),
            ("student_a102", "ananya@college.edu", "Ananya Iyer", "A102"),
            ("student_a103", "rohan@college.edu", "Rohan Verma", "A103"),
            ("student_a104", "priya@college.edu", "Priya Nair", "A104"),
            ("student_a105", "vikram@college.edu", "Vikram Rao", "A105"),
            ("student_a106", "neha@college.edu", "Neha Gupta", "A106"),
            ("student_a107", "aditya@college.edu", "Aditya Joshi", "A107"),
            ("student_a108", "kavita@college.edu", "Kavita Singh", "A108"),
            ("student_a109", "rahul@college.edu", "Rahul Das", "A109"),
            ("student_a110", "pooja@college.edu", "Pooja Mehta", "A110"),
        ]

        created_students = []
        for uname, email, fname, roll in student_data:
            s_user = User(
                username=uname,
                email=email,
                full_name=fname,
                hashed_password=hash_password("student123"),
                role="STUDENT",
                department="Computer Science & Engineering"
            )
            db.add(s_user)
            db.flush()

            student = Student(
                user_id=s_user.id,
                roll_no=roll,
                current_semester=5,
                department="Computer Science & Engineering"
            )
            db.add(student)
            db.flush()
            created_students.append(student)

        # 4. Courses
        # Course 1: Data Structures (CS201)
        cs201 = Course(
            code="CS201",
            name="Data Structures & Algorithms",
            semester=5,
            academic_year="2026-2027",
            faculty_id=fac1.id,
            status="MARKS_ENTERED",
            is_locked=False,
            created_at=datetime.utcnow() - timedelta(days=20)
        )
        db.add(cs201)
        db.flush()

        # Enroll all 10 students into CS201
        for s in created_students:
            db.add(CourseEnrollment(course_id=cs201.id, student_id=s.id))

        # CS201 Components: Tests 40%, Assignments 20%, Lab 40% (Total = 100%)
        comp_tests = AssessmentComponent(
            course_id=cs201.id,
            name="Tests",
            type="TEST",
            max_marks=50.0,
            weightage=40.0,
            order_index=0,
            is_best_of_n=True,
            best_of_n_count=2,
            total_subtests=3
        )
        db.add(comp_tests)

        comp_assign = AssessmentComponent(
            course_id=cs201.id,
            name="Assignments",
            type="ASSIGNMENT",
            max_marks=20.0,
            weightage=20.0,
            order_index=1,
            is_best_of_n=False
        )
        db.add(comp_assign)

        comp_lab = AssessmentComponent(
            course_id=cs201.id,
            name="Lab",
            type="LAB",
            max_marks=30.0,
            weightage=40.0,
            order_index=2,
            is_best_of_n=False
        )
        db.add(comp_lab)
        db.flush()

        # Course 2: Programming in C (CS101) - Locked!
        cs101 = Course(
            code="CS101",
            name="Programming in C",
            semester=5,
            academic_year="2026-2027",
            faculty_id=fac2.id,
            status="LOCKED",
            is_locked=True,
            locked_at=datetime.utcnow() - timedelta(hours=2),
            locked_by_id=fac2_user.id,
            created_at=datetime.utcnow() - timedelta(days=30)
        )
        db.add(cs101)
        db.flush()

        for s in created_students:
            db.add(CourseEnrollment(course_id=cs101.id, student_id=s.id))

        c101_comp1 = AssessmentComponent(course_id=cs101.id, name="Tests", type="TEST", max_marks=50.0, weightage=50.0, order_index=0)
        c101_comp2 = AssessmentComponent(course_id=cs101.id, name="Assignments", type="ASSIGNMENT", max_marks=20.0, weightage=20.0, order_index=1)
        c101_comp3 = AssessmentComponent(course_id=cs101.id, name="Lab", type="LAB", max_marks=30.0, weightage=30.0, order_index=2)
        db.add_all([c101_comp1, c101_comp2, c101_comp3])
        db.flush()

        # Seed CS101 Marks
        for s in created_students:
            m1 = Mark(component_id=c101_comp1.id, student_id=s.id, marks_obtained=42.0, status="ACTIVE")
            m2 = Mark(component_id=c101_comp2.id, student_id=s.id, marks_obtained=17.5, status="ACTIVE")
            m3 = Mark(component_id=c101_comp3.id, student_id=s.id, marks_obtained=26.0, status="ACTIVE")
            db.add_all([m1, m2, m3])

        # Course 3: Mathematics-I (MA101) - Draft
        ma101 = Course(
            code="MA101",
            name="Discrete Mathematics & Graph Theory",
            semester=5,
            academic_year="2026-2027",
            faculty_id=fac1.id,
            status="DRAFT",
            is_locked=False,
            created_at=datetime.utcnow() - timedelta(days=5)
        )
        db.add(ma101)
        db.flush()

        for s in created_students[:5]:
            db.add(CourseEnrollment(course_id=ma101.id, student_id=s.id))

        ma_comp1 = AssessmentComponent(course_id=ma101.id, name="Midterm", type="TEST", max_marks=50.0, weightage=60.0, order_index=0)
        ma_comp2 = AssessmentComponent(course_id=ma101.id, name="Problem Sets", type="ASSIGNMENT", max_marks=25.0, weightage=40.0, order_index=1)
        db.add_all([ma_comp1, ma_comp2])
        db.flush()

        # 5. Populate Realistic Marks for CS201
        # Aarav Sharma (A101) -> Exact prompt values: 42/50 Tests (33.6), 18/20 Assignments (18), 27/30 Lab (36) -> 87.6/100!
        aarav = created_students[0]
        
        # Test 1 for Aarav (has version 1: 37 -> version 2: 42)
        m_t1 = Mark(component_id=comp_tests.id, student_id=aarav.id, subtest_name="Test 1", marks_obtained=42.0, status="ACTIVE")
        db.add(m_t1)
        db.flush()

        v1 = MarkVersion(
            mark_id=m_t1.id,
            component_id=comp_tests.id,
            student_id=aarav.id,
            subtest_name="Test 1",
            version_number=1,
            marks_obtained=37.0,
            previous_marks=None,
            changed_by_id=fac1_user.id,
            reason="Initial import from test1_batch_upload.xlsx",
            source="EXCEL_IMPORT",
            created_at=datetime.utcnow() - timedelta(days=15)
        )
        v2 = MarkVersion(
            mark_id=m_t1.id,
            component_id=comp_tests.id,
            student_id=aarav.id,
            subtest_name="Test 1",
            version_number=2,
            marks_obtained=42.0,
            previous_marks=37.0,
            changed_by_id=fac1_user.id,
            reason="Correction: Question 4 re-evaluated after paper verification",
            source="MANUAL",
            created_at=datetime.utcnow() - timedelta(days=4)
        )
        db.add_all([v1, v2])

        # Test 2 & Test 3 for Best-of-N demonstration
        m_t2 = Mark(component_id=comp_tests.id, student_id=aarav.id, subtest_name="Test 2", marks_obtained=42.0, status="ACTIVE")
        m_t3 = Mark(component_id=comp_tests.id, student_id=aarav.id, subtest_name="Test 3", marks_obtained=35.0, status="ACTIVE")
        db.add_all([m_t2, m_t3])

        # Assignment: 18/20
        m_a1 = Mark(component_id=comp_assign.id, student_id=aarav.id, subtest_name="Assignment", marks_obtained=18.0, status="ACTIVE")
        db.add(m_a1)

        # Lab: 27/30
        m_l1 = Mark(component_id=comp_lab.id, student_id=aarav.id, subtest_name="Lab", marks_obtained=27.0, status="ACTIVE")
        db.add(m_l1)

        # Populate other students in CS201
        for idx, s in enumerate(created_students[1:], start=2):
            base_t = 38.0 + (idx % 8)
            base_a = 15.0 + (idx % 5)
            base_l = 24.0 + (idx % 6)

            m_test = Mark(component_id=comp_tests.id, student_id=s.id, subtest_name="Test 1", marks_obtained=min(base_t, 49.0), status="ACTIVE")
            db.add(m_test)
            db.flush()

            db.add(MarkVersion(
                mark_id=m_test.id,
                component_id=comp_tests.id,
                student_id=s.id,
                subtest_name="Test 1",
                version_number=1,
                marks_obtained=m_test.marks_obtained,
                previous_marks=None,
                changed_by_id=fac1_user.id,
                reason="Initial import",
                source="EXCEL_IMPORT",
                created_at=datetime.utcnow() - timedelta(days=12)
            ))

            # Student A105 (Vikram Rao) intentionally missing assignment to demonstrate missing marks anomaly!
            if s.roll_no != "A105":
                db.add(Mark(component_id=comp_assign.id, student_id=s.id, subtest_name="Assignment", marks_obtained=min(base_a, 20.0), status="ACTIVE"))

            db.add(Mark(component_id=comp_lab.id, student_id=s.id, subtest_name="Lab", marks_obtained=min(base_l, 30.0), status="ACTIVE"))

        # 6. Seed 1 Mark Conflict: Ananya Iyer (A102) has 40 in system, but Test_Final.xlsx uploaded 45.0
        ananya = created_students[1]
        conflict = MarkConflict(
            course_id=cs201.id,
            component_id=comp_tests.id,
            student_id=ananya.id,
            subtest_name="Test 1",
            existing_mark=40.0,
            incoming_mark=45.0,
            source_file="Test_Final_Evaluation.xlsx",
            status="PENDING",
            created_at=datetime.utcnow() - timedelta(hours=3)
        )
        db.add(conflict)

        # 7. Seed 1 Student Review Request: Priya Nair (A104)
        priya = created_students[3]
        review_req = ReviewRequest(
            ticket_no="MR-1028",
            course_id=cs201.id,
            student_id=priya.id,
            component_id=comp_lab.id,
            subtest_name="Lab",
            current_mark=25.0,
            student_reason="I believe the uploaded score does not match my evaluated lab record sheet. Question 3 graph traversal was marked full on the physical sheet.",
            status="UNDER_REVIEW",
            faculty_response="Under verification with lab instructor.",
            created_at=datetime.utcnow() - timedelta(days=1)
        )
        db.add(review_req)

        # 8. Seed Audit Logs
        db.add(AuditLog(
            course_id=cs201.id,
            user_id=fac1_user.id,
            action="COURSE_CREATED",
            entity_type="Course",
            entity_id=str(cs201.id),
            details_json="Course CS201 initialized with 3 components.",
            created_at=datetime.utcnow() - timedelta(days=20)
        ))
        db.add(AuditLog(
            course_id=cs201.id,
            user_id=fac1_user.id,
            action="EXCEL_MARKS_IMPORTED",
            entity_type="Course",
            entity_id=str(cs201.id),
            details_json="File: test1_batch_upload.xlsx, Component: Tests, Records: 10",
            created_at=datetime.utcnow() - timedelta(days=15)
        ))
        db.add(AuditLog(
            course_id=cs201.id,
            user_id=fac1_user.id,
            action="MARK_CORRECTED",
            entity_type="Mark",
            entity_id=str(m_t1.id),
            details_json="Student A101 Test 1 updated from 37.0 to 42.0. Reason: Re-evaluation of Q4.",
            created_at=datetime.utcnow() - timedelta(days=4)
        ))
        db.add(AuditLog(
            course_id=cs101.id,
            user_id=fac2_user.id,
            action="COURSE_LOCKED",
            entity_type="Course",
            entity_id=str(cs101.id),
            details_json="Course CS101 final internal marks locked by Prof. Sneha Patel.",
            created_at=datetime.utcnow() - timedelta(hours=2)
        ))

        db.commit()
        print("Successfully seeded MarkScope database!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
