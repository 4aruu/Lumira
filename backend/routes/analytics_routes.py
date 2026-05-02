import os

from fastapi import APIRouter

from models.schemas import SessionStartRequest, SessionHeartbeatRequest
import analytics

router = APIRouter()

# Dataset directory path
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATASET_DIR = os.path.join(_BASE_DIR, "Dataset")


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
    # Get all dataset filenames so new files with 0 activity are included
    dataset_files = []
    try:
        if os.path.isdir(_DATASET_DIR):
            dataset_files = [
                f for f in os.listdir(_DATASET_DIR)
                if os.path.isfile(os.path.join(_DATASET_DIR, f))
            ]
    except OSError:
        pass
    return analytics.get_all_analytics(dataset_files=dataset_files)


# NOTE: /clear must be declared BEFORE /{project} so the exact path takes priority
@router.delete("/api/analytics/clear")
def analytics_clear():
    """Wipe ALL analytics data — hard reset to zero."""
    analytics.clear_all_analytics()
    # Return fresh (all-zero) stats
    dataset_files = []
    try:
        if os.path.isdir(_DATASET_DIR):
            dataset_files = [
                f for f in os.listdir(_DATASET_DIR)
                if os.path.isfile(os.path.join(_DATASET_DIR, f))
            ]
    except OSError:
        pass
    return analytics.get_all_analytics(dataset_files=dataset_files)


@router.get("/api/analytics/{project}")
def analytics_project(project: str):
    return analytics.get_project_analytics(project)
