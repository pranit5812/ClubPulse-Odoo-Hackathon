import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.database.mongodb import DatabaseManager
from app.database.seed_data import seed_database

# Routers
from app.routers import (
    health, auth, members, events, tickets,
    products, orders, announcements, tasks,
    transactions, expenses, risk, simulator, reports,
    readiness, correlation, actions, notifications, audit,
    payments, volunteer, users
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clubpulse.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB Atlas connection and ensure demo data is populated
    logger.info("Initializing ClubPulse application...")
    try:
        db = DatabaseManager.get_db()
        # Seed if empty
        if db["users"].count_documents({}) == 0:
            logger.info("Database is empty. Populating with demo records...")
            seed_database(force=False)
            logger.info("Initial seed completed.")
        from app.services.auth_service import AuthService
        AuthService.ensure_fixed_staff_users(db)
        logger.info("Fixed staff accounts verified.")
    except Exception as e:
        logger.error(f"Startup initialization notice: {e}")
    yield
    # Shutdown
    DatabaseManager.close()
    logger.info("ClubPulse application shutdown.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Student Organization Operating Platform for Odoo Hackathon",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(members.router)
app.include_router(volunteer.router)
app.include_router(events.router)
app.include_router(tickets.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(announcements.router)
app.include_router(tasks.router)
app.include_router(transactions.router)
app.include_router(expenses.router)
app.include_router(risk.router)
app.include_router(simulator.router)
app.include_router(reports.router)
app.include_router(readiness.router)
app.include_router(correlation.router)
app.include_router(actions.router)
app.include_router(notifications.router)
app.include_router(audit.router)
app.include_router(payments.router)
app.include_router(users.router)

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")
