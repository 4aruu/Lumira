from fastapi import APIRouter, HTTPException

from models.schemas import OTPGenerateRequest, OTPVerifyRequest
from auth import otp_manager, email_service, rate_limiter

router = APIRouter()


@router.post("/api/auth/otp/generate")
async def generate_otp(request: OTPGenerateRequest):
    email = request.email.lower().strip()
    if not rate_limiter.is_allowed(email): raise HTTPException(429, "Too many requests")
    session_id, otp = otp_manager.create_otp(email)
    if email_service.send_otp(email, otp):
        return {"success": True, "message": "OTP Sent", "session_id": session_id}
    raise HTTPException(500, "Email Failed")


@router.post("/api/auth/otp/verify")
async def verify_otp(request: OTPVerifyRequest):
    success, result = otp_manager.verify_otp(request.session_id, request.otp)
    if success: return {"success": True, "email": result}
    raise HTTPException(401, result)
