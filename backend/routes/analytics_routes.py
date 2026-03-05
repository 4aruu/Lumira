from fastapi import APIRouter

from models.schemas import SessionStartRequest, SessionHeartbeatRequest
import analytics

router = APIRouter()


@router.post("/api/analytics/session/start")
def analytics_session_start(request: SessionStartRequest):
    analytics.start_session(request.session_id, request.project)
    return {"status": "ok"}


@router.post("/api/analytics/session/heartbeat")
def analytics_session_heartbeat(request: SessionHeartbeatRequest):
    analytics.heartbeat_session(request.session_id)
    return {"status": "ok"}


@router.get("/api/analytics")
def analytics_all():
    return analytics.get_all_analytics()


@router.get("/api/analytics/{project}")
def analytics_project(project: str):
    return analytics.get_project_analytics(project)
