"""Two-Factor Authentication (TOTP) service for Africa SaaS.
Supports Google Authenticator, Authy, Microsoft Authenticator.
"""
import pyotp
import qrcode
import io
import base64
from typing import Optional, Tuple
from datetime import datetime, timezone
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings


class TwoFactorService:
    """TOTP-based Two-Factor Authentication service.
    
    Compatible with:
    - Google Authenticator
    - Microsoft Authenticator
    - Authy
    - 1Password
    - LastPass Authenticator
    """
    
    # Issuer name shown in authenticator apps
    ISSUER_NAME = "FacturePro Africa"
    
    # TOTP settings
    DIGITS = 6  # Standard 6-digit codes
    INTERVAL = 30  # 30-second intervals
    ALGORITHM = "sha1"  # Standard algorithm
    
    @classmethod
    def generate_secret(cls) -> str:
        """Generate a new TOTP secret key.
        
        Returns:
            Base32-encoded secret key (32 characters)
        """
        return pyotp.random_base32()
    
    @classmethod
    def get_totp(cls, secret: str) -> pyotp.TOTP:
        """Get TOTP instance for a secret.
        
        Args:
            secret: Base32-encoded secret key
            
        Returns:
            TOTP instance
        """
        return pyotp.TOTP(
            secret,
            digits=cls.DIGITS,
            interval=cls.INTERVAL,
            digest=cls.ALGORITHM,
        )
    
    @classmethod
    def verify_code(cls, secret: str, code: str, valid_window: int = 1) -> bool:
        """Verify a TOTP code.
        
        Args:
            secret: Base32-encoded secret key
            code: 6-digit code to verify
            valid_window: Number of intervals before/after current to accept (default: 1)
            
        Returns:
            True if code is valid, False otherwise
        """
        if not secret or not code:
            return False
        
        # Clean the code (remove spaces, ensure it's numeric)
        code = code.strip().replace(" ", "")
        
        if not code.isdigit() or len(code) != cls.DIGITS:
            return False
        
        totp = cls.get_totp(secret)
        return totp.verify(code, valid_window=valid_window)
    
    @classmethod
    def get_current_code(cls, secret: str) -> str:
        """Get current TOTP code (for testing/debugging).
        
        Args:
            secret: Base32-encoded secret key
            
        Returns:
            Current 6-digit code
        """
        totp = cls.get_totp(secret)
        return totp.now()
    
    @classmethod
    def get_provisioning_uri(
        cls,
        secret: str,
        email: str,
        issuer: Optional[str] = None
    ) -> str:
        """Get the provisioning URI for QR code.
        
        Args:
            secret: Base32-encoded secret key
            email: User's email address
            issuer: Issuer name (defaults to ISSUER_NAME)
            
        Returns:
            otpauth:// URI
        """
        issuer = issuer or cls.ISSUER_NAME
        totp = cls.get_totp(secret)
        return totp.provisioning_uri(
            name=email,
            issuer_name=issuer
        )
    
    @classmethod
    def generate_qr_code_base64(
        cls,
        secret: str,
        email: str,
        issuer: Optional[str] = None
    ) -> str:
        """Generate QR code as base64-encoded image.
        
        Args:
            secret: Base32-encoded secret key
            email: User's email address
            issuer: Issuer name
            
        Returns:
            Base64-encoded PNG image
        """
        uri = cls.get_provisioning_uri(secret, email, issuer)
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(uri)
        qr.make(fit=True)
        
        # Create image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_base64}"
    
    @classmethod
    def generate_backup_codes(cls, count: int = 10) -> list[str]:
        """Generate backup/recovery codes.
        
        Args:
            count: Number of codes to generate
            
        Returns:
            List of backup codes (format: XXXX-XXXX)
        """
        codes = []
        for _ in range(count):
            # Generate 8 random alphanumeric characters
            code = secrets.token_hex(4).upper()  # 8 hex chars
            # Format as XXXX-XXXX
            formatted = f"{code[:4]}-{code[4:]}"
            codes.append(formatted)
        return codes
    
    @classmethod
    def hash_backup_codes(cls, codes: list[str]) -> list[str]:
        """Hash backup codes for storage.
        
        Args:
            codes: List of backup codes
            
        Returns:
            List of hashed codes
        """
        import hashlib
        return [hashlib.sha256(code.encode()).hexdigest() for code in codes]
    
    @classmethod
    def verify_backup_code(
        cls,
        code: str,
        hashed_codes: list[str],
        remove_on_use: bool = True
    ) -> Tuple[bool, list[str]]:
        """Verify a backup code.
        
        Args:
            code: Backup code to verify
            hashed_codes: List of hashed backup codes
            remove_on_use: Whether to remove the code after use
            
        Returns:
            Tuple of (is_valid, remaining_codes)
        """
        import hashlib
        
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        
        if code_hash in hashed_codes:
            if remove_on_use:
                remaining = [c for c in hashed_codes if c != code_hash]
                return True, remaining
            return True, hashed_codes
        
        return False, hashed_codes


