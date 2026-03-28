"""Advanced Loyalty Program Service — SavanaFlow POS."""
from __future__ import annotations

import logging
import secrets
import random
import string
from datetime import datetime, timezone, date, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import func, select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.loyalty import (
    LoyaltyProgram, LoyaltyTier, LoyaltyReward, LoyaltyCard,
    LoyaltyCardTransaction, LoyaltyRedemption, LoyaltyReferral
)
from app.models.all_models import POSCustomer, Sale
from app.schemas.loyalty import (
    LoyaltyProgramCreate, LoyaltyProgramUpdate,
    LoyaltyTierCreate, LoyaltyTierUpdate,
    LoyaltyRewardCreate, LoyaltyRewardUpdate,
    LoyaltyCardCreate, CardLookupResult, LoyaltySaleResult,
    LoyaltyStats, ReferralCreate
)

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


def _generate_card_number() -> str:
    """Generate a unique loyalty card number."""
    prefix = "SF"
    random_part = ''.join(random.choices(string.digits, k=10))
    return f"{prefix}{random_part}"


def _generate_voucher_code() -> str:
    """Generate a unique voucher code."""
    prefix = "RWD"
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"{prefix}{random_part}"


def _generate_referral_code() -> str:
    """Generate a unique referral code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


# ═══════════════════════════════════════════════════════════════════
# LOYALTY PROGRAM SERVICE
# ═══════════════════════════════════════════════════════════════════

class LoyaltyProgramService:
    """Service for managing loyalty programs."""

    @staticmethod
    async def create_program(db: AsyncSession, data: LoyaltyProgramCreate) -> LoyaltyProgram:
        """Create a new loyalty program."""
        program = LoyaltyProgram(**data.model_dump())
        db.add(program)
        await db.flush()
        await db.refresh(program)

        # Create default tiers
        default_tiers = [
            {"name": "Standard", "min_points": 0, "discount_percent": 0, "points_multiplier": 1.0, "color": "#6B7280", "order": 0},
            {"name": "Silver", "min_points": 500, "discount_percent": 5, "points_multiplier": 1.25, "color": "#9CA3AF", "order": 1},
            {"name": "Gold", "min_points": 2000, "discount_percent": 10, "points_multiplier": 1.5, "color": "#F59E0B", "order": 2},
            {"name": "Platinum", "min_points": 5000, "discount_percent": 15, "points_multiplier": 2.0, "color": "#8B5CF6", "order": 3},
        ]
        for tier_data in default_tiers:
            tier = LoyaltyTier(program_id=program.id, **tier_data)
            db.add(tier)

        await db.flush()
        logger.info(f"Created loyalty program: {program.name}")
        return program

    @staticmethod
    async def get_program(db: AsyncSession, program_id: int) -> LoyaltyProgram | None:
        """Get a loyalty program by ID with tiers."""
        result = await db.execute(
            select(LoyaltyProgram)
            .options(selectinload(LoyaltyProgram.tiers))
            .where(LoyaltyProgram.id == program_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_programs(
        db: AsyncSession, store_id: int | None = None, is_active: bool | None = None
    ) -> list[LoyaltyProgram]:
        """List loyalty programs."""
        query = select(LoyaltyProgram).options(selectinload(LoyaltyProgram.tiers))
        if store_id is not None:
            query = query.where(or_(LoyaltyProgram.store_id == store_id, LoyaltyProgram.store_id.is_(None)))
        if is_active is not None:
            query = query.where(LoyaltyProgram.is_active == is_active)
        query = query.order_by(LoyaltyProgram.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_program(db: AsyncSession, program_id: int, data: LoyaltyProgramUpdate) -> LoyaltyProgram:
        """Update a loyalty program."""
        program = await LoyaltyProgramService.get_program(db, program_id)
        if not program:
            raise ValueError(f"Program {program_id} not found")
        for key, value in data.model_dump(exclude_none=True).items():
            setattr(program, key, value)
        await db.flush()
        await db.refresh(program)
        return program

    @staticmethod
    async def delete_program(db: AsyncSession, program_id: int) -> bool:
        """Delete a loyalty program."""
        program = await LoyaltyProgramService.get_program(db, program_id)
        if not program:
            return False
        await db.delete(program)
        await db.flush()
        return True


# ═══════════════════════════════════════════════════════════════════
# LOYALTY TIER SERVICE
# ═══════════════════════════════════════════════════════════════════

class LoyaltyTierService:
    """Service for managing loyalty tiers."""

    @staticmethod
    async def create_tier(db: AsyncSession, program_id: int, data: LoyaltyTierCreate) -> LoyaltyTier:
        """Create a new tier for a program."""
        tier = LoyaltyTier(program_id=program_id, **data.model_dump())
        db.add(tier)
        await db.flush()
        await db.refresh(tier)
        return tier

    @staticmethod
    async def get_tiers(db: AsyncSession, program_id: int) -> list[LoyaltyTier]:
        """Get all tiers for a program."""
        result = await db.execute(
            select(LoyaltyTier)
            .where(LoyaltyTier.program_id == program_id)
            .order_by(LoyaltyTier.order, LoyaltyTier.min_points)
        )
        return list(result.scalars().all())

    @staticmethod
    async def update_tier(db: AsyncSession, tier_id: int, data: LoyaltyTierUpdate) -> LoyaltyTier:
        """Update a tier."""
        result = await db.execute(select(LoyaltyTier).where(LoyaltyTier.id == tier_id))
        tier = result.scalar_one_or_none()
        if not tier:
            raise ValueError(f"Tier {tier_id} not found")
        for key, value in data.model_dump(exclude_none=True).items():
            setattr(tier, key, value)
        await db.flush()
        await db.refresh(tier)
        return tier

    @staticmethod
    async def delete_tier(db: AsyncSession, tier_id: int) -> bool:
        """Delete a tier."""
        result = await db.execute(select(LoyaltyTier).where(LoyaltyTier.id == tier_id))
        tier = result.scalar_one_or_none()
        if not tier:
            return False
        await db.delete(tier)
        await db.flush()
        return True

    @staticmethod
    async def get_tier_for_points(db: AsyncSession, program_id: int, points: int) -> LoyaltyTier | None:
        """Get the appropriate tier for a given points balance."""
        result = await db.execute(
            select(LoyaltyTier)
            .where(LoyaltyTier.program_id == program_id, LoyaltyTier.min_points <= points)
            .order_by(LoyaltyTier.min_points.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()


# ═══════════════════════════════════════════════════════════════════
# LOYALTY REWARD SERVICE
# ═══════════════════════════════════════════════════════════════════

class LoyaltyRewardService:
    """Service for managing rewards."""

    @staticmethod
    async def create_reward(db: AsyncSession, program_id: int, data: LoyaltyRewardCreate) -> LoyaltyReward:
        """Create a new reward."""
        reward = LoyaltyReward(program_id=program_id, **data.model_dump())
        db.add(reward)
        await db.flush()
        await db.refresh(reward)
        return reward

    @staticmethod
    async def get_rewards(
        db: AsyncSession, program_id: int | None = None, is_active: bool | None = None
    ) -> list[LoyaltyReward]:
        """Get rewards, optionally filtered."""
        query = select(LoyaltyReward)
        if program_id:
            query = query.where(LoyaltyReward.program_id == program_id)
        if is_active is not None:
            query = query.where(LoyaltyReward.is_active == is_active)
        query = query.order_by(LoyaltyReward.points_cost)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_reward(db: AsyncSession, reward_id: int) -> LoyaltyReward | None:
        """Get a reward by ID."""
        result = await db.execute(select(LoyaltyReward).where(LoyaltyReward.id == reward_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def update_reward(db: AsyncSession, reward_id: int, data: LoyaltyRewardUpdate) -> LoyaltyReward:
        """Update a reward."""
        reward = await LoyaltyRewardService.get_reward(db, reward_id)
        if not reward:
            raise ValueError(f"Reward {reward_id} not found")
        for key, value in data.model_dump(exclude_none=True).items():
            setattr(reward, key, value)
        await db.flush()
        await db.refresh(reward)
        return reward

    @staticmethod
    async def delete_reward(db: AsyncSession, reward_id: int) -> bool:
        """Delete a reward."""
        reward = await LoyaltyRewardService.get_reward(db, reward_id)
        if not reward:
            return False
        await db.delete(reward)
        await db.flush()
        return True

    @staticmethod
    async def get_available_rewards(db: AsyncSession, card: LoyaltyCard) -> list[LoyaltyReward]:
        """Get rewards available for a specific card."""
        query = select(LoyaltyReward).where(
            LoyaltyReward.program_id == card.program_id,
            LoyaltyReward.is_active == True,
            LoyaltyReward.points_cost <= card.points_balance,
            or_(LoyaltyReward.max_redemptions.is_(None), LoyaltyReward.current_redemptions < LoyaltyReward.max_redemptions)
        )
        # Filter by tier requirement
        if card.current_tier_id:
            query = query.where(
                or_(LoyaltyReward.min_tier_id.is_(None), LoyaltyReward.min_tier_id <= card.current_tier_id)
            )
        else:
            query = query.where(LoyaltyReward.min_tier_id.is_(None))

        result = await db.execute(query.order_by(LoyaltyReward.points_cost))
        return list(result.scalars().all())


# ═══════════════════════════════════════════════════════════════════
# LOYALTY CARD SERVICE
# ═══════════════════════════════════════════════════════════════════

class LoyaltyCardService:
    """Service for managing loyalty cards."""

    @staticmethod
    async def create_card(db: AsyncSession, data: LoyaltyCardCreate) -> LoyaltyCard:
        """Register a customer in a loyalty program."""
        # Check if customer already has a card in this program
        existing = await db.execute(
            select(LoyaltyCard).where(
                LoyaltyCard.program_id == data.program_id,
                LoyaltyCard.customer_id == data.customer_id
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Customer {data.customer_id} already has a card in program {data.program_id}")

        # Get the program
        program = await LoyaltyProgramService.get_program(db, data.program_id)
        if not program:
            raise ValueError(f"Program {data.program_id} not found")

        # Get the customer
        customer_result = await db.execute(select(POSCustomer).where(POSCustomer.id == data.customer_id))
        customer = customer_result.scalar_one_or_none()
        if not customer:
            raise ValueError(f"Customer {data.customer_id} not found")

        # Generate card number
        card_number = _generate_card_number()

        # Handle referral
        referred_by_card_id = None
        if data.referred_by_card_number:
            referrer_result = await db.execute(
                select(LoyaltyCard).where(LoyaltyCard.card_number == data.referred_by_card_number)
            )
            referrer_card = referrer_result.scalar_one_or_none()
            if referrer_card:
                referred_by_card_id = referrer_card.id

        # Get the lowest tier
        tiers = await LoyaltyTierService.get_tiers(db, data.program_id)
        initial_tier_id = tiers[0].id if tiers else None

        # Create the card
        card = LoyaltyCard(
            program_id=data.program_id,
            customer_id=data.customer_id,
            card_number=card_number,
            current_tier_id=initial_tier_id,
            member_since=date.today(),
            referred_by_card_id=referred_by_card_id,
        )
        db.add(card)
        await db.flush()

        # Award welcome bonus
        if program.welcome_bonus > 0:
            card.points_balance = program.welcome_bonus
            card.total_points_earned = program.welcome_bonus
            db.add(LoyaltyCardTransaction(
                card_id=card.id,
                transaction_type="bonus",
                points=program.welcome_bonus,
                source_type="welcome",
                description="Welcome bonus",
                balance_after=program.welcome_bonus,
            ))

        # Generate referral code for customer
        customer.referral_code = _generate_referral_code()

        # Process referral bonus
        if referred_by_card_id:
            referrer_card = (await db.execute(
                select(LoyaltyCard).where(LoyaltyCard.id == referred_by_card_id)
            )).scalar_one_or_none()
            if referrer_card and program.referral_bonus > 0:
                referrer_card.points_balance += program.referral_bonus
                referrer_card.total_points_earned += program.referral_bonus
                referrer_card.referral_count += 1
                db.add(LoyaltyCardTransaction(
                    card_id=referrer_card.id,
                    transaction_type="bonus",
                    points=program.referral_bonus,
                    source_type="referral",
                    source_id=card.id,
                    description=f"Referral bonus - new member",
                    balance_after=referrer_card.points_balance,
                ))

                # Create referral record
                db.add(LoyaltyReferral(
                    referrer_card_id=referrer_card.id,
                    referred_customer_id=data.customer_id,
                    status="completed",
                    bonus_awarded=True,
                    bonus_points=program.referral_bonus,
                ))

        await db.flush()
        await db.refresh(card)
        logger.info(f"Created loyalty card: {card.card_number} for customer {customer.name}")
        return card

    @staticmethod
    async def get_card(db: AsyncSession, card_id: int) -> LoyaltyCard | None:
        """Get a card by ID."""
        result = await db.execute(
            select(LoyaltyCard)
            .options(selectinload(LoyaltyCard.customer), selectinload(LoyaltyCard.current_tier))
            .where(LoyaltyCard.id == card_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_card_by_number(db: AsyncSession, card_number: str) -> LoyaltyCard | None:
        """Get a card by card number."""
        result = await db.execute(
            select(LoyaltyCard)
            .options(selectinload(LoyaltyCard.customer), selectinload(LoyaltyCard.current_tier))
            .where(LoyaltyCard.card_number == card_number)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_cards(
        db: AsyncSession, program_id: int | None = None, tier_id: int | None = None,
        is_active: bool | None = None, search: str | None = None,
        page: int = 1, size: int = 20
    ) -> tuple[list[LoyaltyCard], int]:
        """List cards with filtering and pagination."""
        query = select(LoyaltyCard).options(
            selectinload(LoyaltyCard.customer), selectinload(LoyaltyCard.current_tier)
        )
        count_query = select(func.count()).select_from(LoyaltyCard)

        if program_id:
            query = query.where(LoyaltyCard.program_id == program_id)
            count_query = count_query.where(LoyaltyCard.program_id == program_id)
        if tier_id:
            query = query.where(LoyaltyCard.current_tier_id == tier_id)
            count_query = count_query.where(LoyaltyCard.current_tier_id == tier_id)
        if is_active is not None:
            query = query.where(LoyaltyCard.is_active == is_active)
            count_query = count_query.where(LoyaltyCard.is_active == is_active)

        if search:
            search_pattern = f"%{search}%"
            query = query.join(POSCustomer).where(
                or_(POSCustomer.name.ilike(search_pattern), POSCustomer.phone.ilike(search_pattern))
            )
            count_query = count_query.join(POSCustomer).where(
                or_(POSCustomer.name.ilike(search_pattern), POSCustomer.phone.ilike(search_pattern))
            )

        # Count
        total = (await db.execute(count_query)).scalar() or 0

        # Paginate
        query = query.order_by(LoyaltyCard.created_at.desc()).offset((page - 1) * size).limit(size)
        result = await db.execute(query)
        cards = list(result.scalars().all())

        return cards, total

    @staticmethod
    async def lookup_card(db: AsyncSession, card_number: str) -> CardLookupResult:
        """Lookup a card for POS integration."""
        card = await LoyaltyCardService.get_card_by_number(db, card_number)
        if not card or not card.is_active:
            raise ValueError(f"Card {card_number} not found or inactive")

        program = await LoyaltyProgramService.get_program(db, card.program_id)
        if not program or not program.is_active:
            raise ValueError("Loyalty program not active")

        tier_name = card.current_tier.name if card.current_tier else "Standard"
        tier_color = card.current_tier.color if card.current_tier else "#6B7280"
        tier_discount = float(card.current_tier.discount_percent) if card.current_tier else 0

        points_value = card.points_balance * float(program.currency_per_point)

        return CardLookupResult(
            card_number=card.card_number,
            customer_name=card.customer.name if card.customer else "Unknown",
            customer_phone=card.customer.phone if card.customer else None,
            points_balance=card.points_balance,
            tier_name=tier_name,
            tier_color=tier_color,
            tier_discount_percent=tier_discount,
            points_value=points_value,
            can_redeem=card.points_balance > 0,
        )

    @staticmethod
    async def earn_points(
        db: AsyncSession, card_id: int, sale_id: int, sale_amount: float, description: str | None = None
    ) -> LoyaltySaleResult:
        """Earn points from a sale."""
        card = await LoyaltyCardService.get_card(db, card_id)
        if not card:
            raise ValueError(f"Card {card_id} not found")

        program = await LoyaltyProgramService.get_program(db, card.program_id)
        if not program:
            raise ValueError("Loyalty program not found")

        # Calculate base points
        base_points = int(sale_amount * float(program.points_per_currency))

        # Apply tier multiplier
        multiplier = 1.0
        tier_name = None
        if card.current_tier:
            multiplier = float(card.current_tier.points_multiplier)
            tier_name = card.current_tier.name

        earned_points = int(base_points * multiplier)

        # Update card
        card.points_balance += earned_points
        card.total_points_earned += earned_points
        card.total_visits += 1
        card.total_spent += sale_amount
        card.last_visit = datetime.now(timezone.utc)

        # Check for tier upgrade
        new_tier = await LoyaltyTierService.get_tier_for_points(db, card.program_id, card.points_balance)
        if new_tier and new_tier.id != card.current_tier_id:
            card.current_tier_id = new_tier.id
            card.tier_updated_at = datetime.now(timezone.utc)
            tier_name = new_tier.name
            multiplier = float(new_tier.points_multiplier)
            logger.info(f"Card {card.card_number} upgraded to {new_tier.name}")

        # Create transaction
        db.add(LoyaltyCardTransaction(
            card_id=card.id,
            transaction_type="earn",
            points=earned_points,
            source_type="sale",
            source_id=sale_id,
            description=description or f"Points earned from sale",
            balance_after=card.points_balance,
        ))

        await db.flush()

        return LoyaltySaleResult(
            points_earned=earned_points,
            points_used=0,
            loyalty_discount=0,
            new_balance=card.points_balance,
            tier_name=tier_name,
            tier_multiplier=multiplier,
        )

    @staticmethod
    async def redeem_points(
        db: AsyncSession, card_id: int, points_to_use: int, sale_id: int | None = None
    ) -> LoyaltySaleResult:
        """Redeem points for a discount."""
        card = await LoyaltyCardService.get_card(db, card_id)
        if not card:
            raise ValueError(f"Card {card_id} not found")

        if card.points_balance < points_to_use:
            raise ValueError(f"Insufficient points: have {card.points_balance}, need {points_to_use}")

        program = await LoyaltyProgramService.get_program(db, card.program_id)
        if not program:
            raise ValueError("Loyalty program not found")

        # Calculate discount value
        discount = points_to_use * float(program.currency_per_point)

        # Update card
        card.points_balance -= points_to_use
        card.total_points_redeemed += points_to_use

        # Create transaction
        db.add(LoyaltyCardTransaction(
            card_id=card.id,
            transaction_type="redeem",
            points=-points_to_use,
            source_type="sale" if sale_id else "manual",
            source_id=sale_id,
            description=f"Points redeemed for discount",
            balance_after=card.points_balance,
        ))

        await db.flush()

        tier_name = card.current_tier.name if card.current_tier else "Standard"
        multiplier = float(card.current_tier.points_multiplier) if card.current_tier else 1.0

        return LoyaltySaleResult(
            points_earned=0,
            points_used=points_to_use,
            loyalty_discount=discount,
            new_balance=card.points_balance,
            tier_name=tier_name,
            tier_multiplier=multiplier,
        )

    @staticmethod
    async def redeem_reward(
        db: AsyncSession, card_id: int, reward_id: int, sale_id: int | None = None
    ) -> LoyaltyRedemption:
        """Redeem a reward."""
        card = await LoyaltyCardService.get_card(db, card_id)
        if not card:
            raise ValueError(f"Card {card_id} not found")

        reward = await LoyaltyRewardService.get_reward(db, reward_id)
        if not reward:
            raise ValueError(f"Reward {reward_id} not found")

        if reward.program_id != card.program_id:
            raise ValueError("Reward not available for this card's program")

        if card.points_balance < reward.points_cost:
            raise ValueError(f"Insufficient points: have {card.points_balance}, need {reward.points_cost}")

        # Check tier restriction
        if reward.min_tier_id and (not card.current_tier_id or card.current_tier_id < reward.min_tier_id):
            raise ValueError("Tier requirement not met for this reward")

        # Check redemption limit
        if reward.max_redemptions and reward.current_redemptions >= reward.max_redemptions:
            raise ValueError("Reward has reached maximum redemptions")

        # Update card
        card.points_balance -= reward.points_cost
        card.total_points_redeemed += reward.points_cost

        # Update reward
        reward.current_redemptions += 1

        # Create redemption
        redemption = LoyaltyRedemption(
            card_id=card.id,
            reward_id=reward.id,
            sale_id=sale_id,
            points_used=reward.points_cost,
            voucher_code=_generate_voucher_code(),
            status="active",
            expires_at=datetime.now(timezone.utc) + timedelta(days=reward.valid_for_days) if reward.valid_for_days else None,
        )
        db.add(redemption)

        # Create transaction
        db.add(LoyaltyCardTransaction(
            card_id=card.id,
            transaction_type="redeem",
            points=-reward.points_cost,
            source_type="reward",
            source_id=reward.id,
            description=f"Redeemed: {reward.name}",
            balance_after=card.points_balance,
        ))

        await db.flush()
        await db.refresh(redemption)
        return redemption

    @staticmethod
    async def adjust_points(
        db: AsyncSession, card_id: int, points: int, description: str
    ) -> LoyaltyCard:
        """Manually adjust points (admin correction)."""
        card = await LoyaltyCardService.get_card(db, card_id)
        if not card:
            raise ValueError(f"Card {card_id} not found")

        new_balance = card.points_balance + points
        if new_balance < 0:
            raise ValueError(f"Cannot reduce below 0 (current: {card.points_balance}, adjustment: {points})")

        card.points_balance = new_balance
        if points > 0:
            card.total_points_earned += points
        else:
            card.total_points_redeemed += abs(points)

        transaction_type = "adjust" if points != 0 else "bonus"
        if points < 0:
            transaction_type = "redeem"

        db.add(LoyaltyCardTransaction(
            card_id=card.id,
            transaction_type=transaction_type,
            points=points,
            description=description,
            balance_after=new_balance,
        ))

        await db.flush()
        await db.refresh(card)
        return card

    @staticmethod
    async def get_transactions(
        db: AsyncSession, card_id: int, page: int = 1, size: int = 20
    ) -> tuple[list[LoyaltyCardTransaction], int]:
        """Get transaction history for a card."""
        query = select(LoyaltyCardTransaction).where(LoyaltyCardTransaction.card_id == card_id)
        count_query = select(func.count()).select_from(LoyaltyCardTransaction).where(
            LoyaltyCardTransaction.card_id == card_id
        )

        total = (await db.execute(count_query)).scalar() or 0
        result = await db.execute(
            query.order_by(LoyaltyCardTransaction.created_at.desc()).offset((page - 1) * size).limit(size)
        )
        return list(result.scalars().all()), total


# ═══════════════════════════════════════════════════════════════════
# LOYALTY STATS SERVICE
# ═══════════════════════════════════════════════════════════════════

class LoyaltyStatsService:
    """Service for loyalty statistics."""

    @staticmethod
    async def get_stats(db: AsyncSession, program_id: int | None = None) -> LoyaltyStats:
        """Get loyalty program statistics."""
        # Base queries
        cards_query = select(LoyaltyCard)
        if program_id:
            cards_query = cards_query.where(LoyaltyCard.program_id == program_id)

        # Total members
        total_members = (await db.execute(
            select(func.count()).select_from(cards_query.subquery())
        )).scalar() or 0

        # Active members (visited in last 30 days)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        active_members = (await db.execute(
            select(func.count()).select_from(LoyaltyCard).where(
                LoyaltyCard.last_visit >= thirty_days_ago,
                LoyaltyCard.program_id == program_id if program_id else True
            )
        )).scalar() or 0

        # Points stats
        points_stats = (await db.execute(
            select(
                func.sum(LoyaltyCard.total_points_earned).label("earned"),
                func.sum(LoyaltyCard.total_points_redeemed).label("redeemed"),
                func.sum(LoyaltyCard.points_balance).label("balance"),
            ).where(LoyaltyCard.program_id == program_id if program_id else True)
        )).first()

        total_points_earned = points_stats.earned or 0
        total_points_redeemed = points_stats.redeemed or 0
        total_points_balance = points_stats.balance or 0

        # Redemptions count
        total_redemptions = (await db.execute(
            select(func.count()).select_from(LoyaltyRedemption)
        )).scalar() or 0

        # Tier distribution
        tier_dist_result = await db.execute(
            select(
                LoyaltyTier.name,
                LoyaltyTier.color,
                func.count(LoyaltyCard.id).label("count")
            )
            .outerjoin(LoyaltyCard, LoyaltyCard.current_tier_id == LoyaltyTier.id)
            .group_by(LoyaltyTier.id, LoyaltyTier.name, LoyaltyTier.color)
            .order_by(LoyaltyTier.order)
        )
        tier_distribution = [
            {"tier": row.name, "color": row.color, "count": row.count}
            for row in tier_dist_result.all()
        ]

        # Top members
        top_result = await db.execute(
            select(LoyaltyCard)
            .options(selectinload(LoyaltyCard.customer))
            .order_by(LoyaltyCard.total_spent.desc())
            .limit(10)
        )
        top_members = [
            {
                "card_id": card.id,
                "customer_name": card.customer.name if card.customer else "Unknown",
                "points_balance": card.points_balance,
                "total_spent": float(card.total_spent),
                "tier": card.current_tier.name if card.current_tier else "Standard",
            }
            for card in top_result.scalars().all()
        ]

        # Recent transactions
        recent_tx_result = await db.execute(
            select(LoyaltyCardTransaction)
            .options(selectinload(LoyaltyCardTransaction.card).selectinload(LoyaltyCard.customer))
            .order_by(LoyaltyCardTransaction.created_at.desc())
            .limit(10)
        )
        recent_transactions = [
            {
                "id": tx.id,
                "card_number": tx.card.card_number if tx.card else None,
                "customer_name": tx.card.customer.name if tx.card and tx.card.customer else None,
                "type": tx.transaction_type,
                "points": tx.points,
                "created_at": tx.created_at.isoformat(),
            }
            for tx in recent_tx_result.scalars().all()
        ]

        # Rewards stats
        rewards_count = (await db.execute(select(func.count()).select_from(LoyaltyReward))).scalar() or 0
        active_rewards = (await db.execute(
            select(func.count()).select_from(LoyaltyReward).where(LoyaltyReward.is_active == True)
        )).scalar() or 0

        return LoyaltyStats(
            total_members=total_members,
            active_members=active_members,
            total_points_earned=total_points_earned,
            total_points_redeemed=total_points_redeemed,
            total_points_balance=total_points_balance,
            total_redemptions=total_redemptions,
            tier_distribution=tier_distribution,
            top_members=top_members,
            recent_transactions=recent_transactions,
            rewards_stats={"total": rewards_count, "active": active_rewards},
        )
