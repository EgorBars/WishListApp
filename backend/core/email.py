import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from core.config import get_settings

logger = logging.getLogger("wishlist_app")


def send_password_reset_email(to_email: str, reset_token: str) -> None:
    settings = get_settings()
    link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={reset_token}"
    if not settings.smtp_user:
        logger.info("SMTP_USER not set; skipping email send (reset link generated for dev).")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Password reset"
    msg["From"] = settings.smtp_user
    msg["To"] = to_email
    body = (
        "You requested a password reset. Open the link below (valid for a limited time):\n\n"
        f"{link}\n\n"
        "If you did not request this, ignore this email."
    )
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, to_email, msg.as_string())
        logger.info("Password reset email sent.")
    except Exception:
        logger.exception("Failed to send password reset email.")
