"""
Async email tasks via Resend — replaces Django's email backend tasks.
"""
from app.workers.celery_app import celery_app
from app.core.config import settings


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def send_email_task(self, to: str | list, subject: str, html: str, from_email: str = None):
    """Send a transactional email via Resend."""
    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": from_email or settings.EMAIL_FROM,
            "to": [to] if isinstance(to, str) else to,
            "subject": subject,
            "html": html,
        })
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_rsvp_notification_task(self, owner_email: str, rsvp_name: str, website_slug: str):
    """Notify couple when a new RSVP arrives."""
    html = f"""
    <p>A new RSVP has been submitted for your wedding website <b>{website_slug}</b>.</p>
    <p>Name: <b>{rsvp_name}</b></p>
    """
    send_email_task.delay(
        to=owner_email,
        subject="New RSVP received",
        html=html,
    )


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_enquiry_notification_task(self, vendor_email: str, enquiry_name: str, vendor_slug: str):
    """Notify vendor when a new enquiry arrives."""
    html = f"""
    <p>You have a new enquiry on your vendor profile <b>{vendor_slug}</b>.</p>
    <p>From: <b>{enquiry_name}</b></p>
    <p>Log in to view and respond.</p>
    """
    send_email_task.delay(
        to=vendor_email,
        subject="New enquiry received",
        html=html,
    )
