from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .seed import seed_database
from .routers import (
    auth_routes,
    course_routes,
    marks_routes,
    student_routes,
    excel_routes,
    analytics_routes,
    dispute_routes,
)

# Initialize database schema
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-seed database if empty on launch
    seed_database()
    yield


app = FastAPI(
    title="MarkScope API",
    description="Explainable Academic Assessment Intelligence Platform — Every Mark Has A Story",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_routes.router)
app.include_router(course_routes.router)
app.include_router(marks_routes.router)
app.include_router(student_routes.router)
app.include_router(excel_routes.router)
app.include_router(excel_routes.sample_router)
app.include_router(analytics_routes.router)
app.include_router(dispute_routes.router)


@app.get("/")
def root():
    return {
        "app": "MarkScope API",
        "tagline": "Every mark has a story.",
        "status": "operational",
        "docs": "/docs"
    }

