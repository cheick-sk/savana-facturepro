"""Sales endpoints — SavanaFlow."""
from __future__ import annotations
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import Sale, User
from app.schemas.schemas import Paginated, SaleCreate, SaleOut
from app.services.pos_service import process_sale

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sales", tags=["Sales — POS"])


@router.get("", response_model=Paginated)
async def list_sales(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    store_id: int | None = None, shift_id: int | None = None,
    customer_id: int | None = None, status: str | None = None,
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user),
):
    q = select(Sale)
    if store_id:
        q = q.where(Sale.store_id == store_id)
    if shift_id:
        q = q.where(Sale.shift_id == shift_id)
    if customer_id:
        q = q.where(Sale.customer_id == customer_id)
    if status:
        q = q.where(Sale.status == status.upper())
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    result = await db.execute(q.order_by(Sale.created_at.desc()).offset((page - 1) * size).limit(size))
    return Paginated(
        items=[SaleOut.model_validate(s) for s in result.scalars().all()],
        total=total, page=page, size=size, pages=max(1, (total + size - 1) // size),
    )


@router.get("/{sale_id}", response_model=SaleOut)
async def get_sale(sale_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    s = (await db.execute(select(Sale).where(Sale.id == sale_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Sale not found")
    return SaleOut.model_validate(s)


@router.post("", response_model=SaleOut, status_code=201)
async def create_sale(
    data: SaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        sale = await process_sale(db, data, current_user.id)
        await db.commit()
        await db.refresh(sale)
        return SaleOut.model_validate(sale)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"Sale error: {e}", exc_info=True)
        raise HTTPException(500, "Error processing sale")
