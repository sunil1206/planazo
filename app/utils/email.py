"""Thin wrapper around the Resend SDK used directly in router endpoints."""
from app.core.config import settings


def send_email(to: str | list, subject: str, html: str, from_email: str = None):
    """Synchronous Resend send — use only in Celery tasks or startup hooks."""
    import resend
    resend.api_key = settings.RESEND_API_KEY
    return resend.Emails.send({
        "from": from_email or settings.EMAIL_FROM,
        "to": [to] if isinstance(to, str) else to,
        "subject": subject,
        "html": html,
    })


async def send_email_async(to: str | list, subject: str, html: str, from_email: str = None):
    """Async wrapper using asyncio.to_thread so it doesn't block the event loop."""
    import asyncio
    return await asyncio.to_thread(send_email, to, subject, html, from_email)
