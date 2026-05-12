import os

from dotenv import load_dotenv


load_dotenv()


class BaseConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
    ADMIN_BOOTSTRAP_EMAIL = os.getenv("ADMIN_BOOTSTRAP_EMAIL", "admin@kpopdance.local")
    ADMIN_BOOTSTRAP_PASSWORD = os.getenv("ADMIN_BOOTSTRAP_PASSWORD", "change-me-admin")
    JWT_TTL_MINUTES = int(os.getenv("JWT_TTL_MINUTES", "120"))
    RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "60"))
    MAX_VIDEO_UPLOAD_MB = int(os.getenv("MAX_VIDEO_UPLOAD_MB", "250"))
    VIDEO_PREVIEW_FRAME_COUNT = int(os.getenv("VIDEO_PREVIEW_FRAME_COUNT", "12"))
    VIDEO_PREVIEW_FPS = float(os.getenv("VIDEO_PREVIEW_FPS", "1"))
    VIDEO_UPLOAD_DIR = os.getenv(
        "VIDEO_UPLOAD_DIR",
        os.path.join("storage", "video_uploads"),
    )
    MAX_CONTENT_LENGTH = MAX_VIDEO_UPLOAD_MB * 1024 * 1024
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:password@localhost:3306/avatar_dance_db?charset=utf8mb4",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ]
    API_PUBLIC_BASE_URL = os.getenv("API_PUBLIC_BASE_URL", "http://127.0.0.1:5000")


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    CORS_ORIGINS = ["http://localhost:3000"]


class ProductionConfig(BaseConfig):
    DEBUG = False


config_map = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
