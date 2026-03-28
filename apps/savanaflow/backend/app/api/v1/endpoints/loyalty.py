"""Advanced Loyalty Program API endpoints — SavanaFlow POS."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import User
from app.schemas.loyalty import (
    LoyaltyProgramCreate, LoyaltyProgramUpdate, LoyaltyProgramOut,
    LoyaltyTierCreate, LoyaltyTierUpdate, LoyaltyTierOut,
    LoyaltyRewardCreate, LoyaltyRewardUpdate, LoyaltyRewardOut,
    LoyaltyCardCreate, LoyaltyCardOut, CardLookupResult, LoyaltySaleResult,
    LoyaltyCardTransactionOut, LoyaltyRedemptionCreate, LoyaltyRedemptionOut,
    LoyaltyStats, SaleEarnPoints, SaleRedeemPoints,
)
from app.schemas.schemas import Paginated
from app.services.loyalty_service import (
    LoyaltyProgramService, LoyaltyTierService, LoyaltyRewardService,
    LoyaltyCardService, LoyaltyStatsService
)

router = APIRouter(prefix="/loyalty", tags=["Loyalty — Fidélité"])


# ═══════════════════════════════════════════════════════════════════
# PROGRAMS
# ═══════════════════════════════════════════════════════════════════

@router.post("/programs", response_model=LoyaltyProgramOut, status_code=status.HTTP_201_CREATED)
async def create_program(
    data: LoyaltyProgramCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Create a new loyalty program."""
    try:
        program = await LoyaltyProgramService.create_program(db, data)
        await db.commit()
        await db.refresh(program)
        return LoyaltyProgramOut.model_validate(program)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/programs", response_model=list[LoyaltyProgramOut])
