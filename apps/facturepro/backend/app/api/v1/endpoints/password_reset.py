"""Password Reset and Email Verification API Endpoints.

Provides endpoints for:
- Requesting password reset
- Resetting password with token
- Verifying email address
- Resending verification email
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.services.password_reset_service import (
    PasswordResetService,
    EmailVerificationService,
)
from app.services.email_service import send_invoice_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Request/Response Models
class ForgotPasswordRequest(BaseModel):
    """Request model for forgot password."""
    email: EmailStr
    callback_url: Optional[str] = Field(
        None,
        description="Frontend URL to redirect to for password reset"
    )


class ResetPasswordRequest(BaseModel):
    """Request model for reset password."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")
    confirm_password: str = Field(..., min_length=8, description="Confirm new password")


class VerifyEmailRequest(BaseModel):
    """Request model for email verification."""
    token: str = Field(..., description="Email verification token")


class ResendVerificationRequest(BaseModel):
    """Request model for resending verification email."""
    email: EmailStr


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True


async def send_password_reset_email(
    email: str,
    user_name: str,
    reset_token: str,
    callback_url: Optional[str] = None,
):
    """Send password reset email in background.

    Args:
        email: User's email
        user_name: User's name
        reset_token: Password reset token
        callback_url: Frontend callback URL
    """
    try:
        settings = get_settings()

        # Build reset URL
        if callback_url:
            reset_url = f"{callback_url}?token={reset_token}"
        else:
            reset_url = f"https://savana.africa/reset-password?token={reset_token}"

        # Use email template service
        from shared.libs.notifications.email_template_service import get_template_service
        template_service = get_template_service()

        html_content = template_service.render_password_reset_email(
            user_name=user_name,
            reset_url=reset_url,
            expiry_hours=24,
            support_email=settings.ADMIN_EMAIL,
            lang="fr",
        )

        # Send email
        import aiosmtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart("mixed")
        msg["Subject"] = "Réinitialisation de votre mot de passe - SAVANA"
        msg["From"] = settings.SMTP_FROM
        msg["To"] = email
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            use_tls=False,
            start_tls=settings.SMTP_STARTTLS,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
        )

        logger.info(f"Password reset email sent to {email}")

    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")


async def send_verification_email(
    email: str,
    user_name: str,
    verification_token: str,
    callback_url: Optional[str] = None,
):
    """Send email verification in background.

    Args:
        email: User's email
        user_name: User's name
        verification_token: Verification token
        callback_url: Frontend callback URL
    """
    try:
        settings = get_settings()

        # Build verification URL
        if callback_url:
            verify_url = f"{callback_url}?token={verification_token}"
        else:
            verify_url = f"https://savana.africa/verify-email?token={verification_token}"

        # Use email template service
        from shared.libs.notifications.email_template_service import get_template_service
        template_service = get_template_service()

        # Generate verification code
        import random
        verification_code = str(random.randint(100000, 999999))

        html_content = template_service.render_email_verification_email(
            user_name=user_name,
            verify_url=verify_url,
            verification_code=verification_code,
            expiry_minutes=10,
            app_name="FacturePro",
            support_email=settings.ADMIN_EMAIL,
            lang="fr",
        )

        # Send email
        import aiosmtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart("mixed")
        msg["Subject"] = "Vérifiez votre email - FacturePro"
        msg["From"] = settings.SMTP_FROM
        msg["To"] = email
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            use_tls=False,
            start_tls=settings.SMTP_STARTTLS,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
        )

        logger.info(f"Verification email sent to {email}")

    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset email.

    This endpoint always returns a success message to prevent
    email enumeration attacks.

    - **email**: Your account email address
    - **callback_url**: Frontend URL for the reset page
    """
    service = PasswordResetService(db)

    result = await service.request_password_reset(request.email)

    if result:
        token, expires_at, user_name, email = result

        # Send email in background
        background_tasks.add_task(
            send_password_reset_email,
            email,
            user_name,
            token,
            request.callback_url,
        )

    # Always return success to prevent email enumeration
    return MessageResponse(
        message="If an account exists with this email, you will receive a password reset link.",
        success=True,
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a valid reset token.

    - **token**: Password reset token from email
    - **new_password**: New password (min 8 characters)
    - **confirm_password**: Confirm new password
    """
    # Validate passwords match
    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )

    # Validate password strength
    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    service = PasswordResetService(db)
    success = await service.reset_password(request.token, request.new_password)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    return MessageResponse(
        message="Password reset successfully. You can now log in with your new password.",
        success=True,
    )


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    request: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify email address using a verification token.

    - **token**: Verification token from email
    """
    service = EmailVerificationService(db)
    success = await service.verify_email(request.token)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    return MessageResponse(
        message="Email verified successfully. You can now access all features.",
        success=True,
    )


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    request: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Resend verification email.

    - **email**: Email address to verify
    """
    service = EmailVerificationService(db)
    result = await service.resend_verification(request.email)

    if result:
        token, user_name, email = result

        # Send email in background
        background_tasks.add_task(
            send_verification_email,
            email,
            user_name,
            token,
        )

    # Always return success to prevent email enumeration
    return MessageResponse(
        message="If an unverified account exists with this email, you will receive a verification link.",
        success=True,
    )


@router.get("/verify-email/{token}", response_model=MessageResponse)
async def verify_email_get(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Verify email address using a token from URL.

    This endpoint is for GET requests from email links.

    - **token**: Verification token from email link
    """
    service = EmailVerificationService(db)
    success = await service.verify_email(token)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    return MessageResponse(
        message="Email verified successfully!",
        success=True,
    )
