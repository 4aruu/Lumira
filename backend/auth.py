# auth.py - Add this to your backend folder
import secrets
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta
from typing import Optional, Dict
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class OTPManager:
    """
    In-memory OTP storage with expiry
    For production, use Redis or database
    """

    def __init__(self):
        # Format: {session_id: {email, otp, expires_at}}
        self.otp_store: Dict[str, dict] = {}
        self.OTP_VALIDITY_MINUTES = 5
        self.MAX_ATTEMPTS = 3

    def generate_otp(self) -> str:
        """Generate a secure 6-digit OTP"""
        return "".join([str(secrets.randbelow(10)) for _ in range(6)])

    def generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return secrets.token_urlsafe(32)

    def create_otp(self, email: str) -> tuple[str, str]:
        """
        Create OTP and return (session_id, otp)
        """
        session_id = self.generate_session_id()
        otp = self.generate_otp()
        expires_at = datetime.now() + timedelta(minutes=self.OTP_VALIDITY_MINUTES)

        self.otp_store[session_id] = {
            "email": email,
            "otp": otp,
            "expires_at": expires_at,
            "attempts": 0
        }

        # Cleanup expired OTPs
        self._cleanup_expired()

        return session_id, otp

    def verify_otp(self, session_id: str, otp: str) -> tuple[bool, str]:
        """
        Verify OTP and return (success, message)
        """
        if session_id not in self.otp_store:
            return False, "Invalid or expired session"

        session = self.otp_store[session_id]

        # Check expiry
        if datetime.now() > session["expires_at"]:
            del self.otp_store[session_id]
            return False, "OTP expired"

        # Check attempts
        if session["attempts"] >= self.MAX_ATTEMPTS:
            del self.otp_store[session_id]
            return False, "Too many attempts"

        # Verify OTP
        if session["otp"] == otp:
            email = session["email"]
            del self.otp_store[session_id]
            return True, email
        else:
            session["attempts"] += 1
            return False, "Invalid OTP"

    def _cleanup_expired(self):
        """Remove expired OTPs from memory"""
        now = datetime.now()
        expired = [sid for sid, data in self.otp_store.items()
                   if now > data["expires_at"]]
        for sid in expired:
            del self.otp_store[sid]


class EmailService:
    """
    Free email service using Gmail SMTP
    """

    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 465
        self.sender_email = os.getenv("SMTP_EMAIL")
        self.sender_password = os.getenv("SMTP_PASSWORD")

        if not self.sender_email or not self.sender_password:
            raise ValueError(
                "SMTP credentials not found! Set SMTP_EMAIL and SMTP_PASSWORD in .env"
            )

    def send_otp(self, receiver_email: str, otp: str) -> bool:
        """
        Send OTP via email
        Returns True if successful, False otherwise
        """
        try:
            msg = EmailMessage()

            # Email content
            msg.set_content(f"""
Hello,

Your LUmira Exhibitor Portal verification code is:

{otp}

This code will expire in 5 minutes.

If you didn't request this code, please ignore this email.

Best regards,
LUmira Team
            """)

            # HTML version (optional, nicer looking)
            msg.add_alternative(f"""
<html>
  <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <h2 style="color: #7c3aed; margin-bottom: 20px;">LUmira Exhibitor Portal</h2>
      <p style="font-size: 16px; color: #333;">Hello,</p>
      <p style="font-size: 16px; color: #333;">Your verification code is:</p>
      <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed; border-radius: 5px; margin: 20px 0;">
        {otp}
      </div>
      <p style="font-size: 14px; color: #666;">This code will expire in 5 minutes.</p>
      <p style="font-size: 14px; color: #666;">If you didn't request this code, please ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      <p style="font-size: 12px; color: #999;">Best regards,<br>LUmira Team</p>
    </div>
  </body>
</html>
            """, subtype='html')

            msg['Subject'] = 'Your LUmira Verification Code'
            msg['From'] = f"LUmira <{self.sender_email}>"
            msg['To'] = receiver_email

            # Send email via Gmail SMTP
            with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port) as smtp:
                smtp.login(self.sender_email, self.sender_password)
                smtp.send_message(msg)

            return True

        except Exception as e:
            print(f"❌ Email send error: {e}")
            return False


# Singleton instances
otp_manager = OTPManager()
email_service = EmailService()


# Rate limiting (simple in-memory version)
class RateLimiter:
    """
    Prevent OTP spam
    """

    def __init__(self, max_requests: int = 3, window_minutes: int = 10):
        self.max_requests = max_requests
        self.window_minutes = window_minutes
        self.requests: Dict[str, list] = {}  # {email: [timestamp1, timestamp2, ...]}

    def is_allowed(self, email: str) -> bool:
        """Check if request is allowed"""
        now = datetime.now()
        cutoff = now - timedelta(minutes=self.window_minutes)

        # Get request history for this email
        if email not in self.requests:
            self.requests[email] = []

        # Remove old requests
        self.requests[email] = [
            ts for ts in self.requests[email] if ts > cutoff
        ]

        # Check if under limit
        if len(self.requests[email]) >= self.max_requests:
            return False

        # Add current request
        self.requests[email].append(now)
        return True


rate_limiter = RateLimiter()