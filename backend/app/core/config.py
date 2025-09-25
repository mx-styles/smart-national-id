from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./queue_management.db"
    
    # JWT
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS
    allowed_origins: list = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
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
    
    class Config:
        env_file = ".env"

settings = Settings()