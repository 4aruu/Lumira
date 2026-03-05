import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# --- ROUTE IMPORTS ---
from routes.health import router as health_router
from routes.chat import router as chat_router
from routes.files import router as files_router
from routes.analytics_routes import router as analytics_router
from routes.auth_routes import router as auth_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REGISTER ROUTERS ---
app.include_router(health_router)
app.include_router(chat_router)
app.include_router(files_router)
app.include_router(analytics_router)
app.include_router(auth_router)

# --- SERVE FRONTEND ---
frontend_path = "../frontend/dist"
if os.path.exists(frontend_path):
    print("✅ Frontend Build Found! Serving UI...")
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)