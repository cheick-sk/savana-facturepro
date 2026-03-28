"""Employee management service — SavanaFlow Production Edition."""
from __future__ import annotations

import logging
from datetime import datetime, timezone, date, timedelta
from typing import Any

from sqlalchemy import func, select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.all_models import (
    Employee, EmployeeStore, ShiftRecord, EmployeeCommission, EmployeePermission,
    Store, Sale, SaleItem, Product, Refund,
)
from app.schemas.schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeeListOut,
    EmployeePermissionUpdate, ClockInRequest, ClockOutRequest,
    ShiftRecordOut, ShiftRecordDetailOut, ActiveShiftOut,
    EmployeePerformanceOut, EmployeeHoursReport, EmployeeSalesReport,
    CommissionReport, Paginated,
)

logger = logging.getLogger(__name__)

# Position-based default permissions
POSITION_PERMISSIONS = {
    "vendeur": {
        "can_void_sale": False,
        "can_refund": False,
        "can_apply_discount": False,
        "max_discount_percent": 0,
        "can_open_close_shift": False,
        "can_manage_products": False,
        "can_view_reports": False,
        "can_manage_employees": False,
    },
    "caissier": {
        "can_void_sale": True,
        "can_refund": False,
        "can_apply_discount": True,
        "max_discount_percent": 5,
        "can_open_close_shift": True,
        "can_manage_products": False,
        "can_view_reports": False,
        "can_manage_employees": False,
    },
    "manager": {
        "can_void_sale": True,
        "can_refund": True,
        "can_apply_discount": True,
        "max_discount_percent": 15,
        "can_open_close_shift": True,
        "can_manage_products": True,
        "can_view_reports": True,
        "can_manage_employees": False,
    },
    "gerant": {
        "can_void_sale": True,
        "can_refund": True,
        "can_apply_discount": True,
        "max_discount_percent": 100,
        "can_open_close_shift": True,
        "can_manage_products": True,
        "can_view_reports": True,
        "can_manage_employees": True,
    },
}


def _generate_employee_number(count: int) -> str:
    """Generate a unique employee number."""
    return f"EMP-{datetime.now(timezone.utc).strftime('%Y%m')}-{count + 1:04d}"


async def create_employee(db: AsyncSession, data: EmployeeCreate) -> Employee:
    """Create a new employee with assigned stores."""
    # Get count for employee number
    count = (await db.execute(select(func.count()).select_from(Employee))).scalar() or 0
    employee_number = _generate_employee_number(count)

    # Get position defaults
    position_defaults = POSITION_PERMISSIONS.get(data.position, POSITION_PERMISSIONS["vendeur"])

    # Create employee
    employee = Employee(
        user_id=data.user_id,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        employee_number=employee_number,
        position=data.position,
        hire_date=data.hire_date,
        # Use provided values or position defaults
        can_void_sale=data.can_void_sale if data.can_void_sale != position_defaults["can_void_sale"] else position_defaults["can_void_sale"],
        can_refund=data.can_refund if data.can_refund != position_defaults["can_refund"] else position_defaults["can_refund"],
        can_apply_discount=data.can_apply_discount if data.can_apply_discount != position_defaults["can_apply_discount"] else position_defaults["can_apply_discount"],
        max_discount_percent=data.max_discount_percent,
        can_open_close_shift=data.can_open_close_shift if data.can_open_close_shift != position_defaults["can_open_close_shift"] else position_defaults["can_open_close_shift"],
        can_manage_products=data.can_manage_products if data.can_manage_products != position_defaults["can_manage_products"] else position_defaults["can_manage_products"],
        can_view_reports=data.can_view_reports if data.can_view_reports != position_defaults["can_view_reports"] else position_defaults["can_view_reports"],
        can_manage_employees=data.can_manage_employees if data.can_manage_employees != position_defaults["can_manage_employees"] else position_defaults["can_manage_employees"],
        # Commission settings
        commission_enabled=data.commission_enabled,
        commission_type=data.commission_type,
        commission_value=data.commission_value,
        # Salary info
        base_salary=data.base_salary,
        salary_frequency=data.salary_frequency,
    )
    db.add(employee)
    await db.flush()

    # Assign stores
    if data.store_ids:
        for store_id in data.store_ids:
            is_primary = store_id == data.primary_store_id if data.primary_store_id else store_id == data.store_ids[0]
            db.add(EmployeeStore(
                employee_id=employee.id,
                store_id=store_id,
                is_primary=is_primary,
            ))

    await db.refresh(employee)
    logger.info(f"Created employee {employee.employee_number} - {employee.full_name}")
    return employee


