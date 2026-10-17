from fastapi import APIRouter
from app.database.mongodb import DatabaseManager
from app.database.seed_data import seed_database
from app.core.config import settings

router = APIRouter(tags=["Health & System"])

@router.get("/api/health")
def health_check():
    if DatabaseManager.is_mock:
        DatabaseManager.close()
    db = DatabaseManager.get_db()
    is_mock = DatabaseManager.is_mock
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "mock_in_memory" if is_mock else "mongodb_atlas_connected",
        "database_name": settings.MONGODB_DB_NAME,
        "environment": settings.ENVIRONMENT
    }

@router.post("/api/system/seed")
def trigger_seed(force: bool = False):
    result = seed_database(force=force)
    return result