async def list_programs(
    store_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List loyalty programs."""
    programs = await LoyaltyProgramService.get_programs(db, store_id, is_active)
    return [LoyaltyProgramOut.model_validate(p) for p in programs]


@router.get("/programs/{program_id}", response_model=LoyaltyProgramOut)
async def get_program(
    program_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get a loyalty program by ID."""
    program = await LoyaltyProgramService.get_program(db, program_id)
    if not program:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Program not found")
    return LoyaltyProgramOut.model_validate(program)


@router.put("/programs/{program_id}", response_model=LoyaltyProgramOut)
async def update_program(
    program_id: int,
    data: LoyaltyProgramUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Update a loyalty program."""
    try:
        program = await LoyaltyProgramService.update_program(db, program_id, data)
        await db.commit()
        await db.refresh(program)
        return LoyaltyProgramOut.model_validate(program)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.delete("/programs/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program(
    program_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Delete a loyalty program."""
    try:
        deleted = await LoyaltyProgramService.delete_program(db, program_id)
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Program not found")
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


# ═══════════════════════════════════════════════════════════════════
# TIERS
# ═══════════════════════════════════════════════════════════════════

@router.post("/programs/{program_id}/tiers", response_model=LoyaltyTierOut, status_code=status.HTTP_201_CREATED)
async def create_tier(
    program_id: int,
    data: LoyaltyTierCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Create a new tier for a program."""
    try:
        tier = await LoyaltyTierService.create_tier(db, program_id, data)
        await db.commit()
        await db.refresh(tier)
        return LoyaltyTierOut.model_validate(tier)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/programs/{program_id}/tiers", response_model=list[LoyaltyTierOut])
async def list_tiers(
    program_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List all tiers for a program."""
    tiers = await LoyaltyTierService.get_tiers(db, program_id)
    return [LoyaltyTierOut.model_validate(t) for t in tiers]


@router.put("/tiers/{tier_id}", response_model=LoyaltyTierOut)
async def update_tier(
    tier_id: int,
    data: LoyaltyTierUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Update a tier."""
    try:
        tier = await LoyaltyTierService.update_tier(db, tier_id, data)
        await db.commit()
        await db.refresh(tier)
        return LoyaltyTierOut.model_validate(tier)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.delete("/tiers/{tier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tier(
    tier_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Delete a tier."""
    try:
        deleted = await LoyaltyTierService.delete_tier(db, tier_id)
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Tier not found")
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


# ═══════════════════════════════════════════════════════════════════
# REWARDS
# ═══════════════════════════════════════════════════════════════════

@router.post("/programs/{program_id}/rewards", response_model=LoyaltyRewardOut, status_code=status.HTTP_201_CREATED)
async def create_reward(
    program_id: int,
    data: LoyaltyRewardCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Create a new reward."""
    try:
        reward = await LoyaltyRewardService.create_reward(db, program_id, data)
        await db.commit()
        await db.refresh(reward)
        return LoyaltyRewardOut.model_validate(reward)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/rewards", response_model=list[LoyaltyRewardOut])
async def list_rewards(
    program_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List rewards."""
    rewards = await LoyaltyRewardService.get_rewards(db, program_id, is_active)
    return [LoyaltyRewardOut.model_validate(r) for r in rewards]


@router.get("/rewards/{reward_id}", response_model=LoyaltyRewardOut)
async def get_reward(
    reward_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get a reward by ID."""
    reward = await LoyaltyRewardService.get_reward(db, reward_id)
    if not reward:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reward not found")
    return LoyaltyRewardOut.model_validate(reward)


@router.put("/rewards/{reward_id}", response_model=LoyaltyRewardOut)
async def update_reward(
    reward_id: int,
    data: LoyaltyRewardUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Update a reward."""
    try:
        reward = await LoyaltyRewardService.update_reward(db, reward_id, data)
        await db.commit()
        await db.refresh(reward)
        return LoyaltyRewardOut.model_validate(reward)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.delete("/rewards/{reward_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reward(
    reward_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Delete a reward."""
    try:
        deleted = await LoyaltyRewardService.delete_reward(db, reward_id)
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Reward not found")
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


# ═══════════════════════════════════════════════════════════════════
# CARDS
# ═══════════════════════════════════════════════════════════════════

@router.post("/cards/register", response_model=LoyaltyCardOut, status_code=status.HTTP_201_CREATED)
async def register_card(
    data: LoyaltyCardCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Register a customer in a loyalty program."""
    try:
        card = await LoyaltyCardService.create_card(db, data)
        await db.commit()
        await db.refresh(card)
        return LoyaltyCardOut.model_validate(card)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/cards", response_model=Paginated)
async def list_cards(
    program_id: int | None = Query(None),
    tier_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List loyalty cards with pagination."""
    cards, total = await LoyaltyCardService.get_cards(db, program_id, tier_id, is_active, search, page, size)
    return Paginated(
        items=[LoyaltyCardOut.model_validate(c) for c in cards],
        total=total,
        page=page,
        size=size,
        pages=max(1, (total + size - 1) // size),
    )


@router.get("/cards/{card_id}", response_model=LoyaltyCardOut)
async def get_card(
    card_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get a loyalty card by ID."""
    card = await LoyaltyCardService.get_card(db, card_id)
    if not card:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Card not found")
    return LoyaltyCardOut.model_validate(card)


@router.get("/cards/lookup/{card_number}", response_model=CardLookupResult)
async def lookup_card(
    card_number: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lookup a loyalty card by card number (for POS)."""
    try:
        result = await LoyaltyCardService.lookup_card(db, card_number)
        return result
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@router.post("/cards/{card_id}/earn", response_model=LoyaltySaleResult)
async def earn_points(
    card_id: int,
    sale_id: int = Query(...),
    sale_amount: float = Query(..., gt=0),
    description: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Earn points from a sale."""
    try:
        result = await LoyaltyCardService.earn_points(db, card_id, sale_id, sale_amount, description)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/cards/{card_id}/redeem", response_model=LoyaltySaleResult)
async def redeem_points(
    card_id: int,
    data: SaleRedeemPoints,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Redeem points for a discount."""
    try:
        result = await LoyaltyCardService.redeem_points(db, card_id, data.points_to_use)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/cards/{card_id}/redeem-reward", response_model=LoyaltyRedemptionOut, status_code=status.HTTP_201_CREATED)
async def redeem_reward(
    card_id: int,
    reward_id: int = Query(...),
    sale_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Redeem a reward for a card."""
    try:
        redemption = await LoyaltyCardService.redeem_reward(db, card_id, reward_id, sale_id)
        await db.commit()
        await db.refresh(redemption)
        return LoyaltyRedemptionOut.model_validate(redemption)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/cards/{card_id}/adjust", response_model=LoyaltyCardOut)
async def adjust_points(
    card_id: int,
    points: int = Query(...),
    description: str = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Manually adjust points (admin correction)."""
    try:
        card = await LoyaltyCardService.adjust_points(db, card_id, points, description)
        await db.commit()
        await db.refresh(card)
        return LoyaltyCardOut.model_validate(card)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/cards/{card_id}/transactions", response_model=Paginated)
async def card_transactions(
    card_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get transaction history for a card."""
    transactions, total = await LoyaltyCardService.get_transactions(db, card_id, page, size)
    return Paginated(
        items=[LoyaltyCardTransactionOut.model_validate(t) for t in transactions],
        total=total,
        page=page,
        size=size,
        pages=max(1, (total + size - 1) // size),
    )


# ═══════════════════════════════════════════════════════════════════
# POS INTEGRATION
# ═══════════════════════════════════════════════════════════════════

@router.post("/sale/earn", response_model=LoyaltySaleResult)
async def sale_earn_points(
    data: SaleEarnPoints,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Earn points from a sale (POS integration)."""
    try:
        card = await LoyaltyCardService.get_card_by_number(db, data.card_number)
        if not card:
            raise ValueError(f"Card {data.card_number} not found")
        result = await LoyaltyCardService.earn_points(db, card.id, data.sale_id, data.sale_amount)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/sale/redeem", response_model=LoyaltySaleResult)
async def sale_redeem_points(
    data: SaleRedeemPoints,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Redeem points in a sale (POS integration)."""
    try:
        card = await LoyaltyCardService.get_card_by_number(db, data.card_number)
        if not card:
            raise ValueError(f"Card {data.card_number} not found")

        # Calculate max redemption based on sale amount
        card_with_program = await LoyaltyCardService.get_card(db, card.id)
        if not card_with_program:
            raise ValueError("Card not found")

        program = await LoyaltyProgramService.get_program(db, card_with_program.program_id)
        if program:
            max_discount = data.sale_amount * (program.max_redemption_percent / 100)
            requested_discount = data.points_to_use * float(program.currency_per_point)
            if requested_discount > max_discount:
                max_points = int(max_discount / float(program.currency_per_point))
                raise ValueError(
                    f"Cannot redeem more than {program.max_redemption_percent}% of sale. "
                    f"Max points: {max_points}"
                )

        result = await LoyaltyCardService.redeem_points(db, card.id, data.points_to_use)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


# ═══════════════════════════════════════════════════════════════════
# STATISTICS
# ═══════════════════════════════════════════════════════════════════

@router.get("/stats", response_model=LoyaltyStats)
async def get_loyalty_stats(
    program_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get loyalty program statistics."""
    return await LoyaltyStatsService.get_stats(db, program_id)
