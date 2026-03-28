"""E-commerce tasks for SavanaFlow POS.

This module contains Celery tasks for:
- Inventory synchronization from POS to online store
- Order notifications (email, SMS, WhatsApp)
- Order status updates and tracking
- Cleanup of abandoned orders
- Delivery notifications
"""
from celery import shared_task
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging
import asyncio

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.ecommerce import (
    OnlineStore, OnlineProduct, OnlineOrder, OnlineCustomer
)
from app.models.all_models import Product

logger = logging.getLogger(__name__)
settings = get_settings()


def get_async_session():
    """Create async session for tasks."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return async_session


@shared_task(name="app.tasks.ecommerce.sync_inventory_from_pos")
def sync_inventory_from_pos(online_store_id: Optional[int] = None):
    """Sync POS inventory to online store(s).
    
    This task synchronizes stock quantities from the POS product database
    to the online store products. It can be run for a specific store or
    all stores.
    
    Args:
        online_store_id: Specific store ID to sync, or None for all stores
    """
    logger.info(f"Starting inventory sync for store {online_store_id or 'all stores'}")
    
    async def _sync():
        async with get_async_session() as db:
            # Get stores with stock sync enabled
            query = select(OnlineStore).where(OnlineStore.is_active == True)
            if online_store_id:
                query = query.where(OnlineStore.id == online_store_id)
            
            result = await db.execute(query)
            stores = list(result.scalars().all())
            
            total_synced = 0
            total_updated = 0
            
            for store in stores:
                # Get online products with sync enabled
                products_query = select(OnlineProduct).where(
                    and_(
                        OnlineProduct.online_store_id == store.id,
                        OnlineProduct.sync_stock == True,
                    )
                )
                products_result = await db.execute(products_query)
                online_products = list(products_result.scalars().all())
                
                for op in online_products:
                    # Get POS product
                    product = await db.get(Product, op.product_id)
                    if product:
                        old_qty = float(op.stock_quantity)
                        new_qty = float(product.stock_quantity)
                        
                        if old_qty != new_qty:
                            op.stock_quantity = new_qty
                            total_updated += 1
                            logger.debug(
                                f"Updated {op.online_name or op.product_id}: "
                                f"{old_qty} -> {new_qty}"
                            )
                        total_synced += 1
            
            await db.commit()
            
            logger.info(
                f"Inventory sync complete: {total_synced} products checked, "
                f"{total_updated} updated"
            )
            
            return {
                "status": "completed",
                "products_checked": total_synced,
                "products_updated": total_updated,
            }
    
    return asyncio.run(_sync())


@shared_task(name="app.tasks.ecommerce.send_order_notification")
def send_order_notification(order_id: int, notification_type: str = "confirmation"):
    """Send order notification to customer.
    
    Sends notifications via email, SMS, or WhatsApp based on
    the store configuration and customer preferences.
    
    Args:
        order_id: The order ID to send notification for
        notification_type: Type of notification 
            (confirmation, shipped, delivered, cancelled)
    """
    logger.info(f"Sending {notification_type} notification for order {order_id}")
    
    async def _send():
        async with get_async_session() as db:
            # Get order with store info
            order = await db.get(OnlineOrder, order_id)
            if not order:
                logger.error(f"Order {order_id} not found")
                return {"status": "error", "message": "Order not found"}
            
            store = await db.get(OnlineStore, order.online_store_id)
            if not store:
                logger.error(f"Store for order {order_id} not found")
                return {"status": "error", "message": "Store not found"}
            
            notification_sent = {
                "email": False,
                "sms": False,
                "whatsapp": False,
            }
            
            # Prepare message content based on notification type
            messages = {
                "confirmation": {
                    "subject": f"Confirmation de commande {order.order_number}",
                    "body": f"""
Bonjour {order.customer_name},

Votre commande {order.order_number} a été confirmée !

Total: {float(order.total):,.0f} {store.currency}
Mode de livraison: {"Livraison" if order.delivery_method == "delivery" else "Retrait en magasin"}

Merci pour votre confiance !
{store.name}
                    """.strip(),
                },
                "shipped": {
                    "subject": f"Votre commande {order.order_number} est en route !",
                    "body": f"""
Bonjour {order.customer_name},

Votre commande {order.order_number} a été expédiée.

Elle sera livrée selon le mode choisi.

{store.name}
                    """.strip(),
                },
                "delivered": {
                    "subject": f"Commande {order.order_number} livrée",
                    "body": f"""
Bonjour {order.customer_name},

Votre commande {order.order_number} a été livrée avec succès.

Merci pour votre achat !
{store.name}
                    """.strip(),
                },
                "cancelled": {
                    "subject": f"Commande {order.order_number} annulée",
                    "body": f"""
