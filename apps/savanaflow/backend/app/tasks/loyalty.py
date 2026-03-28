"""Celery tasks for Loyalty Program automation — SavanaFlow POS."""
from __future__ import annotations

import logging
from datetime import datetime, timezone, date, timedelta

from celery import shared_task
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.loyalty import (
    LoyaltyProgram, LoyaltyTier, LoyaltyCard, LoyaltyCardTransaction, LoyaltyRedemption
)
from app.models.all_models import POSCustomer

logger = logging.getLogger(__name__)


@shared_task(name="app.tasks.loyalty.process_birthday_bonuses")
def process_birthday_bonuses() -> dict:
    """
    Award birthday bonuses to members whose birthday is today.
    Runs daily at midnight.
    """
    import asyncio
    return asyncio.run(_process_birthday_bonuses_async())


async def _process_birthday_bonuses_async() -> dict:
    """Async implementation of birthday bonus processing."""
    today = date.today()
    processed = 0
    errors = 0

    async with AsyncSessionLocal() as db:
        # Find customers with birthday today
        result = await db.execute(
            select(POSCustomer)
            .where(
                POSCustomer.is_active == True,
                POSCustomer.birthdate.isnot(None),
            )
        )
        customers = result.scalars().all()

        for customer in customers:
            if customer.birthdate:
                # Check if birthday is today (month and day match)
                if (customer.birthdate.month == today.month and 
                    customer.birthdate.day == today.day):
                    # Find their loyalty cards
                    cards_result = await db.execute(
                        select(LoyaltyCard)
                        .options(selectinload(LoyaltyCard.program), selectinload(LoyaltyCard.current_tier))
                        .where(LoyaltyCard.customer_id == customer.id, LoyaltyCard.is_active == True)
                    )
                    cards = cards_result.scalars().all()

                    for card in cards:
                        try:
                            program = card.program
                            # Determine bonus amount (tier bonus overrides program bonus)
                            bonus = program.birthday_bonus
                            if card.current_tier and card.current_tier.birthday_bonus > 0:
                                bonus = max(bonus, card.current_tier.birthday_bonus)

                            if bonus > 0:
                                # Check if already awarded this year
                                existing = await db.execute(
                                    select(LoyaltyCardTransaction).where(
                                        LoyaltyCardTransaction.card_id == card.id,
                                        LoyaltyCardTransaction.transaction_type == "bonus",
                                        LoyaltyCardTransaction.source_type == "birthday",
                                        LoyaltyCardTransaction.created_at >= datetime(today.year, 1, 1)
                                    )
                                )
                                if not existing.scalar_one_or_none():
                                    # Award bonus
                                    card.points_balance += bonus
                                    card.total_points_earned += bonus
                                    db.add(LoyaltyCardTransaction(
                                        card_id=card.id,
                                        transaction_type="bonus",
                                        points=bonus,
                                        source_type="birthday",
                                        description=f"Birthday bonus - Happy Birthday!",
                                        balance_after=card.points_balance,
                                    ))
                                    processed += 1
                                    logger.info(f"Birthday bonus awarded to {customer.name}: {bonus} points")
                        except Exception as e:
                            logger.error(f"Error processing birthday bonus for card {card.id}: {e}")
                            errors += 1

        await db.commit()

    logger.info(f"Birthday bonuses processed: {processed} awards, {errors} errors")
    return {"processed": processed, "errors": errors}


@shared_task(name="app.tasks.loyalty.check_tier_upgrades")
def check_tier_upgrades() -> dict:
    """
    Check and process tier upgrades/downgrades for all loyalty cards.
    Runs daily at 1 AM.
    """
    import asyncio
    return asyncio.run(_check_tier_upgrades_async())


async def _check_tier_upgrades_async() -> dict:
    """Async implementation of tier upgrade processing."""
    upgraded = 0
    downgraded = 0

    async with AsyncSessionLocal() as db:
        # Get all active programs
        programs_result = await db.execute(
            select(LoyaltyProgram).where(LoyaltyProgram.is_active == True)
        )
        programs = programs_result.scalars().all()

        for program in programs:
            # Get tiers for this program, ordered by min_points
            tiers_result = await db.execute(
                select(LoyaltyTier)
                .where(LoyaltyTier.program_id == program.id)
                .order_by(LoyaltyTier.min_points.desc())
            )
            tiers = list(tiers_result.scalars().all())

            if not tiers:
                continue

            # Get all cards for this program
            cards_result = await db.execute(
                select(LoyaltyCard)
                .options(selectinload(LoyaltyCard.customer))
                .where(LoyaltyCard.program_id == program.id, LoyaltyCard.is_active == True)
            )
            cards = cards_result.scalars().all()

            for card in cards:
                # Find the appropriate tier for current points
                new_tier = None
                for tier in tiers:
                    if card.points_balance >= tier.min_points:
                        new_tier = tier
                        break

                if new_tier and new_tier.id != card.current_tier_id:
                    old_tier_id = card.current_tier_id
                    card.current_tier_id = new_tier.id
                    card.tier_updated_at = datetime.now(timezone.utc)

                    if old_tier_id is None or any(
                        t.id == old_tier_id and t.min_points < new_tier.min_points for t in tiers
                    ):
                        upgraded += 1
                        logger.info(f"Card {card.card_number} upgraded to {new_tier.name}")
                    else:
                        downgraded += 1
                        logger.info(f"Card {card.card_number} changed to {new_tier.name}")

        await db.commit()

    logger.info(f"Tier updates: {upgraded} upgrades, {downgraded} changes")
    return {"upgraded": upgraded, "downgraded": downgraded}


