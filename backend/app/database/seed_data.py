import uuid
from datetime import datetime, date, timedelta
from app.database.mongodb import get_database
from app.core.security import hash_password

def seed_database(force: bool = False):
    db = get_database()

    # Check if already seeded
    if not force and db["users"].count_documents({}) > 0:
        return {"message": "Database already contains records. Pass force=True to re-seed."}

    if force:
        db["users"].delete_many({})
        db["members"].delete_many({})
        db["events"].delete_many({})
        db["tickets"].delete_many({})
        db["products"].delete_many({})
        db["orders"].delete_many({})
        db["announcements"].delete_many({})
        db["tasks"].delete_many({})
        db["transactions"].delete_many({})
        db["expenses"].delete_many({})
        db["notifications"].delete_many({})
        db["correlated_risks"].delete_many({})
        db["audit_logs"].delete_many({})
        db["action_center_items"].delete_many({})

    now = datetime.utcnow()
    now_iso = now.isoformat()
    today = date.today()

    # 1. USERS & ROLES
    demo_users = [
        {
            "id": "usr_fixed_admin",
            "email": "harshparmar1617@gmail.com",
            "hashed_password": hash_password("123456"),
            "full_name": "Harsh Parmar",
            "roll_number": "ADM-001",
            "phone": "+91 98765 43210",
            "role": "admin",
            "membership_status": "active",
            "membership_expiry": (today + timedelta(days=365)).isoformat(),
            "created_at": now_iso
        },
        {
            "id": "usr_fixed_organizer",
            "email": "pranitpawar3004@gmail.com",
            "hashed_password": hash_password("123456"),
            "full_name": "Pranit Pawar",
            "roll_number": "ORG-003",
            "phone": "+91 98765 43212",
            "role": "organizer",
            "membership_status": "active",
            "membership_expiry": (today + timedelta(days=365)).isoformat(),
            "created_at": now_iso
        },
        {
            "id": "usr_fixed_treasurer",
            "email": "yugr362@gmail.com",
            "hashed_password": hash_password("123456"),
            "full_name": "Yug",
            "roll_number": "TRS-002",
            "phone": "+91 98765 43211",
            "role": "treasurer",
            "membership_status": "active",
            "membership_expiry": (today + timedelta(days=365)).isoformat(),
            "created_at": now_iso
        },
        {
            "id": "usr_admin01",
            "email": "admin@clubpulse.edu",
            "hashed_password": hash_password("admin123"),
            "full_name": "Aarav Sharma",
            "roll_number": "ADM-001",
            "phone": "+91 98765 43210",
            "role": "admin",
            "membership_status": "active",
            "membership_expiry": (today + timedelta(days=365)).isoformat(),
            "created_at": now_iso
        },
        {
            "id": "usr_treasurer01",
            "email": "treasurer@clubpulse.edu",
            "hashed_password": hash_password("treasurer123"),
            "full_name": "Priya Nair",
            "roll_number": "TRS-002",
            "phone": "+91 98765 43211",
            "role": "treasurer",
            "membership_status": "active",
            "membership_expiry": (today + timedelta(days=365)).isoformat(),
            "created_at": now_iso
        },
        {
            "id": "usr_organizer01",
            "email": "organizer@clubpulse.edu",
            "hashed_password": hash_password("organizer123"),
            "full_name": "Rohan Deshmukh",
            "roll_number": "ORG-003",
            "phone": "+91 98765 43212",
            "role": "organizer",
            "membership_status": "active",
            "membership_expiry": (today + timedelta(days=365)).isoformat(),
            "created_at": now_iso
        },
        {
            "id": "usr_student01",
            "email": "student@clubpulse.edu",
            "hashed_password": hash_password("student123"),
            "full_name": "Ananya Roy",
            "roll_number": "STU-2024-042",
            "phone": "+91 98765 43213",
            "role": "student",
            "membership_status": "active",
            "membership_expiry": (today + timedelta(days=240)).isoformat(),
            "created_at": now_iso
        },
        {
            "id": "usr_student02",
            "email": "vikram@clubpulse.edu",
            "hashed_password": hash_password("student123"),
            "full_name": "Vikram Malhotra",
            "roll_number": "STU-2024-089",
            "phone": "+91 98765 43214",
            "role": "student",
            "membership_status": "non_member",
            "membership_expiry": None,
            "created_at": now_iso
        }
    ]
    db["users"].insert_many(demo_users)

    # 2. MEMBERSHIPS
    members = [
        {
            "id": "mem_01",
            "user_id": "usr_student01",
            "full_name": "Ananya Roy",
            "email": "student@clubpulse.edu",
            "roll_number": "STU-2024-042",
            "phone": "+91 98765 43213",
            "department": "Computer Science & Engineering",
            "status": "active",
            "membership_type": "annual",
            "start_date": (today - timedelta(days=120)).isoformat(),
            "expiry_date": (today + timedelta(days=245)).isoformat(),
            "dues_paid_paise": 50000,
            "created_at": now_iso
        },
        {
            "id": "mem_02",
            "user_id": "usr_organizer01",
            "full_name": "Rohan Deshmukh",
            "email": "organizer@clubpulse.edu",
            "roll_number": "ORG-003",
            "phone": "+91 98765 43212",
            "department": "Electronics & Electrical",
            "status": "active",
            "membership_type": "annual",
            "start_date": (today - timedelta(days=180)).isoformat(),
            "expiry_date": (today + timedelta(days=185)).isoformat(),
            "dues_paid_paise": 50000,
            "created_at": now_iso
        },
        {
            "id": "mem_03",
            "user_id": None,
            "full_name": "Tanvi Gupta",
            "email": "tanvi.g@student.univ.edu",
            "roll_number": "STU-2023-112",
            "phone": "+91 98765 43215",
            "department": "Information Technology",
            "status": "expired",
            "membership_type": "annual",
            "start_date": (today - timedelta(days=400)).isoformat(),
            "expiry_date": (today - timedelta(days=35)).isoformat(),
            "dues_paid_paise": 50000,
            "created_at": now_iso
        }
    ]
    db["members"].insert_many(members)

    # 3. EVENTS
    events = [
        {
            "id": "evt_hackathon2026",
            "title": "HackPulse 2026: 24h Inter-College Hackathon",
            "description": "The premier collegiate software sprint with tracks in Intelligent Systems, FinTech, and Open Infrastructure. Keynote speakers, food, hardware lab access, and sponsor prizes.",
            "venue": "Campus Innovation Center, Hall A",
            "event_date": (today + timedelta(days=5)).isoformat() + " 09:00",
            "capacity": 200,
            "booked_count": 182,
            "checked_in_count": 45,
            "member_price_paise": 15000,      # ₹150 for members
            "non_member_price_paise": 30000,  # ₹300 for non-members
            "banner_url": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
            "tags": ["Hackathon", "Coding", "Prizes", "Odoo"],
            "is_published": True,
            "required_volunteer_count": 8,
            "estimated_budget_paise": 3500000, # ₹35,000
            "created_at": now_iso
        },
        {
            "id": "evt_ai_workshop",
            "title": "Hands-on Workshop: Building Agentic Workflows",
            "description": "Deep-dive practical masterclass on function calling, multi-agent orchestrations, and full-stack integration with FastAPI & React.",
            "venue": "Turing Computer Lab 3",
            "event_date": (today + timedelta(days=12)).isoformat() + " 15:30",
            "capacity": 60,
            "booked_count": 48,
            "checked_in_count": 0,
            "member_price_paise": 0,          # Free for members
            "non_member_price_paise": 15000,  # ₹150 for non-members
            "banner_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
            "tags": ["Workshop", "AI", "Agents"],
            "is_published": True,
            "required_volunteer_count": 4,
            "estimated_budget_paise": 800000,  # ₹8,000
            "created_at": now_iso
        },
        {
            "id": "evt_social_mixer",
            "title": "Annual Executive Handover & Alumni Gala",
            "description": "Celebrating chapter milestones, honoring student leaders, and formal transition of club governance to the incoming committee.",
            "venue": "University Central Auditorium Banquet Hall",
            "event_date": (today + timedelta(days=30)).isoformat() + " 18:00",
            "capacity": 150,
            "booked_count": 35,
            "checked_in_count": 0,
            "member_price_paise": 20000,      # ₹200 for members
            "non_member_price_paise": 40000,  # ₹400 for non-members
            "banner_url": "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
            "tags": ["Gala", "Networking", "Dinner"],
            "is_published": True,
            "required_volunteer_count": 6,
            "estimated_budget_paise": 4500000, # ₹45,000
            "created_at": now_iso
        }
    ]
    db["events"].insert_many(events)

    # 4. TICKETS
    tickets = [
        {
            "id": "tkt_demo01",
            "event_id": "evt_hackathon2026",
            "event_title": "HackPulse 2026: 24h Inter-College Hackathon",
            "event_date": (today + timedelta(days=5)).isoformat() + " 09:00",
            "venue": "Campus Innovation Center, Hall A",
            "user_id": "usr_student02",
            "user_name": "Vikram Malhotra",
            "user_email": "vikram@clubpulse.edu",
            "quantity": 1,
            "total_amount_paise": 15000,
            "is_member_discount_applied": True,
            "qr_token": "CP-TKT-HACK-ANANYA-DEMO01",
            "checked_in": True,
            "checked_in_at": (now - timedelta(hours=2)).isoformat(),
            "created_at": (now - timedelta(days=3)).isoformat()
        },
        {
            "id": "tkt_demo02",
            "event_id": "evt_ai_workshop",
            "event_title": "Hands-on Workshop: Building Agentic Workflows",
            "event_date": (today + timedelta(days=12)).isoformat() + " 15:30",
            "venue": "Turing Computer Lab 3",
            "user_id": "usr_student01",
            "user_name": "Ananya Roy",
            "user_email": "student@clubpulse.edu",
            "quantity": 1,
            "total_amount_paise": 0,
            "is_member_discount_applied": True,
            "qr_token": "CP-TKT-AI-ANANYA-DEMO02",
            "checked_in": False,
            "checked_in_at": None,
            "created_at": (now - timedelta(days=1)).isoformat()
        }
    ]
    db["tickets"].insert_many(tickets)

    # 5. MERCHANDISE (Official Chapter Apparel & Collectibles)
    products = [
        {
            "id": "prd_white_tee",
            "name": "Classic Regular Fit White T-Shirt",
            "brand": "ClubPulse Apparel",
            "description": "100% premium combed cotton classic white crewneck tee. Breathable, durable, and tailored for comfort.",
            "price_paise": 49900,  # ₹499
            "category": "T-Shirts",
            "image_url": "/merch/white-tee.jpg",
            "sizes": [
                {"size": "S", "stock": 15},
                {"size": "M", "stock": 25},
                {"size": "L", "stock": 20},
                {"size": "XL", "stock": 10}
            ],
            "sku": "CP-TEE-WHT-01",
            "created_at": now_iso
        },
        {
            "id": "prd_black_hoodie",
            "name": "Oversized Heavyweight Black Hoodie",
            "brand": "ClubPulse Originals",
            "description": "380 GSM heavyweight cotton fleece relaxed fit black hoodie with front kangaroo pocket and double-lined hood.",
            "price_paise": 99900,  # ₹999
            "category": "Hoodies",
            "image_url": "/merch/black-hoodie.jpg",
            "sizes": [
                {"size": "S", "stock": 10},
                {"size": "M", "stock": 30},
                {"size": "L", "stock": 20},
                {"size": "XL", "stock": 8}
            ],
            "sku": "CP-HD-BLK-02",
            "created_at": now_iso
        },
        {
            "id": "prd_black_tee",
            "name": "Classic Regular Fit Black T-Shirt",
            "brand": "ClubPulse Apparel",
            "description": "Ultra-soft bio-washed ribbed black cotton t-shirt with classic crew neckline and minimal club styling.",
            "price_paise": 49900,  # ₹499
            "category": "T-Shirts",
            "image_url": "/merch/black-tee.jpg",
            "sizes": [
                {"size": "S", "stock": 18},
                {"size": "M", "stock": 28},
                {"size": "L", "stock": 22},
                {"size": "XL", "stock": 12}
            ],
            "sku": "CP-TEE-BLK-03",
            "created_at": now_iso
        },
        {
            "id": "prd_basketball_badge",
            "name": "Match Day Basketball Enamel Button Badge",
            "brand": "ClubPulse Sports",
            "description": "High-grade 58mm glossy metallic tournament collectible pin badge featuring the Club Match Day basketball crest.",
            "price_paise": 9900,  # ₹99
            "category": "Badges",
            "image_url": "/merch/badge.jpg",
            "sizes": [
                {"size": "Standard", "stock": 50}
            ],
            "sku": "CP-BDG-BSK-04",
            "created_at": now_iso
        },
        {
            "id": "prd_cream_hoodie",
            "name": "Minimalist Cream Fleece Pullover Hoodie",
            "brand": "ClubPulse Originals",
            "description": "Clean ecru cream brushed fleece pullover hoodie with tonal drawstrings and kangaroo pocket.",
            "price_paise": 99900,  # ₹999
            "category": "Hoodies",
            "image_url": "/merch/cream-hoodie.jpg",
            "sizes": [
                {"size": "S", "stock": 12},
                {"size": "M", "stock": 24},
                {"size": "L", "stock": 18},
                {"size": "XL", "stock": 6}
            ],
            "sku": "CP-HD-CRM-05",
            "created_at": now_iso
        }
    ]
    db["products"].insert_many(products)

    # 6. TASKS (Includes critical, overdue, and unassigned to trigger explainable risk rules)
    tasks = [
        {
            "id": "tsk_01",
            "title": "Finalize Catering & Energy Drinks Sponsorship",
            "description": "Confirm delivery schedule for 200 lunch packs and 400 energy drinks with local vendor sponsor.",
            "event_id": "evt_hackathon2026",
            "event_title": "HackPulse 2026: 24h Inter-College Hackathon",
            "assignee_id": "usr_organizer01",
            "assignee_name": "Rohan Deshmukh",
            "due_date": (today - timedelta(days=2)).isoformat(), # Overdue critical task!
            "priority": "critical",
            "is_critical_path": True,
            "status": "in_progress",
            "created_by": "usr_admin01",
            "created_at": now_iso
        },
        {
            "id": "tsk_02",
            "title": "Configure High-Density WiFi Access Points in Hall A",
            "description": "Coordinate with university IT department to assign dedicated 5GHz SSIDs and 1Gbps fiber uplink.",
            "event_id": "evt_hackathon2026",
            "event_title": "HackPulse 2026: 24h Inter-College Hackathon",
            "assignee_id": "usr_student01",
            "assignee_name": "Ananya Roy",
            "due_date": (today + timedelta(days=2)).isoformat(),
            "priority": "high",
            "is_critical_path": True,
            "status": "todo",
            "created_by": "usr_admin01",
            "created_at": now_iso
        },
        {
            "id": "tsk_03",
            "title": "Print Attendee Badges & QR Check-in Lanyards",
            "description": "Batch export registered tickets and print NFC/QR lanyards at campus printing hub.",
            "event_id": "evt_hackathon2026",
            "event_title": "HackPulse 2026: 24h Inter-College Hackathon",
            "assignee_id": None, # Unassigned high-priority task!
            "assignee_name": None,
            "due_date": (today + timedelta(days=3)).isoformat(),
            "priority": "high",
            "is_critical_path": False,
            "status": "todo",
            "created_by": "usr_organizer01",
            "created_at": now_iso
        },
        {
            "id": "tsk_04",
            "title": "Publish Agentic AI Workshop Setup Guide",
            "description": "Distribute Python virtual environment and Ollama setup guide to enrolled attendees.",
            "event_id": "evt_ai_workshop",
            "event_title": "Hands-on Workshop: Building Agentic Workflows",
            "assignee_id": "usr_organizer01",
            "assignee_name": "Rohan Deshmukh",
            "due_date": (today + timedelta(days=8)).isoformat(),
            "priority": "medium",
            "is_critical_path": False,
            "status": "done",
            "created_by": "usr_admin01",
            "created_at": now_iso
        }
    ]
    db["tasks"].insert_many(tasks)

    # 7. ANNOUNCEMENTS
    announcements = [
        {
            "id": "ann_01",
            "title": "🚀 HackPulse 2026 Registration Surge: 90% Capacity Reached",
            "content": "Over 180 developers from 14 colleges have registered for HackPulse 2026. Member-priority ticket booking closes in 48 hours. Ensure your team has confirmed all hardware requirements.",
            "target_audience": "all",
            "priority": "high",
            "is_published": True,
            "author_id": "usr_admin01",
            "author_name": "Aarav Sharma (Admin)",
            "created_at": (now - timedelta(hours=6)).isoformat(),
            "updated_at": (now - timedelta(hours=6)).isoformat()
        },
        {
            "id": "ann_02",
            "title": "🎉 Exclusive 50% Off Merchandise Code for Active Members",
            "content": "Active chapter members can use their membership discount automatically at checkout for all official hoodies and conference tees.",
            "target_audience": "members_only",
            "priority": "normal",
            "is_published": True,
            "author_id": "usr_organizer01",
            "author_name": "Rohan Deshmukh (Organizer)",
            "created_at": (now - timedelta(days=2)).isoformat(),
            "updated_at": (now - timedelta(days=2)).isoformat()
        }
    ]
    db["announcements"].insert_many(announcements)

    # 8. FINANCIAL TRANSACTIONS LEDGER (Paise based for INR arithmetic)
    transactions = [
        {
            "id": "txn_opening",
            "amount_paise": 1500000, # ₹15,000 opening bank reserve
            "transaction_type": "income",
            "category": "other",
            "description": "Opening semester liquid bank balance",
            "status": "completed",
            "reference_id": "TERM-OP-2026",
            "created_at": (today - timedelta(days=60)).isoformat() + "T10:00:00",
            "created_by": "usr_treasurer01"
        },
        {
            "id": "txn_mem_dues_batch",
            "amount_paise": 1000000, # ₹10,000 from 20 members
            "transaction_type": "income",
            "category": "membership_dues",
            "description": "Batch membership dues collection (20 annual members)",
            "status": "completed",
            "reference_id": "DUES-BATCH-01",
            "created_at": (today - timedelta(days=30)).isoformat() + "T11:00:00",
            "created_by": "usr_treasurer01"
        },
        {
            "id": "txn_hack_tickets",
            "amount_paise": 2730000, # ₹27,300 ticket income
            "transaction_type": "income",
            "category": "ticket_sale",
            "description": "HackPulse 2026 Ticket Bookings (182 tickets)",
            "status": "completed",
            "reference_id": "evt_hackathon2026",
            "created_at": (today - timedelta(days=3)).isoformat() + "T14:30:00",
            "created_by": "system"
        },
        {
            "id": "txn_merch_sales",
            "amount_paise": 849000, # ₹8,490 merch sales
            "transaction_type": "income",
            "category": "merchandise",
            "description": "Online store hoodie and t-shirt orders",
            "status": "completed",
            "reference_id": "MERCH-AGG-01",
            "created_at": (today - timedelta(days=7)).isoformat() + "T16:00:00",
            "created_by": "system"
        },
        {
            "id": "txn_venue_advance",
            "amount_paise": 1200000, # ₹12,000 venue deposit
            "transaction_type": "expense",
            "category": "logistics",
            "description": "Campus Innovation Center AV and Hall A advance deposit",
            "status": "completed",
            "reference_id": "INV-VENUE-089",
            "created_at": (today - timedelta(days=10)).isoformat() + "T12:00:00",
            "created_by": "usr_treasurer01"
        },
        {
            "id": "txn_committed_catering",
            "amount_paise": 1800000, # ₹18,000 committed catering obligation
            "transaction_type": "expense",
            "category": "refreshments",
            "description": "Approved purchase order for HackPulse food & beverages",
            "status": "committed",
            "reference_id": "PO-FOOD-2026",
            "created_at": (today - timedelta(days=1)).isoformat() + "T18:00:00",
            "created_by": "usr_treasurer01"
        }
    ]
    db["transactions"].insert_many(transactions)

    # 9. EXPENSES & REIMBURSEMENTS
    expenses = [
        {
            "id": "exp_01",
            "user_id": "usr_organizer01",
            "user_name": "Rohan Deshmukh",
            "user_email": "organizer@clubpulse.edu",
            "amount_paise": 345000, # ₹3,450
            "category": "logistics",
            "description": "High-speed ethernet switches and cable splitters for hackathon tables",
            "event_id": "evt_hackathon2026",
            "receipt_url": "https://images.unsplash.com/photo-1554415707-9e4466bfe03c?auto=format&fit=crop&w=600&q=80",
            "status": "pending",
            "reviewer_notes": None,
            "created_at": (now - timedelta(days=4)).isoformat(),
            "reviewed_at": None
        },
        {
            "id": "exp_02",
            "user_id": "usr_student01",
            "user_name": "Ananya Roy",
            "user_email": "student@clubpulse.edu",
            "amount_paise": 120000, # ₹1,200
            "category": "refreshments",
            "description": "Snacks and bottled water for committee planning sprint",
            "event_id": None,
            "receipt_url": "https://images.unsplash.com/photo-1554415707-9e4466bfe03c?auto=format&fit=crop&w=600&q=80",
            "status": "pending",
            "reviewer_notes": None,
            "created_at": (now - timedelta(days=2)).isoformat(),
            "reviewed_at": None
        }
    ]
    db["expenses"].insert_many(expenses)

    return {
        "success": True,
        "message": "ClubPulse database successfully seeded with realistic multi-role operational data.",
        "counts": {
            "users": len(demo_users),
            "members": len(members),
            "events": len(events),
            "tickets": len(tickets),
            "products": len(products),
            "tasks": len(tasks),
            "transactions": len(transactions),
            "expenses": len(expenses)
        }
    }
