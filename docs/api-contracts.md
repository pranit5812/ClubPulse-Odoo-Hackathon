# ClubPulse API Contracts & Data Specifications

All API routes are prefixed under `/api`. All JSON responses follow consistent envelope patterns, and standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`).

---

## 1. Authentication (`/api/auth`)
- `POST /api/auth/register`
  - Body: `{ email, password, full_name, roll_number, phone?, role? }`
  - Response: `{ access_token, token_type, user: { id, email, full_name, role, membership_status } }`
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Response: `{ access_token, token_type, user: { id, email, full_name, role, membership_status } }`
- `GET /api/auth/me`
  - Headers: `Authorization: Bearer <token>`
  - Response: Current user profile with live membership and permissions.

---

## 2. Memberships (`/api/members`)
- `GET /api/members` (Organizer / Treasurer / Admin)
  - Query: `?status=active|pending|expired&search=<query>&page=1&limit=20`
- `POST /api/members/renew` (Student / Admin)
  - Body: `{ member_id?, duration_months: 12, payment_reference? }`
- `PATCH /api/members/{member_id}/status` (Admin / Organizer)
  - Body: `{ status: "active" | "expired" | "suspended" }`

---

## 3. Events & Ticketing (`/api/events`, `/api/tickets`)
- `GET /api/events` (Public / Authenticated)
  - Returns list of events, capacities, member vs non-member ticket prices (in paise).
- `POST /api/events` (Organizer / Admin)
  - Body: `{ title, description, venue, event_date, capacity, member_price_paise, non_member_price_paise, banner_url?, tags? }`
- `POST /api/tickets/book` (Authenticated)
  - Body: `{ event_id, quantity, attendee_names? }`
  - Atomic checks: ensures `booked_count + quantity <= capacity`.
  - Applies member discount automatically based on caller's membership status.
- `GET /api/tickets/my-tickets` (Authenticated)
  - Returns user's tickets, booking status, and unique QR token payload.
- `POST /api/tickets/check-in` (Organizer / Admin)
  - Body: `{ qr_payload: string }`
  - Atomic check-in preventing double attendance scan. Returns `{ success: true, attendee_name, event_title, check_in_time }`.

---

## 4. Merchandise & Inventory (`/api/products`, `/api/orders`)
- `GET /api/products` (Catalog listing with size stock breakdowns).
- `POST /api/products` (Organizer / Admin: Create product with SKU & size variants).
- `POST /api/orders` (Place order with atomic stock decrements).
- `GET /api/orders/my-orders` & `GET /api/orders` (Organizer view).

---

## 5. Tasks & Fundraisers (`/api/tasks`)
- `GET /api/tasks` (Filter by status, priority, due date).
- `POST /api/tasks` (Create task, assignees, critical flag).
- `PATCH /api/tasks/{task_id}/status` (`todo` | `in_progress` | `done`).

---

## 6. Financial Ledger & Expenses (`/api/transactions`, `/api/expenses`)
- `GET /api/transactions/summary`
  - Returns `{ cash_received_paise, cash_paid_paise, pending_receivables_paise, committed_obligations_paise, net_balance_paise, category_breakdown }`.
- `GET /api/transactions` (Ledger list with filters, date ranges, export links).
- `GET /api/transactions/export/csv` (Downloadable CSV ledger).
- `POST /api/expenses/claim` (Submit reimbursement claim with receipt details).
- `PATCH /api/expenses/{expense_id}/review` (Treasurer approval & payout status).

---

## 7. Operational Risk Engine (`/api/risk`)
- `GET /api/risk/evaluate`
  - Analyzes current database state across all collections.
  - Returns:
    ```json
    {
      "readiness_score": 82,
      "score_formula": "Weighted composite: 30% Financial Solvency + 25% Task Velocity + 25% Event Readiness + 20% Inventory Health",
      "risk_items": [
        {
          "id": "RISK-01",
          "severity": "CRITICAL",
          "category": "FINANCIAL",
          "title": "Committed Expenses Exceed Current Cash Reserves",
          "explanation": "Committed obligations (₹45,000) exceed liquid cash (₹38,000) by ₹7,000.",
          "source_record": { "type": "ledger", "id": "summary" },
          "recommended_action": "Pause discretionary reimbursements or expedite pending ticket/merch receivables.",
          "resolved": false
        }
      ]
    }
    ```

---

## 8. Live Club Simulator (`/api/simulator`)
- `POST /api/simulator/simulate`
  - Body:
    ```json
    {
      "event_id": "optional_event_id",
      "target_capacity": 200,
      "member_price_paise": 15000,
      "non_member_price_paise": 25000,
      "expected_attendance_rate": 0.85,
      "member_ratio": 0.60,
      "estimated_expenses_paise": 2800000,
      "reserve_threshold_paise": 500000
    }
    ```
  - Response: Current plan vs Proposed scenario, projected revenue, net surplus/deficit, reserve headroom, warnings. Zero database mutation.
- `POST /api/simulator/apply`
  - Validates and applies verified simulation parameters to the live event record.

---

## 9. Semester Handover Report (`/api/reports/handover`)
- `GET /api/reports/handover`
  - Comprehensive snapshot of opening cash, closing cash, revenues, expenses, inventory value, pending obligations, top events, and continuity recommendations.
- `GET /api/reports/handover/export/csv` (Instant CSV download).
