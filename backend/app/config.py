from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Director Workspace"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"
    
    # DB
    DATABASE_URL: str = "postgresql+asyncpg://director:director_dev_secret_2026@localhost:5432/director_workspace"
    
    # Security
    SECRET_KEY: str = "super_secret_jwt_key_change_in_production_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"
    
    # MinIO / Object Storage
    MINIO_ENDPOINT: str = "http://localhost:9000"
    MINIO_ROOT_USER: str = "minioadmin"
    MINIO_ROOT_PASSWORD: str = "minioadmin_secret_2026"
    MINIO_BUCKET_NAME: str = "storyboard-assets"
    MINIO_PUBLIC_URL: str = "http://localhost:9000/storyboard-assets"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
