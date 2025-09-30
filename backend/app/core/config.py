import json
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    # Database
    database_url: str = "sqlite:///./queue_management.db"
    
    # JWT
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://109.199.112.143:3000",
        "https://109.199.112.143",
    ]
    allowed_origin_regex: Optional[str] = None
    
    # SMS/Email settings (placeholders)
    sms_api_key: Optional[str] = None
    email_smtp_server: Optional[str] = None
    email_username: Optional[str] = None
    email_password: Optional[str] = None
    
    # Redis for background tasks
    redis_url: str = "redis://localhost:6379"
    
    # App settings
    app_name: str = "Smart e-National ID Queue Management"
    debug: bool = True
    
    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _coerce_allowed_origins(cls, value):
        """Allow ALLOWED_ORIGINS to be provided as comma separated or JSON list."""
        if value is None:
            return []
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            try:
                loaded = json.loads(raw)
                if isinstance(loaded, list):
                    return [str(origin).strip() for origin in loaded if str(origin).strip()]
            except json.JSONDecodeError:
                pass
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        return value

    @property
    def cors_origins(self) -> List[str]:
        seen = set()
        origins: List[str] = []
        for origin in self.allowed_origins:
            if origin not in seen:
                seen.add(origin)
                origins.append(origin)
        return origins or ["http://localhost:3000"]
    class Config:
        env_file = ".env"

settings = Settings()