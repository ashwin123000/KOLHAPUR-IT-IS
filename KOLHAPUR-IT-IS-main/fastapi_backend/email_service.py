import logging
import os
import smtplib
from email.mime.text import MIMEText


logger = logging.getLogger(__name__)

SMTP_EMAIL = os.getenv("SMTP_EMAIL", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))


def send_otp(email: str, otp: str) -> None:
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        raise RuntimeError("SMTP_EMAIL and SMTP_PASSWORD must be configured")

    message = MIMEText(f"Your Architect-X OTP is {otp}. It expires in 10 minutes.")
    message["Subject"] = "Architect-X OTP Verification"
    message["From"] = SMTP_EMAIL
    message["To"] = email

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(message)
    except Exception:
        logger.exception("Failed to send OTP to %s", email)
        raise
