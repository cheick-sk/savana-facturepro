"""Reporting tasks for SchoolFlow Africa."""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(name="app.tasks.reports.generate_term_reports")
def generate_term_reports():
    """Generate term reports for all students."""
    logger.info("Generating term reports...")
    # TODO: Implement term report generation
    return {"status": "completed", "reports_generated": 0}
