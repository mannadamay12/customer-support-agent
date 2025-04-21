import os
from pydantic import BaseSettings
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

class Settings(BaseSettings):
    # API settings
    API_VERSION: str = "v1"
    PROJECT_NAME: str = "AI Customer Support Agent"
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    
    # CORS settings
    ORIGINS: list = [
        "http://localhost:3000",  # Frontend development server
        "https://yourdomain.com"  # Production frontend
    ]
    
    # Authentication settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    
    # LLM settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4")
    
    # Application settings
    ESCALATION_THRESHOLD: float = 0.7  # Confidence threshold for automatic responses
    FOLLOWUP_DAYS: int = 3  # Days to wait before follow-up

    class Config:
        case_sensitive = True


settings = Settings()