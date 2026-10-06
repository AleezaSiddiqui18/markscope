import os
import pandas as pd

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "sample_files")
os.makedirs(SAMPLE_DIR, exist_ok=True)

# 1. Standard Test 1 spreadsheet (Demonstrating "Roll No" and "Test Score" column headers)
df_test1 = pd.DataFrame([
    {"Roll No": "A101", "Student Name": "Aarav Sharma", "Test Score": 42.0},
    {"Roll No": "A102", "Student Name": "Ananya Iyer", "Test Score": 40.0},
    {"Roll No": "A103", "Student Name": "Rohan Verma", "Test Score": 38.0},
    {"Roll No": "A104", "Student Name": "Priya Nair", "Test Score": 45.0},
    {"Roll No": "A105", "Student Name": "Vikram Rao", "Test Score": 36.5},
    {"Roll No": "A106", "Student Name": "Neha Gupta", "Test Score": 47.0},
    {"Roll No": "A107", "Student Name": "Aditya Joshi", "Test Score": 41.0},
    {"Roll No": "A108", "Student Name": "Kavita Singh", "Test Score": 39.5},
    {"Roll No": "A109", "Student Name": "Rahul Das", "Test Score": 34.0},
    {"Roll No": "A110", "Student Name": "Pooja Mehta", "Test Score": 43.5},
])
df_test1.to_excel(os.path.join(SAMPLE_DIR, "CS201_Test1_Marks.xlsx"), index=False)

# 2. Conflicting Marks Spreadsheet (A102 has 46.5 instead of 40.0 to test Conflict Detector)
df_conflict = pd.DataFrame([
    {"Student Identifier": "A101", "Name": "Aarav Sharma", "Marks Obtained": 42.0},
    {"Student Identifier": "A102", "Name": "Ananya Iyer", "Marks Obtained": 46.5},  # CONFLICT!
    {"Student Identifier": "A103", "Name": "Rohan Verma", "Marks Obtained": 38.0},
    {"Student Identifier": "A104", "Name": "Priya Nair", "Marks Obtained": 45.0},
])
df_conflict.to_excel(os.path.join(SAMPLE_DIR, "CS201_Test1_Re-evaluated_Conflict.xlsx"), index=False)

# 3. Assignments Spreadsheet (Demonstrating "Enrollment Number" and "Assignment Score")
df_assignments = pd.DataFrame([
    {"Enrollment Number": "A101", "Student": "Aarav Sharma", "Assignment Score": 18.0},
    {"Enrollment Number": "A102", "Student": "Ananya Iyer", "Assignment Score": 19.0},
    {"Enrollment Number": "A103", "Student": "Rohan Verma", "Assignment Score": 16.5},
    {"Enrollment Number": "A104", "Student": "Priya Nair", "Assignment Score": 19.5},
    {"Enrollment Number": "A106", "Student": "Neha Gupta", "Assignment Score": 18.5},
    {"Enrollment Number": "A107", "Student": "Aditya Joshi", "Assignment Score": 17.0},
    {"Enrollment Number": "A108", "Student": "Kavita Singh", "Assignment Score": 18.0},
    {"Enrollment Number": "A109", "Student": "Rahul Das", "Assignment Score": 15.0},
    {"Enrollment Number": "A110", "Student": "Pooja Mehta", "Assignment Score": 20.0},
])
df_assignments.to_excel(os.path.join(SAMPLE_DIR, "CS201_Assignments.xlsx"), index=False)

# 4. Lab Marks Spreadsheet (Demonstrating "USN" and "Lab Marks")
df_lab = pd.DataFrame([
    {"USN": "A101", "Candidate": "Aarav Sharma", "Lab Marks": 27.0},
    {"USN": "A102", "Candidate": "Ananya Iyer", "Lab Marks": 28.5},
    {"USN": "A103", "Candidate": "Rohan Verma", "Lab Marks": 25.0},
    {"USN": "A104", "Candidate": "Priya Nair", "Lab Marks": 29.0},
    {"USN": "A105", "Candidate": "Vikram Rao", "Lab Marks": 24.0},
    {"USN": "A106", "Candidate": "Neha Gupta", "Lab Marks": 28.0},
    {"USN": "A107", "Candidate": "Aditya Joshi", "Lab Marks": 26.5},
    {"USN": "A108", "Candidate": "Kavita Singh", "Lab Marks": 27.5},
    {"USN": "A109", "Candidate": "Rahul Das", "Lab Marks": 22.0},
    {"USN": "A110", "Candidate": "Pooja Mehta", "Lab Marks": 30.0},
])
df_lab.to_excel(os.path.join(SAMPLE_DIR, "CS201_Lab.xlsx"), index=False)

# 5. Anomalous spreadsheet (Score > max marks and unknown student ID to test Anomaly Radar preview)
df_anomaly = pd.DataFrame([
    {"Roll No": "A101", "Score": 55.0},  # Exceeds max 50!
    {"Roll No": "A999", "Score": 40.0},  # Unknown student!
    {"Roll No": "A102", "Score": -5.0},  # Negative mark!
])
df_anomaly.to_excel(os.path.join(SAMPLE_DIR, "Anomalous_Test_Data.xlsx"), index=False)

print(f"Sample test spreadsheets created in {SAMPLE_DIR}")
