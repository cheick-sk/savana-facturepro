"""
Reports tasks for SavanaFlow POS
"""
from app.celery_app import celery_app


@celery_app.task(name="app.tasks.reports.generate_daily_sales_report")
def generate_daily_sales_report():
    """Generate daily sales report"""
    # TODO: Implement daily sales report generation
    return {"status": "completed", "message": "Daily sales report generated"}
