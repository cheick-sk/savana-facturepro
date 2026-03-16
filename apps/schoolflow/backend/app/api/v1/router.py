from fastapi import APIRouter
from app.api.v1.endpoints import auth, dashboard, fees, grades, school, students

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(students.router)
api_router.include_router(grades.router)
api_router.include_router(fees.router)
api_router.include_router(school.router)
api_router.include_router(dashboard.router)
