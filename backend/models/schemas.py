from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    active_file: str = None


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
