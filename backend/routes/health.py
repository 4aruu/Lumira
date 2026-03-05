from fastapi import APIRouter

router = APIRouter()


@router.get("/api/health")
def read_health():
    return {"status": "Lumira Backend Online"}