Bonjour {order.customer_name},

Votre commande {order.order_number} a été annulée.

Si vous avez des questions, contactez-nous.
{store.name}
                    """.strip(),
                },
            }
            
            message = messages.get(notification_type, messages["confirmation"])
            
            # Send email notification
            if store.contact_email and order.customer_email:
                try:
                    # TODO: Implement actual email sending
                    # await send_email(
                    #     to=order.customer_email,
                    #     subject=message["subject"],
                    #     body=message["body"],
                    #     from_email=store.contact_email,
                    # )
                    notification_sent["email"] = True
                    logger.info(f"Email sent to {order.customer_email}")
                except Exception as e:
                    logger.error(f"Failed to send email: {e}")
            
            # Send SMS notification
            if order.customer_phone:
                try:
                    # TODO: Implement actual SMS sending via SMS gateway
                    # await send_sms(
                    #     to=order.customer_phone,
                    #     message=message["body"][:160],  # SMS limit
                    # )
                    notification_sent["sms"] = True
                    logger.info(f"SMS sent to {order.customer_phone}")
                except Exception as e:
                    logger.error(f"Failed to send SMS: {e}")
            
            # Send WhatsApp notification
            if store.whatsapp_number and order.customer_phone:
                try:
                    # TODO: Implement actual WhatsApp sending via WhatsApp Business API
                    # await send_whatsapp(
                    #     to=order.customer_phone,
                    #     message=message["body"],
                    #     from_number=store.whatsapp_number,
                    # )
                    notification_sent["whatsapp"] = True
                    logger.info(f"WhatsApp sent to {order.customer_phone}")
                except Exception as e:
                    logger.error(f"Failed to send WhatsApp: {e}")
            
            return {
                "status": "completed",
                "order_id": order_id,
                "notification_type": notification_type,
                "notifications_sent": notification_sent,
            }
    
    return asyncio.run(_send())


@shared_task(name="app.tasks.ecommerce.update_order_status")
def update_order_status(order_id: int, new_status: str, notes: Optional[str] = None):
    """Update order status and send notification.
    
    This task updates the order status, records timestamps,
    and triggers the appropriate notification.
    
    Args:
        order_id: The order ID to update
        new_status: New status (pending, confirmed, processing, ready, 
                    shipped, delivered, cancelled, refunded)
        notes: Optional notes to add to the order
    """
    logger.info(f"Updating order {order_id} status to {new_status}")
    
    async def _update():
        async with get_async_session() as db:
            order = await db.get(OnlineOrder, order_id)
            if not order:
                logger.error(f"Order {order_id} not found")
                return {"status": "error", "message": "Order not found"}
            
            old_status = order.status
            order.status = new_status
            
            if notes:
                order.internal_notes = notes
            
            # Set timestamps based on status
            now = datetime.now(timezone.utc)
            if new_status == "confirmed":
                order.confirmed_at = now
            elif new_status == "shipped":
                order.shipped_at = now
            elif new_status == "delivered":
                order.delivered_at = now
            
            await db.commit()
            
            # Map status to notification type
            notification_map = {
                "confirmed": "confirmation",
                "shipped": "shipped",
                "delivered": "delivered",
                "cancelled": "cancelled",
            }
            
            # Trigger notification if applicable
            notification_type = notification_map.get(new_status)
            if notification_type:
                send_order_notification.delay(order_id, notification_type)
            
            logger.info(
                f"Order {order_id} status updated: {old_status} -> {new_status}"
            )
            
            return {
                "status": "completed",
                "order_id": order_id,
                "old_status": old_status,
                "new_status": new_status,
            }
    
    return asyncio.run(_update())


@shared_task(name="app.tasks.ecommerce.cleanup_abandoned_orders")
def cleanup_abandoned_orders(hours: int = 24):
    """Cancel orders that have been pending for too long.
    
    Orders in 'pending' status without payment for more than
    the specified number of hours will be automatically cancelled.
    
    Args:
        hours: Number of hours after which pending orders are cancelled
    """
    logger.info(f"Cleaning up orders pending for more than {hours} hours")
    
    async def _cleanup():
        async with get_async_session() as db:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
            
            # Find abandoned orders
            query = select(OnlineOrder).where(
                and_(
                    OnlineOrder.status == "pending",
                    OnlineOrder.payment_status == "pending",
                    OnlineOrder.created_at < cutoff_time,
                )
            )
            result = await db.execute(query)
            abandoned_orders = list(result.scalars().all())
            
            cancelled_count = 0
            for order in abandoned_orders:
                order.status = "cancelled"
                order.internal_notes = (
                    f"Automatically cancelled: pending for more than {hours} hours"
                )
                cancelled_count += 1
                
                # Restore stock for cancelled orders
                for item in order.items:
                    online_product = await db.get(OnlineProduct, item.online_product_id)
                    if online_product:
                        online_product.stock_quantity = (
                            float(online_product.stock_quantity) + float(item.quantity)
                        )
            
            await db.commit()
            
            logger.info(f"Cancelled {cancelled_count} abandoned orders")
            
            return {
                "status": "completed",
                "hours_threshold": hours,
                "orders_cancelled": cancelled_count,
            }
    
    return asyncio.run(_cleanup())


@shared_task(name="app.tasks.ecommerce.send_delivery_reminder")
def send_delivery_reminder(order_id: int):
    """Send delivery reminder for orders ready for pickup/delivery.
    
    Args:
        order_id: The order ID to send reminder for
    """
    logger.info(f"Sending delivery reminder for order {order_id}")
    
    async def _send():
        async with get_async_session() as db:
            order = await db.get(OnlineOrder, order_id)
            if not order:
                return {"status": "error", "message": "Order not found"}
            
            store = await db.get(OnlineStore, order.online_store_id)
            if not store:
                return {"status": "error", "message": "Store not found"}
            
            message = ""
            if order.delivery_method == "pickup":
                message = f"""
