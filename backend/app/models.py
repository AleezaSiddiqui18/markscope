from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # STUDENT, FACULTY, HOD
    department = Column(String(100), default="Computer Science & Engineering")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student_profile = relationship("Student", back_populates="user", uselist=False)
    faculty_profile = relationship("Faculty", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="user")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    roll_no = Column(String(50), unique=True, index=True, nullable=False)
    current_semester = Column(Integer, default=5)
    department = Column(String(100), default="Computer Science & Engineering")

    # Relationships
    user = relationship("User", back_populates="student_profile")
    enrollments = relationship("CourseEnrollment", back_populates="student", cascade="all, delete-orphan")
    marks = relationship("Mark", back_populates="student", cascade="all, delete-orphan")
    mark_versions = relationship("MarkVersion", back_populates="student")
    review_requests = relationship("ReviewRequest", back_populates="student")


class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    faculty_code = Column(String(50), unique=True, index=True, nullable=False)
    designation = Column(String(100), default="Assistant Professor")
    department = Column(String(100), default="Computer Science & Engineering")

    # Relationships
    user = relationship("User", back_populates="faculty_profile")
    courses = relationship("Course", back_populates="faculty")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    semester = Column(Integer, default=5)
    academic_year = Column(String(20), default="2026-2027")
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    status = Column(String(30), default="DRAFT")  # DRAFT, MARKS_ENTERED, VALIDATED, SUBMITTED, LOCKED
    is_locked = Column(Boolean, default=False)
    locked_at = Column(DateTime, nullable=True)
    locked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    faculty = relationship("Faculty", back_populates="courses")
    locked_by = relationship("User", foreign_keys=[locked_by_id])
    enrollments = relationship("CourseEnrollment", back_populates="course", cascade="all, delete-orphan")
    components = relationship("AssessmentComponent", back_populates="course", cascade="all, delete-orphan", order_by="AssessmentComponent.order_index")
    audit_logs = relationship("AuditLog", back_populates="course")
    conflicts = relationship("MarkConflict", back_populates="course")
    anomalies = relationship("Anomaly", back_populates="course")
    review_requests = relationship("ReviewRequest", back_populates="course")


class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="enrollments")
    student = relationship("Student", back_populates="enrollments")

    __table_args__ = (
        UniqueConstraint("course_id", "student_id", name="uq_course_student"),
    )


class AssessmentComponent(Base):
    __tablename__ = "assessment_components"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)  # e.g. "Tests", "Assignments", "Lab"
    type = Column(String(50), default="TEST")  # TEST, ASSIGNMENT, LAB, QUIZ, ATTENDANCE, PROJECT, VIVA
    max_marks = Column(Float, nullable=False)
    weightage = Column(Float, nullable=False)  # percentage, e.g. 40.0
    order_index = Column(Integer, default=0)
    
    # Best-of-N configuration
    is_best_of_n = Column(Boolean, default=False)
    best_of_n_count = Column(Integer, default=2)  # e.g. best 2
    total_subtests = Column(Integer, default=3)   # out of 3

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="components")
    marks = relationship("Mark", back_populates="component", cascade="all, delete-orphan")
    versions = relationship("MarkVersion", back_populates="component")


class Mark(Base):
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("assessment_components.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subtest_name = Column(String(50), default="Default")  # e.g. "Test 1", "Test 2", or "Final"
    marks_obtained = Column(Float, nullable=False)
    is_excluded = Column(Boolean, default=False)  # If Best-of-N dropped this score
    status = Column(String(20), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    component = relationship("AssessmentComponent", back_populates="marks")
    student = relationship("Student", back_populates="marks")

    __table_args__ = (
        UniqueConstraint("component_id", "student_id", "subtest_name", name="uq_comp_stud_subtest"),
    )


class MarkVersion(Base):
    __tablename__ = "mark_versions"

    id = Column(Integer, primary_key=True, index=True)
    mark_id = Column(Integer, nullable=True)
    component_id = Column(Integer, ForeignKey("assessment_components.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subtest_name = Column(String(50), default="Default")
    version_number = Column(Integer, default=1)
    marks_obtained = Column(Float, nullable=False)
    previous_marks = Column(Float, nullable=True)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String(255), default="Score update")
    source = Column(String(50), default="MANUAL")  # MANUAL, EXCEL_IMPORT, DISPUTE_RESOLUTION
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    component = relationship("AssessmentComponent", back_populates="versions")
    student = relationship("Student", back_populates="mark_versions")
    changed_by = relationship("User")


class MarkConflict(Base):
    __tablename__ = "mark_conflicts"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    component_id = Column(Integer, ForeignKey("assessment_components.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subtest_name = Column(String(50), default="Default")
    existing_mark = Column(Float, nullable=False)
    incoming_mark = Column(Float, nullable=False)
    source_file = Column(String(150), default="upload.xlsx")
    status = Column(String(30), default="PENDING")  # PENDING, RESOLVED_KEPT, RESOLVED_OVERWRITTEN
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="conflicts")
    component = relationship("AssessmentComponent")
    student = relationship("Student")
    resolved_by = relationship("User")


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    component_id = Column(Integer, ForeignKey("assessment_components.id", ondelete="CASCADE"), nullable=True)
    rule_type = Column(String(80), nullable=False)  # EXCEED_MAX, SUDDEN_CHANGE, IDENTICAL_CLUSTER, MISSING_MARK, WEIGHT_SUM
    severity = Column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH
    description = Column(Text, nullable=False)
    details_json = Column(Text, nullable=True)  # Store context dict
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="anomalies")
    student = relationship("Student")
    component = relationship("AssessmentComponent")


class ReviewRequest(Base):
    __tablename__ = "review_requests"

    id = Column(Integer, primary_key=True, index=True)
    ticket_no = Column(String(30), unique=True, index=True, nullable=False)  # e.g. "MR-1028"
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    component_id = Column(Integer, ForeignKey("assessment_components.id", ondelete="CASCADE"), nullable=False)
    subtest_name = Column(String(50), default="Default")
    current_mark = Column(Float, nullable=False)
    student_reason = Column(Text, nullable=False)
    status = Column(String(30), default="SUBMITTED")  # SUBMITTED, UNDER_REVIEW, RESOLVED
    faculty_response = Column(Text, nullable=True)
    resolved_mark = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="review_requests")
    student = relationship("Student", back_populates="review_requests")
    component = relationship("AssessmentComponent")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(100), nullable=False)  # COURSE_CREATED, MARKS_UPLOADED, MARK_UPDATED, COURSE_LOCKED, COURSE_UNLOCKED, CONFLICT_RESOLVED
    entity_type = Column(String(50), nullable=False)  # Course, Mark, Conflict, ReviewRequest
    entity_id = Column(String(50), nullable=True)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")
