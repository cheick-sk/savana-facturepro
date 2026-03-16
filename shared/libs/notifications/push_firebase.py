"""Firebase Cloud Messaging (FCM) push notification integration.

Supports:
- Individual device notifications
- Topic-based notifications (for organization broadcasts)
- Data-only messages (for background sync)
- Notification messages with title/body

Configuration:
    FIREBASE_CREDENTIALS_PATH: Path to service account JSON file
    Or use Application Default Credentials (ADC) in production

Note: This module requires firebase-admin package.
Install with: pip install firebase-admin
"""
from __future__ import annotations

import logging
from typing import Optional, Union

from .base import (
    NotificationChannel,
    NotificationMessage,
    NotificationResult,
)

logger = logging.getLogger(__name__)

# Lazy import to avoid errors when firebase-admin is not installed
_firebase_app = None


def _get_firebase_app(credentials_path: Optional[str] = None):
    """Get or initialize Firebase app (lazy initialization)."""
    global _firebase_app

    if _firebase_app is not None:
        return _firebase_app

    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            if credentials_path:
                cred = credentials.Certificate(credentials_path)
            else:
                # Use Application Default Credentials
                cred = credentials.ApplicationDefault()

            _firebase_app = firebase_admin.initialize_app(cred)

        _firebase_app = firebase_admin.get_app()
        return _firebase_app

    except ImportError:
        raise ImportError(
            "firebase-admin is required for push notifications. "
            "Install with: pip install firebase-admin"
        )


