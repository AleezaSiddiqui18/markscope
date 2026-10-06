from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# --- Auth & User ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    department: str
    student_id: Optional[int] = None
    roll_no: Optional[str] = None
    faculty_id: Optional[int] = None
    faculty_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)



# --- Components ---
class ComponentCreate(BaseModel):
    name: str
    type: str = "TEST"
    max_marks: float = Field(gt=0, description="Max marks must be greater than 0")
    weightage: float = Field(ge=0, le=100, description="Weightage percentage 0-100")
    is_best_of_n: bool = False
    best_of_n_count: int = 2
    total_subtests: int = 3


class ComponentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    max_marks: Optional[float] = Field(None, gt=0)
    weightage: Optional[float] = Field(None, ge=0, le=100)
    is_best_of_n: Optional[bool] = None
    best_of_n_count: Optional[int] = None
    total_subtests: Optional[int] = None


class ComponentResponse(BaseModel):
    id: int
    course_id: int
    name: str
    type: str
    max_marks: float
    weightage: float
    order_index: int
    is_best_of_n: bool
    best_of_n_count: int
    total_subtests: int

    model_config = ConfigDict(from_attributes=True)


# --- Courses ---
class CourseCreate(BaseModel):
    code: str
    name: str
    semester: int = 5
    academic_year: str = "2026-2027"
    components: List[ComponentCreate] = []
    enrolled_student_ids: List[int] = []


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    semester: Optional[int] = None
    academic_year: Optional[str] = None
    status: Optional[str] = None


class CourseResponse(BaseModel):
    id: int
    code: str
    name: str
    semester: int
    academic_year: str
    faculty_id: int
    faculty_name: Optional[str] = None
    status: str
    is_locked: bool
    locked_at: Optional[datetime] = None
    enrolled_count: int = 0
    components: List[ComponentResponse] = []

    model_config = ConfigDict(from_attributes=True)



# --- Marks & Entry ---
class MarkSingleEntry(BaseModel):
    student_id: int
    component_id: int
    subtest_name: str = "Default"
    marks_obtained: float
    reason: Optional[str] = "Manual entry"


class MarkBatchEntry(BaseModel):
    entries: List[MarkSingleEntry]


class MarkVersionResponse(BaseModel):
    id: int
    version_number: int
    marks_obtained: float
    previous_marks: Optional[float] = None
    changed_by_name: str
    reason: str
    source: str
    created_at: datetime


# --- Calculation & "Why is my mark this?" ---
class SubtestBreakdown(BaseModel):
    subtest_name: str
    marks_obtained: float
    max_marks: float
    is_counted: bool
    exclusion_reason: Optional[str] = None


class ComponentExplanation(BaseModel):
    component_id: int
    component_name: str
    component_type: str
    obtained_marks: float
    max_marks: float
    percentage: float
    weightage: float
    weighted_contribution: float
    is_best_of_n: bool
    subtests: List[SubtestBreakdown] = []
    delta_note: Optional[str] = None


class ExplainMarksResponse(BaseModel):
    student_id: int
    student_name: str
    roll_no: str
    course_id: int
    course_code: str
    course_name: str
    total_internal_mark: float
    max_possible_internal: float = 100.0
    status: str
    is_locked: bool
    components: List[ComponentExplanation]
    version_changes: List[str] = []
    calculation_formula: str


# --- What-If Simulator ---
class WhatIfComponentInput(BaseModel):
    component_id: int
    simulated_marks: float


class WhatIfRequest(BaseModel):
    course_id: int
    student_id: Optional[int] = None
    simulated_components: List[WhatIfComponentInput]


class WhatIfResponse(BaseModel):
    current_internal: float
    projected_internal: float
    difference: float
    percentage_change: float
    component_deltas: List[Dict[str, Any]]
    disclaimer: str = "SIMULATION — NOT OFFICIAL"


# --- Mark DNA ---
class ComponentDNASlice(BaseModel):
    name: str
    share_percentage: float  # Percentage of total internal score contributed
    actual_contribution: float
    weightage: float
    efficiency: float  # e.g., scored 84% of available weightage


class MarkDNAResponse(BaseModel):
    student_id: int
    roll_no: str
    student_name: str
    slices: List[ComponentDNASlice]
    strongest_component: str
    strongest_points: float
    largest_contribution_component: str
    largest_contribution_points: float
    headroom_component: str
    headroom_points: float
    overall_efficiency: float


# --- Timeline ---
class TimelineEventResponse(BaseModel):
    id: str
    timestamp: datetime
    formatted_date: str
    title: str
    description: str
    actor: str
    category: str  # UPLOAD, EDIT, LOCK, SUBMISSION, DISPUTE
    delta: Optional[str] = None


# --- Consolidated Marksheet ---
class ConsolidatedStudentRow(BaseModel):
    student_id: int
    roll_no: str
    student_name: str
    component_marks: Dict[str, Any]  # e.g. {"Tests": {"raw": 42.0, "max": 50.0, "weighted": 33.6}}
    final_internal_mark: float
    status: str
    anomalies_count: int = 0


class ConsolidatedMarksheetResponse(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    status: str
    is_locked: bool
    total_students: int
    components: List[ComponentResponse]
    rows: List[ConsolidatedStudentRow]
    class_average: float
    highest_score: float
    lowest_score: float


# --- Conflicts ---
class ConflictResolveRequest(BaseModel):
    conflict_id: int
    action: str  # "KEEP" or "OVERWRITE"
    reason: Optional[str] = "Faculty resolution"


class ConflictResponse(BaseModel):
    id: int
    course_id: int
    student_id: int
    student_roll_no: str
    student_name: str
    component_name: str
    subtest_name: str
    existing_mark: float
    incoming_mark: float
    max_marks: float
    source_file: str
    status: str
    created_at: datetime


# --- Review Request / Disputes ---
class ReviewRequestCreate(BaseModel):
    course_id: int
    component_id: int
    subtest_name: str = "Default"
    reason: str


class ReviewRequestResolve(BaseModel):
    status: str  # "UNDER_REVIEW" or "RESOLVED"
    faculty_response: str
    resolved_mark: Optional[float] = None


class ReviewRequestResponse(BaseModel):
    id: int
    ticket_no: str
    course_id: int
    course_code: str
    course_name: str
    student_id: int
    student_roll_no: str
    student_name: str
    component_id: int
    component_name: str
    subtest_name: str
    current_mark: float
    student_reason: str
    status: str
    faculty_response: Optional[str] = None
    resolved_mark: Optional[float] = None
    created_at: datetime
    updated_at: datetime


# --- Health & Anomalies ---
class AnomalyResponse(BaseModel):
    id: int
    course_id: int
    course_code: str
    student_roll_no: Optional[str] = None
    student_name: Optional[str] = None
    component_name: Optional[str] = None
    rule_type: str
    severity: str
    description: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    is_resolved: bool


class AssessmentHealthResponse(BaseModel):
    data_completeness_pct: float
    calculation_integrity_pct: float
    unresolved_conflicts: int
    missing_marks_count: int
    locked_records_pct: float
    pending_reviews_count: int
    total_courses: int
    total_students: int
    active_anomalies_count: int