async def get_employee(db: AsyncSession, employee_id: int) -> Employee | None:
    """Get employee by ID with relationships."""
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.assigned_stores), selectinload(Employee.permissions))
        .where(Employee.id == employee_id)
    )
    return result.scalar_one_or_none()


async def list_employees(
    db: AsyncSession,
    store_id: int | None = None,
    is_active: bool | None = None,
    position: str | None = None,
    search: str | None = None,
    page: int = 1,
    size: int = 20,
) -> Paginated:
    """List employees with filters."""
    query = select(Employee).options(selectinload(Employee.assigned_stores))

    # Filters
    if is_active is not None:
        query = query.where(Employee.is_active == is_active)
    if position:
        query = query.where(Employee.position == position)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Employee.first_name.ilike(search_term),
                Employee.last_name.ilike(search_term),
                Employee.employee_number.ilike(search_term),
                Employee.phone.ilike(search_term),
            )
        )
    if store_id:
        query = query.join(EmployeeStore).where(EmployeeStore.store_id == store_id)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    query = query.order_by(Employee.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    employees = result.scalars().all()

    return Paginated(
        items=[EmployeeListOut.model_validate(e) for e in employees],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


async def update_employee(db: AsyncSession, employee_id: int, data: EmployeeUpdate) -> Employee:
    """Update employee details."""
    employee = await get_employee(db, employee_id)
    if not employee:
        raise ValueError(f"Employee {employee_id} not found")

    update_data = data.model_dump(exclude_unset=True, exclude={"store_ids", "primary_store_id"})

    for field, value in update_data.items():
        setattr(employee, field, value)

    # Update store assignments
    if data.store_ids is not None:
        # Remove existing assignments
        await db.execute(
            select(EmployeeStore).where(EmployeeStore.employee_id == employee_id)
        )
        existing = (await db.execute(
            select(EmployeeStore).where(EmployeeStore.employee_id == employee_id)
        )).scalars().all()
        for es in existing:
            await db.delete(es)

        # Add new assignments
        for store_id in data.store_ids:
            is_primary = store_id == data.primary_store_id if data.primary_store_id else store_id == data.store_ids[0]
            db.add(EmployeeStore(
                employee_id=employee.id,
                store_id=store_id,
                is_primary=is_primary,
            ))

    await db.flush()
    await db.refresh(employee)
    logger.info(f"Updated employee {employee.employee_number}")
    return employee


async def deactivate_employee(db: AsyncSession, employee_id: int) -> Employee:
    """Deactivate an employee (soft delete)."""
    employee = await get_employee(db, employee_id)
    if not employee:
        raise ValueError(f"Employee {employee_id} not found")

    employee.is_active = False
    employee.termination_date = date.today()
    await db.flush()
    await db.refresh(employee)
    logger.info(f"Deactivated employee {employee.employee_number}")
    return employee


async def activate_employee(db: AsyncSession, employee_id: int) -> Employee:
    """Reactivate an employee."""
    employee = await get_employee(db, employee_id)
    if not employee:
        raise ValueError(f"Employee {employee_id} not found")

    employee.is_active = True
    employee.termination_date = None
    await db.flush()
    await db.refresh(employee)
    logger.info(f"Reactivated employee {employee.employee_number}")
    return employee


# ── Permission Management ────────────────────────────────────────

async def get_employee_permissions(db: AsyncSession, employee_id: int) -> list[EmployeePermission]:
    """Get all permissions for an employee."""
    result = await db.execute(
        select(EmployeePermission).where(EmployeePermission.employee_id == employee_id)
    )
    return list(result.scalars().all())


async def update_employee_permissions(
    db: AsyncSession, employee_id: int, permissions: list[EmployeePermissionUpdate]
) -> list[EmployeePermission]:
    """Update employee custom permissions."""
    employee = await get_employee(db, employee_id)
    if not employee:
        raise ValueError(f"Employee {employee_id} not found")

    # Clear existing custom permissions
    existing = await get_employee_permissions(db, employee_id)
    for perm in existing:
        await db.delete(perm)

    # Add new permissions
    new_permissions = []
    for perm_data in permissions:
        perm = EmployeePermission(
            employee_id=employee_id,
            permission=perm_data.permission,
            is_granted=perm_data.is_granted,
        )
        db.add(perm)
        new_permissions.append(perm)

    await db.flush()
    logger.info(f"Updated permissions for employee {employee.employee_number}")
    return new_permissions


async def check_employee_permission(db: AsyncSession, employee_id: int, permission: str) -> bool:
    """Check if employee has a specific permission."""
    # Check custom permissions first
    result = await db.execute(
        select(EmployeePermission).where(
            EmployeePermission.employee_id == employee_id,
            EmployeePermission.permission == permission,
        )
    )
    custom_perm = result.scalar_one_or_none()
    if custom_perm:
        return custom_perm.is_granted

    # Check built-in permissions based on permission string
    employee = await get_employee(db, employee_id)
    if not employee:
        return False

    permission_mapping = {
        "pos.void": employee.can_void_sale,
        "pos.refund": employee.can_refund,
        "pos.discount": employee.can_apply_discount,
        "shift.open_close": employee.can_open_close_shift,
        "products.manage": employee.can_manage_products,
        "reports.view": employee.can_view_reports,
        "employees.manage": employee.can_manage_employees,
    }

    return permission_mapping.get(permission, False)


# ── Shift Management ──────────────────────────────────────────────

async def clock_in(db: AsyncSession, data: ClockInRequest) -> ShiftRecord:
    """Employee clock in."""
    # Check if employee has an active shift
    active_shift = await get_active_shift_for_employee(db, data.employee_id)
    if active_shift:
        raise ValueError(f"Employee already has an active shift (ID: {active_shift.id})")

    # Verify store assignment
    store_assignment = await db.execute(
        select(EmployeeStore).where(
            EmployeeStore.employee_id == data.employee_id,
            EmployeeStore.store_id == data.store_id,
        )
    )
    if not store_assignment.scalar_one_or_none():
        raise ValueError(f"Employee is not assigned to store {data.store_id}")

    shift_record = ShiftRecord(
        employee_id=data.employee_id,
        store_id=data.store_id,
        shift_id=data.shift_id,
        clock_in=datetime.now(timezone.utc),
        opening_cash=data.opening_cash,
        notes=data.notes,
        status="active",
    )
    db.add(shift_record)
    await db.flush()
    await db.refresh(shift_record)

    employee = await get_employee(db, data.employee_id)
    logger.info(f"Employee {employee.employee_number if employee else data.employee_id} clocked in")
    return shift_record


async def clock_out(db: AsyncSession, data: ClockOutRequest) -> ShiftRecord:
    """Employee clock out."""
    result = await db.execute(
        select(ShiftRecord).where(ShiftRecord.id == data.shift_record_id)
    )
    shift_record = result.scalar_one_or_none()
    if not shift_record:
        raise ValueError(f"Shift record {data.shift_record_id} not found")
    if shift_record.clock_out:
        raise ValueError("Shift already closed")

    shift_record.clock_out = datetime.now(timezone.utc)
    shift_record.closing_cash = data.closing_cash
    shift_record.notes = f"{shift_record.notes or ''}\n{data.notes or ''}".strip()

    # Calculate cash difference
    if shift_record.opening_cash is not None:
        expected = float(shift_record.opening_cash) + float(shift_record.sales_total)
        shift_record.cash_difference = float(data.closing_cash) - expected

    shift_record.status = "closed"
    await db.flush()
    await db.refresh(shift_record)

    logger.info(f"Employee {shift_record.employee_id} clocked out")
    return shift_record


async def get_active_shift_for_employee(db: AsyncSession, employee_id: int) -> ShiftRecord | None:
    """Get active shift for an employee."""
    result = await db.execute(
        select(ShiftRecord)
        .options(selectinload(ShiftRecord.employee), selectinload(ShiftRecord.store))
        .where(
            ShiftRecord.employee_id == employee_id,
            ShiftRecord.status == "active",
            ShiftRecord.clock_out.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def get_active_shifts(db: AsyncSession, store_id: int | None = None) -> list[ShiftRecord]:
    """Get all active shifts, optionally filtered by store."""
    query = select(ShiftRecord).options(
        selectinload(ShiftRecord.employee), selectinload(ShiftRecord.store)
    ).where(ShiftRecord.status == "active", ShiftRecord.clock_out.is_(None))

    if store_id:
        query = query.where(ShiftRecord.store_id == store_id)

    result = await db.execute(query)
    return list(result.scalars().all())


async def get_shift_history(
    db: AsyncSession,
    employee_id: int | None = None,
    store_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    page: int = 1,
    size: int = 20,
) -> Paginated:
    """Get shift history with filters."""
    query = select(ShiftRecord).options(
        selectinload(ShiftRecord.employee), selectinload(ShiftRecord.store)
    )

    if employee_id:
        query = query.where(ShiftRecord.employee_id == employee_id)
    if store_id:
        query = query.where(ShiftRecord.store_id == store_id)
    if start_date:
        query = query.where(ShiftRecord.clock_in >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.where(ShiftRecord.clock_in <= datetime.combine(end_date, datetime.max.time()))

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    query = query.order_by(ShiftRecord.clock_in.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    shifts = result.scalars().all()

    return Paginated(
        items=[ShiftRecordDetailOut.model_validate(s) for s in shifts],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


async def update_shift_stats(db: AsyncSession, shift_record_id: int) -> None:
    """Update shift statistics from sales."""
    result = await db.execute(
        select(ShiftRecord).where(ShiftRecord.id == shift_record_id)
    )
    shift_record = result.scalar_one_or_none()
    if not shift_record:
        return

    # Get sales for this shift
    sales_result = await db.execute(
        select(Sale).where(
            Sale.employee_id == shift_record.employee_id,
            Sale.created_at >= shift_record.clock_in,
            or_(Sale.created_at <= shift_record.clock_out, shift_record.clock_out.is_(None)),
        )
    )
    sales = sales_result.scalars().all()

    shift_record.sales_count = len(sales)
    shift_record.sales_total = sum(float(s.total_amount) for s in sales)

    # Get refunds
    refunds_result = await db.execute(
        select(Refund).join(Sale).where(
            Sale.employee_id == shift_record.employee_id,
            Refund.created_at >= shift_record.clock_in,
            or_(Refund.created_at <= shift_record.clock_out, shift_record.clock_out.is_(None)),
        )
    )
    refunds = refunds_result.scalars().all()

    shift_record.refunds_count = len(refunds)
    shift_record.refunds_total = sum(float(r.refund_amount) for r in refunds)

    await db.flush()


# ── Commission Management ────────────────────────────────────────

async def calculate_commission(db: AsyncSession, employee: Employee, sale: Sale) -> EmployeeCommission | None:
    """Calculate commission for a sale."""
    if not employee.commission_enabled:
        return None

    sale_amount = float(sale.total_amount)
    if employee.commission_type == "percent":
        commission_rate = float(employee.commission_value)
        commission_amount = sale_amount * commission_rate / 100
    else:  # fixed
        commission_rate = 100  # Indicates fixed commission
        commission_amount = float(employee.commission_value)

    commission = EmployeeCommission(
        employee_id=employee.id,
        sale_id=sale.id,
        sale_amount=sale_amount,
        commission_rate=commission_rate,
        commission_amount=commission_amount,
    )
    db.add(commission)

    # Update employee totals
    employee.total_commission = float(employee.total_commission) + commission_amount
    employee.total_sales = float(employee.total_sales) + sale_amount

    await db.flush()
    await db.refresh(commission)

    logger.info(f"Commission {commission_amount} calculated for employee {employee.employee_number}")
    return commission


async def get_employee_commissions(
    db: AsyncSession,
    employee_id: int,
    is_paid: bool | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    page: int = 1,
    size: int = 20,
) -> Paginated:
    """Get commission history for an employee."""
    query = select(EmployeeCommission).options(
        selectinload(EmployeeCommission.employee)
    ).where(EmployeeCommission.employee_id == employee_id)

    if is_paid is not None:
        query = query.where(EmployeeCommission.is_paid == is_paid)
    if start_date:
        query = query.where(EmployeeCommission.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.where(EmployeeCommission.created_at <= datetime.combine(end_date, datetime.max.time()))

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    query = query.order_by(EmployeeCommission.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    commissions = result.scalars().all()

    return Paginated(
        items=commissions,
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size,
    )


async def get_unpaid_commissions(db: AsyncSession, employee_id: int | None = None) -> list[EmployeeCommission]:
    """Get all unpaid commissions."""
    query = select(EmployeeCommission).options(
        selectinload(EmployeeCommission.employee)
    ).where(EmployeeCommission.is_paid == False)

    if employee_id:
        query = query.where(EmployeeCommission.employee_id == employee_id)

    result = await db.execute(query)
    return list(result.scalars().all())


async def pay_commissions(db: AsyncSession, commission_ids: list[int]) -> list[EmployeeCommission]:
    """Mark commissions as paid."""
    result = await db.execute(
        select(EmployeeCommission).where(EmployeeCommission.id.in_(commission_ids))
    )
    commissions = result.scalars().all()

    paid_at = datetime.now(timezone.utc)
    for commission in commissions:
        commission.is_paid = True
        commission.paid_at = paid_at

    await db.flush()
    logger.info(f"Paid {len(commissions)} commissions")
    return list(commissions)


async def get_commission_report(
    db: AsyncSession,
    employee_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[CommissionReport]:
    """Get commission summary report."""
    query = select(
        EmployeeCommission.employee_id,
        func.sum(EmployeeCommission.commission_amount).label("total_commission"),
        func.sum(EmployeeCommission.sale_amount).label("sales_total"),
        func.count(EmployeeCommission.id).label("commission_count"),
    ).join(Employee).group_by(EmployeeCommission.employee_id)

    # Add filters
    filters = []
    if employee_id:
        filters.append(EmployeeCommission.employee_id == employee_id)
    if start_date:
        filters.append(EmployeeCommission.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        filters.append(EmployeeCommission.created_at <= datetime.combine(end_date, datetime.max.time()))

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    rows = result.all()

    reports = []
    for row in rows:
        emp = await get_employee(db, row.employee_id)
        if not emp:
            continue

        # Get paid/unpaid breakdown
        paid_result = await db.execute(
            select(func.sum(EmployeeCommission.commission_amount)).where(
                EmployeeCommission.employee_id == row.employee_id,
                EmployeeCommission.is_paid == True,
            )
        )
        paid = float(paid_result.scalar() or 0)

        reports.append(CommissionReport(
            employee_id=row.employee_id,
            employee_name=emp.full_name,
            total_commission=float(row.total_commission or 0),
            paid_commission=paid,
            unpaid_commission=float(row.total_commission or 0) - paid,
            commission_count=row.commission_count,
            sales_total=float(row.sales_total or 0),
        ))

    return reports


# ── Performance Reports ──────────────────────────────────────────

async def get_employee_performance(
    db: AsyncSession,
    employee_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
) -> EmployeePerformanceOut:
    """Get detailed performance metrics for an employee."""
    employee = await get_employee(db, employee_id)
    if not employee:
        raise ValueError(f"Employee {employee_id} not found")

    # Default to last 30 days
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Get sales
    sales_result = await db.execute(
        select(Sale).where(
            Sale.employee_id == employee_id,
            Sale.created_at >= datetime.combine(start_date, datetime.min.time()),
            Sale.created_at <= datetime.combine(end_date, datetime.max.time()),
        )
    )
    sales = sales_result.scalars().all()

    # Get refunds
    refunds_result = await db.execute(
        select(Refund).join(Sale).where(
            Sale.employee_id == employee_id,
            Refund.created_at >= datetime.combine(start_date, datetime.min.time()),
            Refund.created_at <= datetime.combine(end_date, datetime.max.time()),
        )
    )
    refunds = refunds_result.scalars().all()

    # Get shifts
    shifts_result = await db.execute(
        select(ShiftRecord).where(
            ShiftRecord.employee_id == employee_id,
            ShiftRecord.clock_in >= datetime.combine(start_date, datetime.min.time()),
            ShiftRecord.clock_in <= datetime.combine(end_date, datetime.max.time()),
        )
    )
    shifts = shifts_result.scalars().all()

    # Calculate hours worked
    hours_worked = 0
    for shift in shifts:
        if shift.clock_out:
            delta = shift.clock_out - shift.clock_in
            hours_worked += delta.total_seconds() / 3600

    # Get commissions earned
    commissions_result = await db.execute(
        select(func.sum(EmployeeCommission.commission_amount)).where(
            EmployeeCommission.employee_id == employee_id,
            EmployeeCommission.created_at >= datetime.combine(start_date, datetime.min.time()),
            EmployeeCommission.created_at <= datetime.combine(end_date, datetime.max.time()),
        )
    )
    commission_earned = float(commissions_result.scalar() or 0)

    # Get top products
    product_sales = {}
    for sale in sales:
        for item in sale.items:
            if item.product_id not in product_sales:
                product_sales[item.product_id] = {"count": 0, "total": 0}
            product_sales[item.product_id]["count"] += float(item.quantity)
            product_sales[item.product_id]["total"] += float(item.line_total)

    # Get product names
    top_products = []
    for product_id, stats in sorted(product_sales.items(), key=lambda x: x[1]["total"], reverse=True)[:10]:
        product_result = await db.execute(select(Product).where(Product.id == product_id))
        product = product_result.scalar_one_or_none()
        if product:
            top_products.append({
                "product_id": product_id,
                "product_name": product.name,
                "quantity_sold": stats["count"],
                "total_sales": stats["total"],
            })

    # Sales by day
    sales_by_day = {}
    for sale in sales:
        day = sale.created_at.date().isoformat()
        if day not in sales_by_day:
            sales_by_day[day] = {"count": 0, "total": 0}
        sales_by_day[day]["count"] += 1
        sales_by_day[day]["total"] += float(sale.total_amount)

    # Sales by hour
    sales_by_hour = {}
    for sale in sales:
        hour = sale.created_at.hour
        if hour not in sales_by_hour:
            sales_by_hour[hour] = {"count": 0, "total": 0}
        sales_by_hour[hour]["count"] += 1
        sales_by_hour[hour]["total"] += float(sale.total_amount)

    sales_count = len(sales)
    sales_total = sum(float(s.total_amount) for s in sales)

    return EmployeePerformanceOut(
        employee_id=employee_id,
        employee_name=employee.full_name,
        period=f"{start_date} to {end_date}",
        sales_count=sales_count,
        sales_total=sales_total,
        refunds_count=len(refunds),
        refunds_total=sum(float(r.refund_amount) for r in refunds),
        commission_earned=commission_earned,
        hours_worked=round(hours_worked, 2),
        avg_sale_value=sales_total / sales_count if sales_count > 0 else 0,
        top_products=top_products,
        sales_by_day=[{"date": k, **v} for k, v in sorted(sales_by_day.items())],
        sales_by_hour=[{"hour": k, **v} for k, v in sorted(sales_by_hour.items())],
    )


async def compare_employees(
    db: AsyncSession,
    employee_ids: list[int],
    metric: str = "sales_total",
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, Any]:
    """Compare performance across multiple employees."""
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    employees_data = []
    for employee_id in employee_ids:
        try:
            perf = await get_employee_performance(db, employee_id, start_date, end_date)
            employees_data.append({
                "employee_id": employee_id,
                "employee_name": perf.employee_name,
                "sales_count": perf.sales_count,
                "sales_total": perf.sales_total,
                "refunds_count": perf.refunds_count,
                "refunds_total": perf.refunds_total,
                "commission_earned": perf.commission_earned,
                "hours_worked": perf.hours_worked,
                "avg_sale_value": perf.avg_sale_value,
            })
        except ValueError:
            continue

    # Sort by metric
    if metric in ["sales_total", "sales_count", "commission_earned", "hours_worked"]:
        employees_data.sort(key=lambda x: x.get(metric, 0), reverse=True)

    return {
        "employees": employees_data,
        "metric": metric,
        "period": f"{start_date} to {end_date}",
    }


async def get_hours_report(
    db: AsyncSession,
    employee_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
) -> EmployeeHoursReport:
    """Get hours worked report for an employee."""
    employee = await get_employee(db, employee_id)
    if not employee:
        raise ValueError(f"Employee {employee_id} not found")

    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    shifts_result = await db.execute(
        select(ShiftRecord).where(
            ShiftRecord.employee_id == employee_id,
            ShiftRecord.clock_in >= datetime.combine(start_date, datetime.min.time()),
            ShiftRecord.clock_in <= datetime.combine(end_date, datetime.max.time()),
        ).order_by(ShiftRecord.clock_in.desc())
    )
    shifts = shifts_result.scalars().all()

    total_hours = 0
    shifts_data = []
    for shift in shifts:
        if shift.clock_out:
            delta = shift.clock_out - shift.clock_in
            hours = delta.total_seconds() / 3600
            total_hours += hours
            shifts_data.append(ShiftRecordOut.model_validate(shift))

    shifts_count = len(shifts)
    avg_hours = total_hours / shifts_count if shifts_count > 0 else 0
    overtime = max(0, total_hours - (8 * shifts_count))  # Assuming 8h standard

    return EmployeeHoursReport(
        employee_id=employee_id,
        employee_name=employee.full_name,
        total_hours=round(total_hours, 2),
        shifts_count=shifts_count,
        avg_hours_per_shift=round(avg_hours, 2),
        overtime_hours=round(overtime, 2),
        shifts=shifts_data,
    )


async def get_sales_by_employee(
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
    store_id: int | None = None,
) -> list[dict[str, Any]]:
    """Get sales summary grouped by employee."""
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    query = select(Sale).options(selectinload(Sale.employee)).where(
        Sale.created_at >= datetime.combine(start_date, datetime.min.time()),
        Sale.created_at <= datetime.combine(end_date, datetime.max.time()),
    )

    if store_id:
        query = query.where(Sale.store_id == store_id)

    result = await db.execute(query)
    sales = result.scalars().all()

    # Group by employee
    employee_sales = {}
    for sale in sales:
        emp_id = sale.employee_id
        if emp_id not in employee_sales:
            employee_sales[emp_id] = {
                "employee_id": emp_id,
                "employee_name": sale.employee.full_name if sale.employee else "Unknown",
                "sales_count": 0,
                "sales_total": 0,
            }
        employee_sales[emp_id]["sales_count"] += 1
        employee_sales[emp_id]["sales_total"] += float(sale.total_amount)

    return sorted(employee_sales.values(), key=lambda x: x["sales_total"], reverse=True)
