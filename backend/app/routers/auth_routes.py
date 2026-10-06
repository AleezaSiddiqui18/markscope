from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserLogin, Token, UserResponse
from ..auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == login_data.username) | (User.email == login_data.username)
    ).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username, "role": user.role, "user_id": user.id})
    
    user_info = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "department": user.department,
        "student_id": user.student_profile.id if user.student_profile else None,
        "roll_no": user.student_profile.roll_no if user.student_profile else None,
        "faculty_id": user.faculty_profile.id if user.faculty_profile else None,
        "faculty_code": user.faculty_profile.faculty_code if user.faculty_profile else None,
    }

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_info
    }


@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "department": current_user.department,
        "student_id": current_user.student_profile.id if current_user.student_profile else None,
        "roll_no": current_user.student_profile.roll_no if current_user.student_profile else None,
        "faculty_id": current_user.faculty_profile.id if current_user.faculty_profile else None,
        "faculty_code": current_user.faculty_profile.faculty_code if current_user.faculty_profile else None,
    }


@router.post("/demo-switch/{username}", response_model=Token)
def demo_switch(username: str, db: Session = Depends(get_db)):
    """Fast one-click demo login switch for hackathon evaluation."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Demo user '{username}' not found.")

    access_token = create_access_token(data={"sub": user.username, "role": user.role, "user_id": user.id})
    user_info = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "department": user.department,
        "student_id": user.student_profile.id if user.student_profile else None,
        "roll_no": user.student_profile.roll_no if user.student_profile else None,
        "faculty_id": user.faculty_profile.id if user.faculty_profile else None,
        "faculty_code": user.faculty_profile.faculty_code if user.faculty_profile else None,
    }

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_info
    }
