"""Parent Portal models for SchoolFlow Africa."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, JSON, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class ParentStudent(Base):
    """Association table for many-to-many parent-student relationship."""
    __tablename__ = "parent_students"
    __table_args__ = (
        UniqueConstraint("parent_id", "student_id", name="uq_parent_student"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("parents.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    relationship: Mapped[str] = mapped_column(String(30), default="parent")  # parent, guardian, etc.
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)  # Primary contact
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class ParentAccount(Base):
    """Account for parent portal access."""
    __tablename__ = "parent_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("parents.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Credentials
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # Magic link authentication
    magic_token: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    magic_token_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # JWT tokens
    refresh_token: Mapped[str | None] = mapped_column(String(500), nullable=True)
    refresh_token_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Preferences
    preferred_language: Mapped[str] = mapped_column(String(5), default="fr")
    notification_channels: Mapped[list[str]] = mapped_column(JSON, default=list)
    receive_sms_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    receive_email_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    parent: Mapped["Parent"] = relationship(back_populates="account")


class ParentNotification(Base):
    """Notification history for parents."""
    __tablename__ = "parent_notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("parents.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id", ondelete="SET NULL"), nullable=True)
    
    # Notification details
    type: Mapped[str] = mapped_column(String(30), nullable=False)  # grade, attendance, fee, message, announcement
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Related data
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # grade, fee_invoice, etc.
    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Status
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Channels
    sent_via_sms: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_via_email: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_via_push: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    parent: Mapped["Parent"] = relationship(back_populates="notifications")
    student: Mapped["Student | None"] = relationship(back_populates="parent_notifications")


class ParentMessage(Base):
    """Messages between parents and school staff."""
    __tablename__ = "parent_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("parents.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id", ondelete="SET NULL"), nullable=True)
    
    # Message content
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Sender info
    sender_type: Mapped[str] = mapped_column(String(20), nullable=False)  # parent, admin, teacher
    sender_id: Mapped[int] = mapped_column(Integer, nullable=False)  # User ID or Parent ID
    sender_name: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Cached name
    
    # Thread support
    thread_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)  # For grouping messages
    reply_to_id: Mapped[int | None] = mapped_column(ForeignKey("parent_messages.id", ondelete="SET NULL"), nullable=True)
    
    # Status
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Administrative
    priority: Mapped[str] = mapped_column(String(20), default="normal")  # low, normal, high, urgent
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)  # academic, financial, general, etc.
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    parent: Mapped["Parent"] = relationship(back_populates="messages")
    student: Mapped["Student | None"] = relationship(back_populates="parent_messages")
    reply_to: Mapped["ParentMessage | None"] = relationship(back_populates="replies", remote_side=[id])
    replies: Mapped[list["ParentMessage"]] = relationship(back_populates="reply_to", lazy="noload")


class ParentAccessToken(Base):
    """Portal access tokens for public links (e.g., report cards, fee receipts)."""
    __tablename__ = "parent_access_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("parents.id", ondelete="CASCADE"), nullable=False)
    
    # Token
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    token_type: Mapped[str] = mapped_column(String(30), nullable=False)  # report_card, fee_receipt, etc.
    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Related entity ID
    
    # Expiry
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # Usage tracking
    accessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    access_count: Mapped[int] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    parent: Mapped["Parent"] = relationship()
