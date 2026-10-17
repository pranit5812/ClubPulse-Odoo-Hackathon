import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Skyline API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    
    # MongoDB Atlas
    MONGODB_URI: str = "mongodb+srv://harsh:Harsh_1617@cluster0.hv7m6.mongodb.net/?appName=Cluster0"
    MONGODB_DB_NAME: str = "clubpulse"
    
    # Security
    JWT_SECRET: str = "super_secret_clubpulse_hackathon_jwt_key_2026_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Razorpay Gateway
    RAZORPAY_KEY_ID: str = "rzp_test_I1o9YOZinQtIYu"
    RAZORPAY_KEY_SECRET: str = "qz2S1Gdg4idESeQaqMxH0JIc"

    # SMTP Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_EMAIL: str = "harshparmar1617@gmail.com"
    SMTP_PASSWORD: str = "ccmpjeidtucfgzqq"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,https://clubpulse.vercel.app"

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
