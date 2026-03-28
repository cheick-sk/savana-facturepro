"""Employee management endpoints — SavanaFlow."""
from __future__ import annotations
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import User
from app.schemas.schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeeListOut,
    EmployeePermissionUpdate, EmployeePermissionOut,
    ClockInRequest, ClockOutRequest, ShiftRecordOut, ShiftRecordDetailOut, ActiveShiftOut,
    EmployeeCommissionOut, PayCommissionsRequest, CommissionReport,
    EmployeePerformanceOut, EmployeeHoursReport, EmployeeSalesReport,
    Paginated,
)
from app.services import employee_service as svc

router = APIRouter(prefix="/employees", tags=["Employees"])
shift_router = APIRouter(prefix="/shifts", tags=["Shifts"])
commission_router = APIRouter(prefix="/commissions", tags=["Commissions"])


# ── Employee CRUD ─────────────────────────────────────────────────────

@router.get("", response_model=Paginated)
async def list_employees(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    store_id: int | None = None,
    is_active: bool | None = None,
    position: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List employees with filters."""
    return await svc.list_employees(db, store_id, is_active, position, search, page, size)


@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get employee details."""
    emp = await svc.get_employee(db, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found")
    return EmployeeOut.model_validate(emp)


@router.post("", response_model=EmployeeOut, status_code=201)
async def create_employee(
    data: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Create a new employee."""
    try:
        emp = await svc.create_employee(db, data)
        await db.commit()
        await db.refresh(emp)
        return EmployeeOut.model_validate(emp)
    except Exception as e:
        await db.rollback()
        raise HTTPException(400, str(e))


@router.put("/{employee_id}", response_model=EmployeeOut)
async def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Update employee details."""
    try:
        emp = await svc.update_employee(db, employee_id, data)
        await db.commit()
        await db.refresh(emp)
        return EmployeeOut.model_validate(emp)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(400, str(e))


@router.delete("/{employee_id}")
async def deactivate_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Deactivate an employee (soft delete)."""
    try:
        emp = await svc.deactivate_employee(db, employee_id)
        await db.commit()
        return {"message": f"Employee {emp.employee_number} deactivated"}
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/{employee_id}/activate", response_model=EmployeeOut)
async def activate_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Reactivate a deactivated employee."""
    try:
        emp = await svc.activate_employee(db, employee_id)
        await db.commit()
        await db.refresh(emp)
        return EmployeeOut.model_validate(emp)
    except ValueError as e:
        raise HTTPException(404, str(e))


# ── Permissions ───────────────────────────────────────────────────────

@router.get("/{employee_id}/permissions", response_model=list[EmployeePermissionOut])
async def get_permissions(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get employee custom permissions."""
    perms = await svc.get_employee_permissions(db, employee_id)
    return [EmployeePermissionOut.model_validate(p) for p in perms]


@router.put("/{employee_id}/permissions", response_model=list[EmployeePermissionOut])
async def update_permissions(
    employee_id: int,
    permissions: list[EmployeePermissionUpdate],
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Update employee custom permissions."""
    try:
        perms = await svc.update_employee_permissions(db, employee_id, permissions)
        await db.commit()
        return [EmployeePermissionOut.model_validate(p) for p in perms]
    except ValueError as e:
        raise HTTPException(404, str(e))


# ── Performance ───────────────────────────────────────────────────────

@router.get("/{employee_id}/performance", response_model=EmployeePerformanceOut)
async def get_performance(
    employee_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get employee performance metrics."""
    try:
        return await svc.get_employee_performance(db, employee_id, start_date, end_date)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/performance/compare")
async def compare_employees(
    employee_ids: str = Query(..., description="Comma-separated employee IDs"),
    metric: str = Query("sales_total", description="Metric to compare by"),
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Compare performance across multiple employees."""
    ids = [int(id.strip()) for id in employee_ids.split(",")]
    return await svc.compare_employees(db, ids, metric, start_date, end_date)


# ── Commission by Employee ────────────────────────────────────────────

@router.get("/{employee_id}/commissions", response_model=Paginated)
async def get_employee_commissions(
    employee_id: int,
    is_paid: bool | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get commission history for an employee."""
    return await svc.get_employee_commissions(db, employee_id, is_paid, start_date, end_date, page, size)


# ── Reports ───────────────────────────────────────────────────────────

@router.get("/reports/hours")
async def get_hours_report(
    employee_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get hours worked report."""
    if employee_id:
        try:
            return await svc.get_hours_report(db, employee_id, start_date, end_date)
        except ValueError as e:
            raise HTTPException(404, str(e))
    else:
        # Return all active employees' hours
        result = await svc.list_employees(db, is_active=True, size=1000)
        reports = []
        for emp in result.items:
            try:
                report = await svc.get_hours_report(db, emp.id, start_date, end_date)
                reports.append(report)
            except:
                continue
        return reports


@router.get("/reports/sales")
async def get_sales_report(
    start_date: date | None = None,
    end_date: date | None = None,
    store_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get sales by employee report."""
    return await svc.get_sales_by_employee(db, start_date, end_date, store_id)


# ── Shift Management ──────────────────────────────────────────────────

@shift_router.post("/clock-in", response_model=ShiftRecordOut, status_code=201)
async def clock_in(
    data: ClockInRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Employee clock in."""
    try:
        shift = await svc.clock_in(db, data)
        await db.commit()
        await db.refresh(shift)
        return ShiftRecordOut.model_validate(shift)
    except ValueError as e:
        raise HTTPException(400, str(e))


@shift_router.post("/clock-out", response_model=ShiftRecordOut)
async def clock_out(
    data: ClockOutRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Employee clock out."""
    try:
        shift = await svc.clock_out(db, data)
        await db.commit()
        await db.refresh(shift)
        return ShiftRecordOut.model_validate(shift)
    except ValueError as e:
        raise HTTPException(400, str(e))


@shift_router.get("/active", response_model=list[ActiveShiftOut])
async def get_active_shifts(
    store_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get all active shifts."""
    shifts = await svc.get_active_shifts(db, store_id)
    return [ActiveShiftOut.model_validate(s) for s in shifts]


@shift_router.get("/history", response_model=Paginated)
async def get_shift_history(
    employee_id: int | None = None,
    store_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get shift history with filters."""
    return await svc.get_shift_history(db, employee_id, store_id, start_date, end_date, page, size)


@shift_router.get("/{shift_id}", response_model=ShiftRecordDetailOut)
async def get_shift_details(
    shift_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get shift details."""
    from sqlalchemy.orm import selectinload
    from app.models.all_models import ShiftRecord
    result = await db.execute(
        select(ShiftRecord).options(
            selectinload(ShiftRecord.employee), selectinload(ShiftRecord.store)
        ).where(ShiftRecord.id == shift_id)
    )
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(404, "Shift not found")
    return ShiftRecordDetailOut.model_validate(shift)


@shift_router.put("/{shift_id}")
async def update_shift(
    shift_id: int,
    notes: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Update shift notes."""
    from sqlalchemy import select
    from app.models.all_models import ShiftRecord
    result = await db.execute(select(ShiftRecord).where(ShiftRecord.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(404, "Shift not found")

    if notes:
        shift.notes = notes
    await db.commit()
    return {"message": "Shift updated"}


# ── Commission Management ─────────────────────────────────────────────

@commission_router.get("/unpaid", response_model=list[dict])
async def get_unpaid_commissions(
    employee_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get all unpaid commissions."""
    commissions = await svc.get_unpaid_commissions(db, employee_id)
    return [
        {
            "id": c.id,
            "employee_id": c.employee_id,
            "sale_id": c.sale_id,
            "sale_amount": float(c.sale_amount),
            "commission_rate": float(c.commission_rate),
            "commission_amount": float(c.commission_amount),
            "created_at": c.created_at.isoformat(),
        }
        for c in commissions
    ]


@commission_router.post("/pay")
async def pay_commissions(
    data: PayCommissionsRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Mark commissions as paid."""
    commissions = await svc.pay_commissions(db, data.commission_ids)
    await db.commit()
    return {
        "message": f"Paid {len(commissions)} commissions",
        "total_paid": sum(float(c.commission_amount) for c in commissions),
    }


@commission_router.get("/report", response_model=list[CommissionReport])
async def get_commission_report(
    employee_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get commission summary report."""
    return await svc.get_commission_report(db, employee_id, start_date, end_date)
