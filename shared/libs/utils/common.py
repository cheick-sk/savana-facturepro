"""Shared utilities for all backends."""
from __future__ import annotations

import logging
import sys
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


# ──────────────── Logging ────────────────
def configure_logging(level: str = "INFO", app_name: str = "app") -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format=f"%(asctime)s [{app_name}] %(levelname)s %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


# ──────────────── Pagination ────────────────
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int

    @classmethod
    def build(cls, items: list[Any], total: int, page: int, size: int) -> "PaginatedResponse[Any]":
        pages = max(1, (total + size - 1) // size)
        return cls(items=items, total=total, page=page, size=size, pages=pages)


# ──────────────── Exceptions ────────────────
class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found", 404)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, 403)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, 401)


class ConflictError(AppError):
    def __init__(self, message: str = "Conflict"):
        super().__init__(message, 409)
