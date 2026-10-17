# ClubPulse 4-Member Hackathon Team Workflow

## 1. Team Ownership & Domain Responsibility
To maximize throughput and prevent merge conflicts across the 24-hour sprint, ClubPulse divides responsibilities across four distinct architectural pillars:

### Member 1: Frontend Architecture & Client Pages
- **Owner Scope**:
  - Routing (`App.jsx`, layout wrappers, role-based guard `ProtectedRoute.jsx`).
  - Student and public flows: Landing page, Event exploration, Ticket Booking, "My Tickets" QR display, Merchandise catalog, Student dashboard.
  - API Client (`src/api/client.js`) and Auth Context (`src/context/AuthContext.jsx`).
  - Toast feedback, loading skeletons, modal dialogs, and error boundaries.

### Member 2: FastAPI Core, Auth, MongoDB & Resource Services
- **Owner Scope**:
  - FastAPI serverless entry point (`backend/api/index.py`) & application factory (`app/main.py`).
  - PyMongo Atlas connection pool, indexing, and mock fallback (`app/database/mongodb.py`).
  - Authentication router (`/api/auth`), JWT generation/verification, bcrypt hashing.
  - Core CRUD routers: Memberships (`/api/members`), Events (`/api/events`), Tickets & QR scanner validation (`/api/tickets`), Products & Orders (`/api/products`, `/api/orders`), Announcements (`/api/announcements`), Tasks (`/api/tasks`).
  - Atomic inventory decrement and race-condition-safe ticket capacity locks.

### Member 3: Operational Risk Engine, Simulator & Financial Intelligence
- **Owner Scope**:
  - Deterministic Operational Risk Engine (`app/services/risk_engine.py` & `/api/risk`).
  - Integer paise currency arithmetic, financial ledger (`app/services/ledger_service.py`), category aggregation, and CSV export.
  - Live Club Simulator (`app/services/simulator_service.py` & `/api/simulator`): What-if scenario modeling with side-by-side delta analysis and non-mutating evaluations.
  - Semester Handover Report generator (`app/services/report_service.py` & `/api/reports`).

### Member 4: Design System, GSAP / Three.js Polish, Quality & Integration Testing
- **Owner Scope**:
  - Refined light theme design system with deep navy, indigo, teal, amber, and red semantic states.
  - GSAP entrance stagger, smooth section reveals, and reduced-motion compliance.
  - Three.js interactive 3D organizational network canvas on landing page with graceful WebGL fallback.
  - QR Code scanner component with mobile camera integration (`html5-qrcode`).
  - End-to-end integration tests, seed data generator (`app/database/seed_data.py`), and Vercel dual-app deployment configuration.

---

## 2. Git Branching & Merge Strategy
- `main`: Protected production-ready branch that deploys directly to Vercel.
- Feature branches follow:
  - `feature/auth-mongo-core` (Member 2)
  - `feature/ui-views-routes` (Member 1)
  - `feature/risk-engine-simulator` (Member 3)
  - `feature/design-polish-3d-tests` (Member 4)
- **Rules**:
  1. No direct commits to `main` without running `npm run build` and `pytest`.
  2. Every teammate makes meaningful commits with clear commit messages.
  3. API contracts in `docs/api-contracts.md` are the frozen source of truth.
