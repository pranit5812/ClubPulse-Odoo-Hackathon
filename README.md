# ClubPulse — Student Organization Intelligence Platform
> **Odoo Hackathon 2026** • University Club Operating System & Explainable Decision Support

"Know what your club can afford, what is at risk, and what to do next."

---

## 🌟 Executive Overview
**ClubPulse** is an intelligent operating platform for student organizations, collegiate societies, and campus chapters. Unlike generic CRUD portals or ungrounded generative AI chatbots, ClubPulse connects real-time data across student memberships, event ticket bookings, apparel inventory, and volunteer task boards to power three signature architectural differentiators:

1. **Deterministic Operational Risk Engine**: Audits real database records across modules to identify systemic financial deficits, critical overdue tasks, volunteer shortages, and inventory bottlenecks with explainable causes and direct remediation guidance.
2. **Live Club Simulator**: An interactive "what-if" stress-testing sandbox that lets organizers simulate event capacities, member ticket discounts, and attendance yields against liquid safety reserves with **guaranteed zero mutation of live records**.
3. **Semester Handover Report**: Generates a certified continuity audit of opening/closing cash (integer paise precision), categorized revenues, outstanding reimbursements, and inventory valuations with 1-click CSV export for incoming student executive boards.

---

## 🏗️ Repository Architecture
The repository is structured for two independently deployable applications on Vercel:

```
clubpulse/
├── frontend/                     # React 19 + Vite + Tailwind CSS + GSAP + Three.js
│   ├── src/
│   │   ├── api/client.js         # Centralized API client & INR currency utilities
│   │   ├── context/AuthContext.jsx # JWT session & role-based RBAC state
│   │   ├── components/           # Navbar, Sidebar, ThreeScene, StatCard, Badge, QRScannerModal
│   │   ├── pages/                # Landing, Auth, Student, Organizer & Executive Pages
│   │   ├── App.jsx               # Protected client-side routing
│   │   └── index.css             # Tailwind design tokens & custom styling
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json               # SPA routing rewrite rule
│   └── .env.example
├── backend/                      # Python FastAPI ASGI Serverless Backend
│   ├── api/
│   │   └── index.py              # Vercel serverless function entrypoint
│   ├── app/
│   │   ├── main.py               # FastAPI factory & CORS configuration
│   │   ├── core/                 # Config, security (bcrypt & JWT), dependencies
│   │   ├── database/             # PyMongo Atlas connection & seed generator
│   │   ├── schemas/              # Pydantic request/response validation schemas
│   │   ├── services/             # Risk Engine, Simulator, Ledger, Auth, Events
│   │   └── routers/              # Modular REST API endpoints (/api/*)
│   ├── tests/                    # Automated pytest integration test suite
│   ├── requirements.txt
│   ├── vercel.json               # Vercel Python runtime configuration
│   └── .env.example
├── docs/
│   ├── architecture.md           # System design & database modeling
│   ├── api-contracts.md          # Complete REST API specifications
│   └── team-workflow.md          # 4-member hackathon ownership & Git workflow
├── .gitignore
└── README.md
```

---

## 👥 Hackathon Demo Personas (1-Click Login)
For judges and evaluators, the application includes a quick-switcher in the top navbar and on the login page:

| Persona | Role | Email | Password | Permissions & Primary Flow |
|---|---|---|---|---|
| **Aarav Sharma** | Administrator | `admin@clubpulse.edu` | `admin123` | Full system access, Risk Engine, Simulator, Handover Report, DB seed |
| **Priya Nair** | Treasurer | `treasurer@clubpulse.edu` | `treasurer123` | Financial Ledger, Expense reimbursement approval & payout, Risk Engine |
| **Rohan Deshmukh** | Organizer | `organizer@clubpulse.edu` | `organizer123` | Event creation, QR Scanner lane, inventory sizing, Kanban task board |
| **Ananya Roy** | Student Member | `student@clubpulse.edu` | `student123` | 50% member discounts, QR pass viewer, volunteer checklist, store |
| **Vikram Malhotra** | Non-Member Student | `vikram@clubpulse.edu` | `student123` | Standard guest pricing, membership join & dues flow |

---

## ⚡ Quickstart & Local Development

### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env

# Run FastAPI development server
uvicorn app.main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive Swagger OpenAPI Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### 2. Frontend Setup
```bash
cd frontend

# Install node dependencies
npm install

# Configure environment variables
copy .env.example .env

# Start Vite development server
npm run dev
```
- Client App: `http://localhost:5173`

### 3. Running Automated Tests
```bash
cd backend
pytest tests
```
The automated test suite verifies:
- Health check & serverless lifecycle
- JWT authentication & invalid credential rejection
- Duplicate membership email prevention
- Event ticket capacity limits & member discount calculations
- Live QR check-in & duplicate entry rejection
- Operational Risk Engine explainable rule outputs
- Live Club Simulator non-mutating integrity
- Semester Handover Report & CSV export generation

---

## 🚀 Vercel Deployment Instructions

### Deploying the Backend API
1. Push repository to GitHub.
2. In Vercel, create a new project and select the repository.
3. Set the **Root Directory** to `backend`.
4. Configure Environment Variables in Vercel project settings:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI (`mongodb+srv://...`)
   - `MONGODB_DB_NAME`: `clubpulse`
   - `JWT_SECRET`: High-entropy secret key
   - `JWT_ALGORITHM`: `HS256`
   - `ALLOWED_ORIGINS`: Comma-separated list including your deployed frontend URL
   - `ENVIRONMENT`: `production`
5. Deploy. Vercel automatically detects `api/index.py` via `vercel.json`.

### Deploying the Frontend Client
1. In Vercel, create a second project from the same GitHub repository.
2. Set the **Root Directory** to `frontend`.
3. Set the **Framework Preset** to `Vite`.
4. Set Environment Variables:
   - `VITE_API_BASE_URL`: The URL of your deployed backend (e.g. `https://clubpulse-api.vercel.app`)
5. Deploy. The `frontend/vercel.json` rewrites all SPA routes to `/index.html`.

---

## 🔍 Key Technical Highlights
- **Integer Paise Financial Precision**: All currency amounts (membership fees, ticket prices, product prices, expenses) are stored and computed in integer paise (e.g., ₹150.00 = `15000` paise) to prevent IEEE-754 floating-point rounding drifts.
- **Atomic Concurrency Protection**: Ticket bookings use atomic `$expr` increments to strictly enforce capacity limits; merchandise orders atomically decrement variant size stocks (`sizes.$.stock`) to prevent negative inventory.
- **Three.js & GSAP Accessibility**: The landing page 3D organizational neural visual gracefully checks for WebGL availability, cleans up all GPU geometries/textures upon unmount, and disables animations when `prefers-reduced-motion` is detected.
- **Zero-Crash Database Resilience**: If external MongoDB Atlas credentials are not yet configured in local development, the backend automatically initializes an in-memory mock engine with pre-seeded demonstration data.

---

## ⚖️ Known Limitations & Future Roadmap
- **Payment Gateway Mock**: Monetary checkout uses verified internal transaction recording. Webhook integration with Razorpay / Stripe can be plugged into `app/services/ledger_service.py`.
- **Physical NFC Cards**: Current gate entry uses dynamic SVG QR code tokens with instant browser optical verification (`html5-qrcode`). RFID / NFC campus card scanning can be mapped to the same `/api/tickets/check-in` payload.

---

## 📜 License
Developed for the Odoo Hackathon 2026. MIT License.
