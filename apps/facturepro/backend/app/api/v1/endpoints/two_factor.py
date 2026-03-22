"""Two-Factor Authentication API endpoints.
Setup, enable, disable, and verify TOTP codes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import User
from app.services.two_factor_service import TwoFactorManager


router = APIRouter(prefix="/2fa", tags=["Two-Factor Authentication"])
security = HTTPBearer()


class Setup2FAResponse(BaseModel):
    """Response for 2FA setup initiation."""
    secret: str
    qr_code: str  # Base64 encoded PNG
    uri: str
    backup_codes: list[str]
    message: str = "Scan this QR code with your authenticator app"


class Verify2FARequest(BaseModel):
    """Request to verify 2FA code."""
    code: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP code")


class Verify2FAResponse(BaseModel):
    """Response for 2FA verification."""
    valid: bool
    message: str


class Enable2FARequest(BaseModel):
    """Request to enable 2FA."""
    secret: str
    code: str = Field(..., min_length=6, max_length=6)
    hashed_backup_codes: list[str]


class Disable2FARequest(BaseModel):
    """Request to disable 2FA."""
    code: Optional[str] = Field(None, min_length=6, max_length=6)
    password: Optional[str] = None


class BackupCodesResponse(BaseModel):
    """Response for backup codes regeneration."""
    backup_codes: list[str]
    message: str


class Status2FAResponse(BaseModel):
    """Response for 2FA status."""
    enabled: bool
    enabled_at: Optional[str] = None
    backup_codes_remaining: int


@router.post("/setup", response_model=Setup2FAResponse)
async def setup_2fa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start 2FA setup - returns QR code and backup codes.
    
    The user must scan the QR code with their authenticator app
    and then call /enable with a verification code.
    """
    # Check if 2FA is already enabled
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled. Disable it first to set up again."
        )
    
    manager = TwoFactorManager(db)
    setup_data = await manager.setup_2fa(current_user.id)
    
    return Setup2FAResponse(
        secret=setup_data["secret"],
        qr_code=setup_data["qr_code"],
        uri=setup_data["uri"],
        backup_codes=setup_data["backup_codes"],
        message="Scan this QR code with Google Authenticator, Authy, or Microsoft Authenticator"
    )


@router.post("/enable", response_model=Verify2FAResponse)
async def enable_2fa(
    request: Enable2FARequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Enable 2FA after verifying the setup.
    
    User must provide:
    - The secret from /setup
    - A valid TOTP code from their authenticator
    - The hashed backup codes from /setup
    """
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )
    
    manager = TwoFactorManager(db)
    success = await manager.enable_2fa(
        user_id=current_user.id,
        secret=request.secret,
        code=request.code,
        hashed_backup_codes=request.hashed_backup_codes
    )
    
    if success:
        return Verify2FAResponse(
            valid=True,
            message="Two-factor authentication enabled successfully. Keep your backup codes safe!"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please try again."
        )


@router.post("/disable", response_model=Verify2FAResponse)
async def disable_2fa(
    request: Disable2FARequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disable 2FA.
    
    User must provide either:
    - A valid TOTP code, or
    - Their account password
    """
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )
    
    if not request.code and not request.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either a TOTP code or your password"
        )
    
    manager = TwoFactorManager(db)
    success = await manager.disable_2fa(
        user_id=current_user.id,
        code=request.code,
        password=request.password
    )
    
    if success:
        return Verify2FAResponse(
            valid=True,
            message="Two-factor authentication disabled"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid code or password"
        )


@router.post("/verify", response_model=Verify2FAResponse)
async def verify_2fa(
    request: Verify2FARequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Verify a 2FA code.
    
    Used during login or for sensitive operations.
    Accepts both TOTP codes and backup codes.
    """
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled for this account"
        )
    
    manager = TwoFactorManager(db)
    is_valid, message = await manager.verify_2fa(
        user_id=current_user.id,
        code=request.code
    )
    
    return Verify2FAResponse(
        valid=is_valid,
        message=message
    )


@router.post("/verify-login", response_model=Verify2FAResponse)
async def verify_2fa_login(
    request: Verify2FARequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify 2FA during login.
    
    This endpoint is called after initial login credentials are verified,
    when 2FA is enabled for the user.
    """
    from sqlalchemy import select
    from app.core.security import decode_token
    
    # This would typically be called with a temporary token from login
    # For now, we'll use the current user
    # In production, you'd have a separate flow for this
    
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Use /verify endpoint with authenticated user"
    )


@router.post("/regenerate-backup-codes", response_model=BackupCodesResponse)
async def regenerate_backup_codes(
    request: Verify2FARequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Regenerate backup codes.
    
    User must provide a valid TOTP code to regenerate backup codes.
    Old backup codes will be invalidated.
    """
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )
    
    manager = TwoFactorManager(db)
    backup_codes = await manager.regenerate_backup_codes(
        user_id=current_user.id,
        code=request.code
    )
    
    if backup_codes is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    return BackupCodesResponse(
        backup_codes=backup_codes,
        message="New backup codes generated. Store these safely - they won't be shown again!"
    )


@router.get("/status", response_model=Status2FAResponse)
async def get_2fa_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get 2FA status for the current user."""
    manager = TwoFactorManager(db)
    status_data = await manager.get_2fa_status(current_user.id)
    
    return Status2FAResponse(**status_data)


@router.get("/recovery-options")
async def get_recovery_options():
    """Get available recovery options when locked out.
    
    Returns information about how to recover account access
    if 2FA codes are lost.
    """
    return {
        "options": [
            {
                "type": "backup_codes",
                "description": "Use one of your backup codes (if you saved them)",
                "priority": 1
            },
            {
                "type": "contact_support",
                "description": "Contact support with identity verification",
                "priority": 2,
                "contact": "support@facturepro.africa"
            }
        ],
        "preventive_tips": [
            "Save your backup codes in a secure location",
            "Use a password manager that supports 2FA codes",
            "Set up multiple authenticator apps if possible"
        ]
    }
