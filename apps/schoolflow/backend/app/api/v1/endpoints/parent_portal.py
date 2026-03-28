"""Parent Portal API endpoints for SchoolFlow Africa."""
from __future__ import annotations

import logging
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import User
from app.schemas.parent_portal import (
    ParentRegisterRequest,
    ParentLoginRequest,
    ParentMagicLinkRequest,
    ParentVerifyMagicRequest,
    ParentRefreshRequest,
    ParentTokenResponse,
    ParentAccountOut,
    ParentInfoOut,
    ParentProfileUpdate,
    ParentAccountUpdate,
    ParentPasswordChange,
    ChildOut,
    ChildDetailOut,
    GradeForParentOut,
    TermGradesOut,
    ReportCardOut,
    AttendanceRecordForParentOut,
    AttendanceStatsForParentOut,
    WeekTimetableOut,
    FeeInvoiceForParentOut,
    FeePaymentRequest,
    MobileMoneyPaymentRequest,
    ParentMessageOut,
    ParentMessageCreate,
    ParentMessageReply,
    ParentNotificationOut,
    NotificationListOut,
    ParentDashboardOut,
    LinkStudentRequest,
)
from app.services.parent_portal_service import ParentPortalService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/parent", tags=["Parent Portal"])


# ──────────────── Dependencies ────────────────

async def get_parent_service(db: AsyncSession = Depends(get_db)) -> ParentPortalService:
    """Get parent portal service."""
    return ParentPortalService(db)


async def get_current_parent_id(
    current_user: User = Depends(get_current_user)
) -> int:
    """Get current parent ID from authenticated user.
    
    For now, we use the user ID as parent ID.
    In production, you might have a separate mapping.
    """
    # Check if user has a linked parent account
    # For simplicity, we assume user.id corresponds to parent.id
    # You might need to adjust this based on your actual auth setup
    return current_user.id


# ──────────────── Authentication Endpoints ────────────────

