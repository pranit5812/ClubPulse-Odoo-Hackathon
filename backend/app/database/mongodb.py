import logging
from typing import Optional
from pymongo import MongoClient
from pymongo.database import Database
import mongomock
from app.core.config import settings

logger = logging.getLogger("clubpulse.database")

class DatabaseManager:
    client: Optional[MongoClient] = None
    db: Optional[Database] = None
    is_mock: bool = False

    @classmethod
    def get_db(cls) -> Database:
        if cls.db is not None:
            return cls.db
        
        # Try real MongoDB connection
        try:
            logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
            real_client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )
            # Ping to verify
            real_client.admin.command('ping')
            cls.client = real_client
            cls.db = real_client[settings.MONGODB_DB_NAME]
            cls.is_mock = False
            logger.info("Successfully connected to live MongoDB Atlas / instance.")
        except Exception as e:
            logger.warning(
                f"Live MongoDB not reachable ({e}). Falling back to in-memory Mongomock database for seamless dev & test execution."
            )
            mock_client = mongomock.MongoClient()
            cls.client = mock_client
            cls.db = mock_client[settings.MONGODB_DB_NAME]
            cls.is_mock = True

        cls._create_indexes()
        return cls.db

    @classmethod
    def _create_indexes(cls):
        try:
            if cls.db is not None:
                cls.db["users"].create_index("email", unique=True)
                cls.db["members"].create_index("email", unique=True)
                cls.db["tickets"].create_index("qr_token", unique=True)
                cls.db["products"].create_index("sku", unique=True)
        except Exception as e:
            logger.warning(f"Index creation note: {e}")

    @classmethod
    def close(cls):
        if cls.client:
            cls.client.close()
            cls.client = None
            cls.db = None

def get_database() -> Database:
    return DatabaseManager.get_db()
