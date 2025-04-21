import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, computed_field, ConfigDict
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

class Settings(BaseSettings):
    # API settings
    API_VERSION: str = "v1"
    PROJECT_NAME: str = "AI Customer Support Agent"
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")

    # Authentication settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    
    # LLM settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4")
    
    # Application settings
    ESCALATION_THRESHOLD: float = float(os.getenv("ESCALATION_THRESHOLD", "0.7"))
    FOLLOWUP_DAYS: int = int(os.getenv("FOLLOWUP_DAYS", "3"))
    
    # Use computed_field for Pydantic v2 compatibility
    origins_raw: str = Field(
        default="http://localhost:3000",
        env="ORIGINS",
        description="comma‑separated CORS origins"
    )

    @computed_field
    def ORIGINS(self) -> List[str]:
        return [s.strip() for s in self.origins_raw.split(",") if s.strip()]

    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

# Create settings instance
settings = Settings()
__all__ = ["settings"]