class FirebasePushChannel(NotificationChannel):
    """Firebase Cloud Messaging push notification channel."""

    def __init__(self, credentials_path: Optional[str] = None):
        """Initialize Firebase push channel.

        Args:
            credentials_path: Path to Firebase service account JSON file.
                              If None, uses Application Default Credentials.
        """
        self.credentials_path = credentials_path
        self._app = None

    @property
    def name(self) -> str:
        return "push"

    @property
    def is_available(self) -> bool:
        """Check if Firebase is properly configured."""
        try:
            self._get_app()
            return True
        except Exception:
            return False

    def _get_app(self):
        """Get Firebase app instance (lazy)."""
        if self._app is None:
            self._app = _get_firebase_app(self.credentials_path)
        return self._app

    async def send(self, message: NotificationMessage) -> NotificationResult:
        """Send a push notification.

        Args:
            message: Notification message with:
                - to: Device FCM token
                - subject: Notification title
                - body: Notification body
                - data: Optional data payload

        Returns:
            NotificationResult with send status
        """
        try:
            from firebase_admin import messaging

            app = self._get_app()

            # Build the FCM message
            fcm_message = messaging.Message(
                token=message.to,
                notification=messaging.Notification(
                    title=message.subject or "Notification",
                    body=message.body,
                ),
                data=message.data or {},
                android=messaging.AndroidConfig(
                    priority="high" if message.priority in ("high", "urgent") else "normal",
                    notification=messaging.AndroidNotification(
                        icon="notification_icon",
                        color="#1a56db",
                        sound="default",
                        click_action="FLUTTER_NOTIFICATION_CLICK",
                    ),
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound="default",
                            badge=1,
                        ),
                    ),
                ),
            )

            # Send the message (synchronously - FCM SDK is sync)
            message_id = messaging.send(fcm_message, app=app)

            logger.info(f"Push notification sent: {message_id}")
            return NotificationResult(
                success=True,
                channel=self.name,
                message_id=message_id,
            )

        except ImportError:
            logger.error("firebase-admin not installed")
            return NotificationResult(
                success=False,
                channel=self.name,
                error_message="firebase-admin package not installed",
            )
        except Exception as e:
            error_message = str(e)

            # Handle specific FCM errors
            if "registration-token-not-registered" in error_message.lower():
                error_message = "Device token not registered"
            elif "invalid-registration-token" in error_message.lower():
                error_message = "Invalid device token"
            elif "message-rate-exceeded" in error_message.lower():
                error_message = "Message rate limit exceeded"

            logger.error(f"Push notification failed: {error_message}")
            return NotificationResult(
                success=False,
                channel=self.name,
                error_message=error_message,
            )

    async def send_data_message(
        self,
        token: str,
        data: dict,
        ttl_seconds: int = 86400,
    ) -> NotificationResult:
        """Send a data-only message (no visible notification).

        Useful for background sync or triggering app actions.

        Args:
            token: Device FCM token
            data: Data payload
            ttl_seconds: Time-to-live in seconds (default 24h)

        Returns:
            NotificationResult with send status
        """
        try:
            from firebase_admin import messaging

            app = self._get_app()

            fcm_message = messaging.Message(
                token=token,
                data=data,
                android=messaging.AndroidConfig(
                    ttl=ttl_seconds * 1000,  # Convert to milliseconds
                    priority="high",
                ),
                apns=messaging.APNSConfig(
                    headers={
                        "apns-expiration": str(ttl_seconds),
                    },
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            content_available=True,
                        ),
                    ),
                ),
            )

            message_id = messaging.send(fcm_message, app=app)

            return NotificationResult(
                success=True,
                channel=self.name,
                message_id=message_id,
            )

        except Exception as e:
            return NotificationResult(
                success=False,
                channel=self.name,
                error_message=str(e),
            )

    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> NotificationResult:
        """Send a notification to all devices subscribed to a topic.

        Common topics:
        - organization_{id}: All users of an organization
        - alerts_{type}: Alert type subscriptions

        Args:
            topic: Topic name (without /topics/ prefix)
            title: Notification title
            body: Notification body
            data: Optional data payload

        Returns:
            NotificationResult with send status
        """
        try:
            from firebase_admin import messaging

            app = self._get_app()

            fcm_message = messaging.Message(
                topic=topic,
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                android=messaging.AndroidConfig(
                    priority="normal",
                    notification=messaging.AndroidNotification(
                        icon="notification_icon",
                        color="#1a56db",
                        sound="default",
                    ),
                ),
            )

            message_id = messaging.send(fcm_message, app=app)

            logger.info(f"Push notification sent to topic {topic}: {message_id}")
            return NotificationResult(
                success=True,
                channel=self.name,
                message_id=message_id,
            )

        except Exception as e:
            logger.error(f"Push to topic failed: {e}")
            return NotificationResult(
                success=False,
                channel=self.name,
                error_message=str(e),
            )

    async def subscribe_to_topic(
        self,
        tokens: Union[str, list[str]],
        topic: str,
    ) -> dict:
        """Subscribe device tokens to a topic.

        Args:
            tokens: Single token or list of tokens
            topic: Topic name

        Returns:
            Dict with success count and errors
        """
        try:
            from firebase_admin import messaging

            app = self._get_app()

            if isinstance(tokens, str):
                tokens = [tokens]

            response = messaging.subscribe_to_topic(tokens, topic, app=app)

            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count,
                "errors": [
                    err.reason for err in response.errors if err
                ],
            }

        except Exception as e:
            return {
                "success_count": 0,
                "failure_count": len(tokens) if isinstance(tokens, list) else 1,
                "errors": [str(e)],
            }

    async def unsubscribe_from_topic(
        self,
        tokens: Union[str, list[str]],
        topic: str,
    ) -> dict:
        """Unsubscribe device tokens from a topic.

        Args:
            tokens: Single token or list of tokens
            topic: Topic name

        Returns:
            Dict with success count and errors
        """
        try:
            from firebase_admin import messaging

            app = self._get_app()

            if isinstance(tokens, str):
                tokens = [tokens]

            response = messaging.unsubscribe_from_topic(tokens, topic, app=app)

            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count,
                "errors": [
                    err.reason for err in response.errors if err
                ],
            }

        except Exception as e:
            return {
                "success_count": 0,
                "failure_count": len(tokens) if isinstance(tokens, list) else 1,
                "errors": [str(e)],
            }

    async def send_multicast(
        self,
        tokens: list[str],
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> dict:
        """Send the same notification to multiple devices.

        Args:
            tokens: List of device tokens (max 500)
            title: Notification title
            body: Notification body
            data: Optional data payload

        Returns:
            Dict with success/failure counts and invalid tokens
        """
        try:
            from firebase_admin import messaging

            app = self._get_app()

            # FCM limits to 500 tokens per multicast
            if len(tokens) > 500:
                tokens = tokens[:500]

            fcm_message = messaging.MulticastMessage(
                tokens=tokens,
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        icon="notification_icon",
                        sound="default",
                    ),
                ),
            )

            response = messaging.send_multicast(fcm_message, app=app)

            # Collect failed tokens
            invalid_tokens = []
            if response.failure_count > 0:
                for idx, resp in enumerate(response.responses):
                    if not resp.success:
                        error = resp.exception
                        if error and "not-registered" in str(error).lower():
                            invalid_tokens.append(tokens[idx])

            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count,
                "invalid_tokens": invalid_tokens,
            }

        except Exception as e:
            return {
                "success_count": 0,
                "failure_count": len(tokens),
                "error": str(e),
                "invalid_tokens": [],
            }
