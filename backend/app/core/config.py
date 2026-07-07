from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    MONGODB_URL: str = "mongodb://localhost:27017/aicoo_db"
    JWT_SECRET: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    TAVILY_API_KEY: str = ""
    MURF_API_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    APP_NAME: str = "AI COO"
    DEBUG: bool = True

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
