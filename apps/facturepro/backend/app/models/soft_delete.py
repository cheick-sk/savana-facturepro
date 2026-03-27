"""
Soft Delete Mixin - Base class for soft delete functionality

This module provides a mixin that can be added to any SQLAlchemy model
to enable soft delete functionality. Soft deleted records are not actually
removed from the database but are marked as deleted with a timestamp.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, Boolean, Index
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import Query


class SoftDeleteMixin:
    """
    Mixin to add soft delete functionality to SQLAlchemy models.

    Usage:
        class MyModel(Base, SoftDeleteMixin):
            __tablename__ = 'my_table'
            id = Column(Integer, primary_key=True)
            name = Column(String)

    Features:
        - deleted_at: Timestamp when the record was soft deleted
        - is_deleted: Boolean flag for quick filtering
        - soft_delete(): Mark record as deleted
        - restore(): Restore a soft deleted record
        - hard_delete(): Actually delete the record from database
    """

    deleted_at = Column(DateTime, nullable=True, default=None)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)

    @declared_attr
    def __table_args__(cls):
        return (
            Index(f'ix_{cls.__tablename__}_deleted_at', 'deleted_at'),
        )

    def soft_delete(self) -> None:
        """Mark the record as soft deleted."""
        self.deleted_at = datetime.utcnow()
        self.is_deleted = True

    def restore(self) -> None:
        """Restore a soft deleted record."""
        self.deleted_at = None
        self.is_deleted = False

    @property
    def is_active(self) -> bool:
        """Check if record is active (not deleted)."""
        return not self.is_deleted


class SoftDeleteQuery(Query):
    """
    Custom query class that filters out soft deleted records by default.

    Usage:
        # In your model or base class:
        query_class = SoftDeleteQuery

        # Normal queries exclude deleted records:
        session.query(MyModel).all()  # Only active records

        # To include deleted records:
        session.query(MyModel).with_deleted().all()

        # To get only deleted records:
        session.query(MyModel).only_deleted().all()
    """

    def with_deleted(self) -> 'SoftDeleteQuery':
        """Include soft deleted records in the query."""
        return self._reset_deleted_filter()

    def only_deleted(self) -> 'SoftDeleteQuery':
        """Get only soft deleted records."""
        entity = self._primary_entity.mapper.class_
        if hasattr(entity, 'is_deleted'):
            return self.filter(entity.is_deleted == True)
        return self

    def _reset_deleted_filter(self) -> 'SoftDeleteQuery':
        """Remove the default soft delete filter."""
        # Return a regular query without the filter
        entity = self._primary_entity.mapper.class_
        return self.enable_assertions(False).filter()

    def __iter__(self):
        # Apply soft delete filter by default
        entity = self._primary_entity.mapper.class_
        if hasattr(entity, 'is_deleted'):
            return iter(self.filter(entity.is_deleted == False))
        return super().__iter__()


# Example of how to apply this to existing models
"""
# In your models file, add the mixin:

from sqlalchemy.ext.declarative import declared_attr
from app.models.soft_delete import SoftDeleteMixin

class User(Base, SoftDeleteMixin):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    first_name = Column(String)
    last_name = Column(String)
    # ... other fields

class Customer(Base, SoftDeleteMixin):
    __tablename__ = 'customers'

    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)
    # ... other fields

class Product(Base, SoftDeleteMixin):
    __tablename__ = 'products'

    id = Column(Integer, primary_key=True)
    name = Column(String)
    price = Column(Numeric(10, 2))
    # ... other fields

# In your repository/service layer:

# Soft delete a record
user = session.query(User).get(user_id)
user.soft_delete()
session.commit()

# Restore a deleted record
deleted_user = session.query(User).with_deleted().filter(User.id == user_id).first()
if deleted_user:
    deleted_user.restore()
    session.commit()

# Get all records including deleted
all_users = session.query(User).with_deleted().all()

# Get only deleted records
deleted_users = session.query(User).only_deleted().all()
"""
