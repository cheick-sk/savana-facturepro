"""
Reports tasks for SchoolFlow Africa
"""
from app.celery_app import celery_app


@celery_app.task(name="app.tasks.reports.generate_term_reports")
def generate_term_reports():
    """Generate term reports for students"""
    # TODO: Implement term report generation
    return {"status": "completed", "message": "Term reports generated"}
