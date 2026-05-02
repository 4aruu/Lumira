from typing import Optional
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    active_file: Optional[str] = None
    session_id: Optional[str] = None   # visitor session — scopes conversation memory


class OTPGenerateRequest(BaseModel):
    email: str


class OTPVerifyRequest(BaseModel):
    session_id: str
    otp: str


class SessionStartRequest(BaseModel):
    session_id: str
    project: str


class SessionHeartbeatRequest(BaseModel):
    session_id: str