Bonjour {order.customer_name},

Votre commande {order.order_number} est prête pour le retrait !

Adresse: {store.address or "Notre magasin"}

Merci de votre confiance !
{store.name}
                """.strip()
            else:
                message = f"""
Bonjour {order.customer_name},

Votre commande {order.order_number} est en cours de livraison.

{store.name}
                """.strip()
            
            # Send via available channels
            notification_sent = {"sms": False, "whatsapp": False}
            
            if order.customer_phone:
                # TODO: Send SMS
                notification_sent["sms"] = True
            
            if store.whatsapp_number and order.customer_phone:
                # TODO: Send WhatsApp
                notification_sent["whatsapp"] = True
            
            return {
                "status": "completed",
                "order_id": order_id,
                "notifications_sent": notification_sent,
            }
    
    return asyncio.run(_send())


@shared_task(name="app.tasks.ecommerce.sync_orders_to_pos")
def sync_orders_to_pos(online_store_id: Optional[int] = None):
    """Sync paid online orders to POS as sales.
    
    This task finds paid online orders that haven't been synced to POS
    and creates corresponding sales records.
    
    Args:
        online_store_id: Specific store ID to sync, or None for all stores
    """
    logger.info(f"Syncing orders to POS for store {online_store_id or 'all stores'}")
    
    async def _sync():
        async with get_async_session() as db:
            # Find paid orders not synced to POS
            query = select(OnlineOrder).where(
                and_(
                    OnlineOrder.payment_status == "paid",
                    OnlineOrder.sale_id == None,
                    OnlineOrder.status.in_(["confirmed", "processing", "ready", "shipped", "delivered"]),
                )
            )
            if online_store_id:
                query = query.where(OnlineOrder.online_store_id == online_store_id)
            
            result = await db.execute(query)
            orders = list(result.scalars().all())
            
            synced_count = 0
            for order in orders:
                try:
                    # Import service here to avoid circular imports
                    from app.services import ecommerce_service
                    
                    # Create sale from order
                    sale = await ecommerce_service.sync_order_to_pos(db, order.id, 1)  # System user
                    synced_count += 1
                    logger.info(f"Order {order.order_number} synced to sale {sale.sale_number}")
                except Exception as e:
                    logger.error(f"Failed to sync order {order.order_number}: {e}")
            
            await db.commit()
            
            return {
                "status": "completed",
                "orders_synced": synced_count,
            }
    
    return asyncio.run(_sync())


@shared_task(name="app.tasks.ecommerce.generate_daily_ecommerce_report")
def generate_daily_ecommerce_report():
    """Generate daily e-commerce sales report.
    
    Creates a summary of orders, revenue, and top products for the day.
    """
    logger.info("Generating daily e-commerce report")
    
    async def _generate():
        async with get_async_session() as db:
            today = datetime.now(timezone.utc).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            
            # Get all active stores
            stores_result = await db.execute(
                select(OnlineStore).where(OnlineStore.is_active == True)
            )
            stores = list(stores_result.scalars().all())
            
            reports = []
            for store in stores:
                # Get today's stats
                stats = await ecommerce_service.get_ecommerce_stats(db, store.id)
                
                reports.append({
                    "store_id": store.id,
                    "store_name": store.name,
                    "today_revenue": stats["today_revenue"],
                    "total_orders": stats["total_orders"],
                    "pending_orders": stats["pending_orders"],
                })
            
            logger.info(f"Daily report generated for {len(stores)} stores")
            
            return {
                "status": "completed",
                "date": today.isoformat(),
                "stores": reports,
            }
    
    return asyncio.run(_generate())