@shared_task(name="app.tasks.loyalty.expire_unused_points")
def expire_unused_points() -> dict:
    """
    Expire points older than the configured period.
    Runs daily at 2 AM.
    """
    import asyncio
    return asyncio.run(_expire_unused_points_async())


async def _expire_unused_points_async() -> dict:
    """Async implementation of point expiration."""
    expired_count = 0
    expired_points = 0

    async with AsyncSessionLocal() as db:
        # Get programs with expiration configured
        programs_result = await db.execute(
            select(LoyaltyProgram).where(
                LoyaltyProgram.is_active == True,
                LoyaltyProgram.points_expiry_days > 0
            )
        )
        programs = programs_result.scalars().all()

        for program in programs:
            expiry_date = datetime.now(timezone.utc) - timedelta(days=program.points_expiry_days)

            # Find transactions that have expired
            # Using FIFO logic - oldest points expire first
            cards_result = await db.execute(
                select(LoyaltyCard).where(LoyaltyCard.program_id == program.id, LoyaltyCard.is_active == True)
            )
            cards = cards_result.scalars().all()

            for card in cards:
                # Get unexpired earn transactions that are now expired
                expired_txs_result = await db.execute(
                    select(LoyaltyCardTransaction)
                    .where(
                        LoyaltyCardTransaction.card_id == card.id,
                        LoyaltyCardTransaction.transaction_type == "earn",
                        LoyaltyCardTransaction.created_at < expiry_date,
                        LoyaltyCardTransaction.expires_at.is_(None)
                    )
                    .order_by(LoyaltyCardTransaction.created_at)
                )
                expired_txs = expired_txs_result.scalars().all()

                for tx in expired_txs:
                    if tx.points > 0 and card.points_balance > 0:
                        # Calculate how many points to expire
                        points_to_expire = min(tx.points, card.points_balance)
                        if points_to_expire > 0:
                            card.points_balance -= points_to_expire
                            expired_points += points_to_expire
                            expired_count += 1

                            # Mark original transaction as expired
                            tx.expires_at = datetime.now(timezone.utc)

                            # Create expiration transaction
                            db.add(LoyaltyCardTransaction(
                                card_id=card.id,
                                transaction_type="expire",
                                points=-points_to_expire,
                                source_type="expiry",
                                description=f"Points expired (older than {program.points_expiry_days} days)",
                                balance_after=card.points_balance,
                            ))

                            logger.info(f"Expired {points_to_expire} points for card {card.card_number}")

        await db.commit()

    logger.info(f"Points expired: {expired_count} transactions, {expired_points} total points")
    return {"expired_transactions": expired_count, "expired_points": expired_points}


@shared_task(name="app.tasks.loyalty.expire_vouchers")
def expire_vouchers() -> dict:
    """
    Mark expired vouchers as expired.
    Runs hourly.
    """
    import asyncio
    return asyncio.run(_expire_vouchers_async())


async def _expire_vouchers_async() -> dict:
    """Async implementation of voucher expiration."""
    expired = 0

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)

        # Find active vouchers past their expiry date
        result = await db.execute(
            select(LoyaltyRedemption)
            .where(
                LoyaltyRedemption.status == "active",
                LoyaltyRedemption.expires_at < now
            )
        )
        redemptions = result.scalars().all()

        for redemption in redemptions:
            redemption.status = "expired"
            expired += 1
            logger.info(f"Voucher {redemption.voucher_code} expired")

        await db.commit()

    logger.info(f"Vouchers expired: {expired}")
    return {"expired": expired}


@shared_task(name="app.tasks.loyalty.send_tier_upgrade_notifications")
def send_tier_upgrade_notifications() -> dict:
    """
    Send notifications for tier upgrades that occurred in the last 24 hours.
    Runs daily at 9 AM.
    """
    import asyncio
    return asyncio.run(_send_tier_upgrade_notifications_async())


async def _send_tier_upgrade_notifications_async() -> dict:
    """Async implementation of tier upgrade notifications."""
    notified = 0

    async with AsyncSessionLocal() as db:
        yesterday = datetime.now(timezone.utc) - timedelta(hours=24)

        # Find cards that were upgraded in the last 24 hours
        result = await db.execute(
            select(LoyaltyCard)
            .options(
                selectinload(LoyaltyCard.customer),
                selectinload(LoyaltyCard.current_tier),
                selectinload(LoyaltyCard.program)
            )
            .where(
                LoyaltyCard.tier_updated_at >= yesterday
            )
        )
        cards = result.scalars().all()

        for card in cards:
            if card.customer and card.customer.email:
                # TODO: Send email notification
                # For now, just log it
                logger.info(f"Would send tier upgrade notification to {card.customer.email} - new tier: {card.current_tier.name if card.current_tier else 'Unknown'}")
                notified += 1

    logger.info(f"Tier upgrade notifications: {notified}")
    return {"notified": notified}
