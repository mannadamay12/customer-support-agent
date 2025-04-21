import asyncio
from app.tasks.scheduler import run_scheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import inquiries, responses, users
from app.core.config import settings
from app.db.session import engine
from app.db.models import Base
from app.websocket.server import socket_app

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Customer Support API",
    description="API for AI-powered customer support agent",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(inquiries.router, prefix="/api/inquiries", tags=["inquiries"])
app.include_router(responses.router, prefix="/api/responses", tags=["responses"])
app.include_router(users.router, prefix="/api/users", tags=["users"])

# Mount Socket.IO app
app.mount("/ws", socket_app)

@app.get("/", tags=["health"])
async def health_check():
    return {"status": "healthy", "message": "AI Customer Support API is running"}

@app.on_event("startup")
async def startup_event():
    """Start background tasks when the application starts"""
    # Start scheduler in the background
    asyncio.create_task(run_scheduler())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)