class TwoFactorManager:
    """Manager class for 2FA operations with database integration."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.service = TwoFactorService()
    
    async def setup_2fa(self, user_id: int) -> dict:
        """Start 2FA setup for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Dict with secret, QR code, and URI
        """
        from app.models.all_models import User
        
        # Get user
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("User not found")
        
        # Generate new secret
        secret = self.service.generate_secret()
        
        # Generate QR code
        qr_code_base64 = self.service.generate_qr_code_base64(
            secret=secret,
            email=user.email,
            issuer=self.service.ISSUER_NAME
        )
        
        # Generate URI for manual entry
        uri = self.service.get_provisioning_uri(
            secret=secret,
            email=user.email,
            issuer=self.service.ISSUER_NAME
        )
        
        # Generate backup codes
        backup_codes = self.service.generate_backup_codes()
        hashed_backup_codes = self.service.hash_backup_codes(backup_codes)
        
        return {
            "secret": secret,
            "qr_code": qr_code_base64,
            "uri": uri,
            "backup_codes": backup_codes,  # Show once, user must save
            "hashed_backup_codes": hashed_backup_codes,  # For storage
        }
    
    async def enable_2fa(
        self,
        user_id: int,
        secret: str,
        code: str,
        hashed_backup_codes: list[str]
    ) -> bool:
        """Enable 2FA after verifying the setup.
        
        Args:
            user_id: User ID
            secret: TOTP secret
            code: Verification code from authenticator
            hashed_backup_codes: Hashed backup codes to store
            
        Returns:
            True if enabled successfully
        """
        # Verify code first
        if not self.service.verify_code(secret, code):
            return False
        
        from app.models.all_models import User
        import json
        
        # Update user with 2FA settings
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return False
        
        # Store 2FA settings (add fields to User model)
        user.two_factor_enabled = True
        user.two_factor_secret = secret
        user.two_factor_backup_codes = json.dumps(hashed_backup_codes)
        user.two_factor_enabled_at = datetime.now(timezone.utc)
        
        await self.db.commit()
        return True
    
    async def disable_2fa(self, user_id: int, code: str = None, password: str = None) -> bool:
        """Disable 2FA for a user.
        
        Args:
            user_id: User ID
            code: TOTP code (if 2FA enabled)
            password: User password (alternative verification)
            
        Returns:
            True if disabled successfully
        """
        from app.models.all_models import User
        from app.core.security import verify_password
        
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return False
        
        # Verify either TOTP code or password
        if code and user.two_factor_secret:
            if not self.service.verify_code(user.two_factor_secret, code):
                return False
        elif password:
            if not verify_password(password, user.hashed_password):
                return False
        else:
            return False
        
        # Disable 2FA
        user.two_factor_enabled = False
        user.two_factor_secret = None
        user.two_factor_backup_codes = None
        user.two_factor_disabled_at = datetime.now(timezone.utc)
        
        await self.db.commit()
        return True
    
    async def verify_2fa(
        self,
        user_id: int,
        code: str
    ) -> Tuple[bool, str]:
        """Verify 2FA code during login.
        
        Args:
            user_id: User ID
            code: TOTP code or backup code
            
        Returns:
            Tuple of (is_valid, message)
        """
        from app.models.all_models import User
        import json
        
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user or not user.two_factor_enabled:
            return False, "2FA not enabled"
        
        # Try TOTP code first
        if user.two_factor_secret:
            if self.service.verify_code(user.two_factor_secret, code):
                return True, "TOTP verified"
        
        # Try backup code
        if user.two_factor_backup_codes:
            hashed_codes = json.loads(user.two_factor_backup_codes)
            is_valid, remaining = self.service.verify_backup_code(
                code=code,
                hashed_codes=hashed_codes,
                remove_on_use=True
            )
            
            if is_valid:
                # Update remaining backup codes
                user.two_factor_backup_codes = json.dumps(remaining)
                await self.db.commit()
                
                remaining_count = len(remaining)
                if remaining_count < 3:
                    return True, f"Backup code used. Warning: Only {remaining_count} backup codes remaining"
                return True, "Backup code verified"
        
        return False, "Invalid code"
    
    async def regenerate_backup_codes(
        self,
        user_id: int,
        code: str
    ) -> Optional[list[str]]:
        """Regenerate backup codes for a user.
        
        Args:
            user_id: User ID
            code: Current TOTP code for verification
            
        Returns:
            List of new backup codes or None if verification failed
        """
        from app.models.all_models import User
        import json
        
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user or not user.two_factor_secret:
            return None
        
        # Verify current TOTP code
        if not self.service.verify_code(user.two_factor_secret, code):
            return None
        
        # Generate new backup codes
        backup_codes = self.service.generate_backup_codes()
        hashed_backup_codes = self.service.hash_backup_codes(backup_codes)
        
        # Store new codes
        user.two_factor_backup_codes = json.dumps(hashed_backup_codes)
        await self.db.commit()
        
        return backup_codes
    
    async def get_2fa_status(self, user_id: int) -> dict:
        """Get 2FA status for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Dict with 2FA status information
        """
        from app.models.all_models import User
        import json
        
        stmt = select(User).where(User.id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return {"enabled": False}
        
        backup_codes_count = 0
        if user.two_factor_backup_codes:
            backup_codes_count = len(json.loads(user.two_factor_backup_codes))
        
        return {
            "enabled": user.two_factor_enabled or False,
            "enabled_at": user.two_factor_enabled_at.isoformat() if user.two_factor_enabled_at else None,
            "backup_codes_remaining": backup_codes_count,
        }
