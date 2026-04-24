"""Gmail SMTP email service for OTP delivery.

Rules:
- TLS via STARTTLS on port 587
- Uses EMAIL_USER / EMAIL_PASS (App Password) from environment
- On ANY failure: raise — never fake success
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    """Raised when OTP email cannot be sent."""


def _build_otp_message(to_email: str, otp: str) -> MIMEMultipart:
    """Compose the OTP email (plain-text + HTML)."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your Architect-X Verification Code"
    msg["From"] = settings.EMAIL_USER
    msg["To"] = to_email

    plain = (
        f"Your Architect-X OTP is: {otp}\n\n"
        "This code expires in 5 minutes.\n"
        "Do NOT share it with anyone."
    )
    html = f"""
    <html>
      <body style="font-family:sans-serif;background:#0f0f0f;color:#e0e0e0;padding:32px;">
        <div style="max-width:480px;margin:auto;background:#1a1a2e;border-radius:12px;padding:32px;">
          <h2 style="color:#a78bfa;margin-top:0;">Architect-X Verification</h2>
          <p>Your one-time passcode is:</p>
          <div style="font-size:2.5rem;font-weight:700;letter-spacing:0.3rem;
                      color:#fff;background:#2d2d4e;border-radius:8px;
                      padding:16px 24px;display:inline-block;margin:8px 0;">
            {otp}
          </div>
          <p style="color:#9ca3af;font-size:0.85rem;margin-top:24px;">
            This code expires in <strong>5 minutes</strong>.<br/>
            If you did not request this, please ignore this email.
          </p>
        </div>
      </body>
    </html>
    """

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))
    return msg


async def send_otp_email(to_email: str, otp: str) -> None:
    """Send OTP to *to_email* via Gmail SMTP (STARTTLS).

    Raises:
        EmailDeliveryError: on any SMTP / credential / network failure.
    """
    if not settings.EMAIL_USER or not settings.EMAIL_PASS:
        raise EmailDeliveryError(
            "EMAIL_USER or EMAIL_PASS not configured. "
            "Set environment variables before sending OTP."
        )

    msg = _build_otp_message(to_email, otp)

    try:
        logger.info("Connecting to SMTP %s:%d", settings.SMTP_HOST, settings.SMTP_PORT)
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASS)
            server.sendmail(settings.EMAIL_USER, to_email, msg.as_string())
            logger.info("OTP email sent to %s", to_email)
    except smtplib.SMTPAuthenticationError as exc:
        logger.exception("SMTP authentication failed — check EMAIL_USER / EMAIL_PASS (App Password)")
        raise EmailDeliveryError(
            "Email delivery failed: authentication error. "
            "Ensure you are using a Gmail App Password."
        ) from exc
    except smtplib.SMTPException as exc:
        logger.exception("SMTP error while sending OTP")
        raise EmailDeliveryError(f"Email delivery failed: {exc}") from exc
    except OSError as exc:
        logger.exception("Network error while sending OTP")
        raise EmailDeliveryError(f"Email delivery failed (network): {exc}") from exc