@router.post("/auth/register", response_model=ParentTokenResponse, status_code=status.HTTP_201_CREATED)
async def register_parent(
    request: ParentRegisterRequest,
    service: ParentPortalService = Depends(get_parent_service)
):
    """Register a new parent account."""
    try:
        account = await service.register(
            first_name=request.first_name,
            last_name=request.last_name,
            email=request.email,
            password=request.password,
            phone=request.phone,
            student_ids=request.student_ids
        )
        
        access_token = service._create_access_token(account.parent_id)
        
        return ParentTokenResponse(
            access_token=access_token,
            refresh_token=account.refresh_token or "",
            parent=ParentAccountOut(
                id=account.id,
                email=account.email,
                phone=account.phone,
                preferred_language=account.preferred_language,
                notification_channels=account.notification_channels,
                receive_sms_notifications=account.receive_sms_notifications,
                receive_email_notifications=account.receive_email_notifications,
                is_active=account.is_active,
                email_verified=account.email_verified,
                last_login=account.last_login,
                created_at=account.created_at,
                parent=ParentInfoOut.model_validate(account.parent)
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/auth/magic-link", status_code=status.HTTP_200_OK)
async def request_magic_link(
    request: ParentMagicLinkRequest,
    service: ParentPortalService = Depends(get_parent_service)
):
    """Request a magic link for passwordless login."""
    await service.request_magic_link(request.email)
    return {"message": "Si un compte existe, vous recevrez un lien de connexion"}


@router.post("/auth/verify-magic", response_model=ParentTokenResponse)
async def verify_magic_link(
    request: ParentVerifyMagicRequest,
    service: ParentPortalService = Depends(get_parent_service)
):
    """Verify magic link token and login."""
    try:
        account = await service.verify_magic_link(request.token)
        
        access_token = service._create_access_token(account.parent_id)
        
        return ParentTokenResponse(
            access_token=access_token,
            refresh_token=account.refresh_token or "",
            parent=ParentAccountOut(
                id=account.id,
                email=account.email,
                phone=account.phone,
                preferred_language=account.preferred_language,
                notification_channels=account.notification_channels,
                receive_sms_notifications=account.receive_sms_notifications,
                receive_email_notifications=account.receive_email_notifications,
                is_active=account.is_active,
                email_verified=account.email_verified,
                last_login=account.last_login,
                created_at=account.created_at,
                parent=ParentInfoOut.model_validate(account.parent)
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/auth/login", response_model=ParentTokenResponse)
async def login_parent(
    request: ParentLoginRequest,
    service: ParentPortalService = Depends(get_parent_service)
):
    """Login with email and password."""
    try:
        account = await service.login(request.email, request.password)
        
        access_token = service._create_access_token(account.parent_id)
        
        return ParentTokenResponse(
            access_token=access_token,
            refresh_token=account.refresh_token or "",
            parent=ParentAccountOut(
                id=account.id,
                email=account.email,
                phone=account.phone,
                preferred_language=account.preferred_language,
                notification_channels=account.notification_channels,
                receive_sms_notifications=account.receive_sms_notifications,
                receive_email_notifications=account.receive_email_notifications,
                is_active=account.is_active,
                email_verified=account.email_verified,
                last_login=account.last_login,
                created_at=account.created_at,
                parent=ParentInfoOut.model_validate(account.parent)
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/auth/refresh", response_model=ParentTokenResponse)
async def refresh_tokens(
    request: ParentRefreshRequest,
    service: ParentPortalService = Depends(get_parent_service)
):
    """Refresh access token."""
    try:
        account = await service.refresh_tokens(request.refresh_token)
        
        access_token = service._create_access_token(account.parent_id)
        
        return ParentTokenResponse(
            access_token=access_token,
            refresh_token=account.refresh_token or "",
            parent=ParentAccountOut(
                id=account.id,
                email=account.email,
                phone=account.phone,
                preferred_language=account.preferred_language,
                notification_channels=account.notification_channels,
                receive_sms_notifications=account.receive_sms_notifications,
                receive_email_notifications=account.receive_email_notifications,
                is_active=account.is_active,
                email_verified=account.email_verified,
                last_login=account.last_login,
                created_at=account.created_at,
                parent=ParentInfoOut.model_validate(account.parent)
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/auth/logout", status_code=status.HTTP_200_OK)
async def logout_parent(
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Logout parent (invalidate tokens)."""
    account = await service.get_current_parent(parent_id)
    if account:
        account.refresh_token = None
        account.refresh_token_expires = None
    return {"message": "Déconnexion réussie"}


# ──────────────── Profile Endpoints ────────────────

@router.get("/profile", response_model=ParentAccountOut)
async def get_profile(
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get parent profile."""
    account = await service.get_current_parent(parent_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compte non trouvé")
    
    return ParentAccountOut(
        id=account.id,
        email=account.email,
        phone=account.phone,
        preferred_language=account.preferred_language,
        notification_channels=account.notification_channels,
        receive_sms_notifications=account.receive_sms_notifications,
        receive_email_notifications=account.receive_email_notifications,
        is_active=account.is_active,
        email_verified=account.email_verified,
        last_login=account.last_login,
        created_at=account.created_at,
        parent=ParentInfoOut.model_validate(account.parent)
    )


@router.put("/profile", response_model=ParentInfoOut)
async def update_profile(
    request: ParentProfileUpdate,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Update parent profile."""
    try:
        parent = await service.update_profile(
            parent_id=parent_id,
            first_name=request.first_name,
            last_name=request.last_name,
            phone=request.phone,
            address=request.address
        )
        return ParentInfoOut.model_validate(parent)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/account", response_model=ParentAccountOut)
async def update_account_settings(
    request: ParentAccountUpdate,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Update parent account settings."""
    try:
        account = await service.update_account_settings(
            parent_id=parent_id,
            preferred_language=request.preferred_language,
            notification_channels=request.notification_channels,
            receive_sms_notifications=request.receive_sms_notifications,
            receive_email_notifications=request.receive_email_notifications
        )
        return ParentAccountOut(
            id=account.id,
            email=account.email,
            phone=account.phone,
            preferred_language=account.preferred_language,
            notification_channels=account.notification_channels,
            receive_sms_notifications=account.receive_sms_notifications,
            receive_email_notifications=account.receive_email_notifications,
            is_active=account.is_active,
            email_verified=account.email_verified,
            last_login=account.last_login,
            created_at=account.created_at,
            parent=ParentInfoOut.model_validate(account.parent)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/password", status_code=status.HTTP_200_OK)
async def change_password(
    request: ParentPasswordChange,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Change parent password."""
    try:
        await service.change_password(
            parent_id=parent_id,
            current_password=request.current_password,
            new_password=request.new_password
        )
        return {"message": "Mot de passe modifié avec succès"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ──────────────── Children Endpoints ────────────────

@router.get("/children", response_model=list[ChildOut])
async def get_children(
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get list of children."""
    children = await service.get_children(parent_id)
    return [ChildOut(**child) for child in children]


@router.get("/children/{student_id}", response_model=ChildDetailOut)
async def get_child_detail(
    student_id: int,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get detailed child information."""
    child = await service.get_child_detail(parent_id, student_id)
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élève non trouvé ou non autorisé")
    return ChildDetailOut(**child)


@router.post("/children/link", response_model=ChildOut, status_code=status.HTTP_201_CREATED)
async def link_student(
    request: LinkStudentRequest,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Link a student to parent account."""
    try:
        student = await service.link_student_by_number(
            parent_id=parent_id,
            student_number=request.student_number,
            relationship=request.relationship
        )
        
        # Get child info
        children = await service.get_children(parent_id)
        for child in children:
            if child["id"] == student.id:
                return ChildOut(**child)
        
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur lors de la récupération")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ──────────────── Grades Endpoints ────────────────

@router.get("/children/{student_id}/grades", response_model=list[GradeForParentOut])
async def get_student_grades(
    student_id: int,
    term_id: int | None = Query(None),
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get grades for a student."""
    # Verify access
    child = await service.get_child_detail(parent_id, student_id)
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élève non trouvé ou non autorisé")
    
    grades = await service.get_student_grades(student_id, term_id)
    return [GradeForParentOut(**grade) for grade in grades]


@router.get("/children/{student_id}/grades/term/{term_id}", response_model=TermGradesOut)
async def get_student_grades_by_term(
    student_id: int,
    term_id: int,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get grades grouped by subject for a term."""
    # Verify access
    child = await service.get_child_detail(parent_id, student_id)
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élève non trouvé ou non autorisé")
    
    grades = await service.get_student_grades_by_term(student_id, term_id)
    return TermGradesOut(**grades)


@router.get("/children/{student_id}/report-card/{term_id}", response_model=ReportCardOut)
async def get_report_card(
    student_id: int,
    term_id: int,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get report card for a term."""
    # Verify access
    child = await service.get_child_detail(parent_id, student_id)
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élève non trouvé ou non autorisé")
    
    try:
        report = await service.get_report_card(student_id, term_id)
        return ReportCardOut(**report)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ──────────────── Attendance Endpoints ────────────────

@router.get("/children/{student_id}/attendance", response_model=list[AttendanceRecordForParentOut])
async def get_student_attendance(
    student_id: int,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get attendance records for a student."""
    # Verify access
    child = await service.get_child_detail(parent_id, student_id)
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élève non trouvé ou non autorisé")
    
    records = await service.get_student_attendance(student_id, start_date, end_date)
    return [AttendanceRecordForParentOut(**record) for record in records]


@router.get("/children/{student_id}/attendance/stats", response_model=AttendanceStatsForParentOut)
async def get_student_attendance_stats(
    student_id: int,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get attendance statistics for a student."""
    # Verify access
    child = await service.get_child_detail(parent_id, student_id)
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élève non trouvé ou non autorisé")
    
    stats = await service.get_student_attendance_stats(student_id, start_date, end_date)
    return AttendanceStatsForParentOut(student_id=student_id, **stats)


# ──────────────── Timetable Endpoints ────────────────

@router.get("/children/{student_id}/timetable", response_model=WeekTimetableOut)
async def get_student_timetable(
    student_id: int,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get timetable for a student."""
    # Verify access
    child = await service.get_child_detail(parent_id, student_id)
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élève non trouvé ou non autorisé")
    
    timetable = await service.get_student_timetable(student_id)
    return WeekTimetableOut(**timetable)


# ──────────────── Fees Endpoints ────────────────

@router.get("/children/{student_id}/fees", response_model=list[FeeInvoiceForParentOut])
async def get_student_fees(
    student_id: int,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get fee invoices for a student."""
    # Verify access
    child = await service.get_child_detail(parent_id, student_id)
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élève non trouvé ou non autorisé")
    
    fees = await service.get_student_fees(student_id)
    return [FeeInvoiceForParentOut(**fee) for fee in fees]


@router.post("/fees/{fee_id}/pay", status_code=status.HTTP_201_CREATED)
async def pay_fee(
    fee_id: int,
    request: FeePaymentRequest,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Process payment for a fee invoice."""
    try:
        payment = await service.process_payment(
            fee_invoice_id=fee_id,
            amount=request.amount,
            method=request.method,
            reference=None
        )
        return {
            "payment_id": payment.id,
            "amount": float(payment.amount),
            "method": payment.method,
            "reference": payment.reference,
            "paid_at": payment.paid_at
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/fees/{fee_id}/pay/mobile-money", status_code=status.HTTP_201_CREATED)
async def pay_fee_mobile_money(
    fee_id: int,
    request: MobileMoneyPaymentRequest,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Process mobile money payment for a fee invoice."""
    try:
        result = await service.process_mobile_money_payment(
            fee_invoice_id=fee_id,
            amount=request.amount,
            provider=request.provider,
            phone_number=request.phone_number
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ──────────────── Messages Endpoints ────────────────

@router.get("/messages", response_model=dict[str, Any])
async def get_messages(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get messages for parent."""
    messages, total = await service.get_messages(parent_id, unread_only, page, size)
    return {
        "items": [ParentMessageOut(**msg) for msg in messages],
        "total": total,
        "page": page,
        "size": size
    }


@router.post("/messages", response_model=ParentMessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    request: ParentMessageCreate,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Send a message to the school."""
    try:
        message = await service.send_message(
            parent_id=parent_id,
            subject=request.subject,
            content=request.content,
            student_id=request.student_id,
            category=request.category,
            priority=request.priority
        )
        return ParentMessageOut.model_validate(message)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/messages/{message_id}", response_model=ParentMessageOut)
async def get_message(
    message_id: int,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get a specific message."""
    messages, _ = await service.get_messages(parent_id)
    for msg in messages:
        if msg["id"] == message_id:
            # Mark as read
            await service.mark_message_read(parent_id, message_id)
            return ParentMessageOut(**msg)
    
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message non trouvé")


@router.post("/messages/{message_id}/reply", response_model=ParentMessageOut, status_code=status.HTTP_201_CREATED)
async def reply_to_message(
    message_id: int,
    request: ParentMessageReply,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Reply to a message."""
    try:
        reply = await service.reply_to_message(
            parent_id=parent_id,
            message_id=message_id,
            content=request.content
        )
        return ParentMessageOut.model_validate(reply)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ──────────────── Notifications Endpoints ────────────────

@router.get("/notifications", response_model=NotificationListOut)
async def get_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get notifications for parent."""
    notifications, total, unread_count = await service.get_notifications(
        parent_id, unread_only, page, size
    )
    return NotificationListOut(
        items=[ParentNotificationOut(**notif) for notif in notifications],
        total=total,
        unread_count=unread_count
    )


@router.put("/notifications/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_read(
    notification_id: int,
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Mark a notification as read."""
    await service.mark_notification_read(parent_id, notification_id)
    return {"message": "Notification marquée comme lue"}


@router.put("/notifications/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Mark all notifications as read."""
    count = await service.mark_all_notifications_read(parent_id)
    return {"message": f"{count} notifications marquées comme lues"}


# ──────────────── Dashboard Endpoint ────────────────

@router.get("/dashboard", response_model=ParentDashboardOut)
async def get_dashboard(
    parent_id: int = Depends(get_current_parent_id),
    service: ParentPortalService = Depends(get_parent_service)
):
    """Get parent dashboard data."""
    try:
        dashboard = await service.get_dashboard(parent_id)
        return ParentDashboardOut(**dashboard)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
