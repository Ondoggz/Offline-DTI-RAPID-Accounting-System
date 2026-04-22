# 🌾 DTI Accounting System

> **Palambuon Farmers Association** — Kaatuan, Lantapan, Bukidnon

A web-based accounting and delivery management system for the Palambuon Farmers Association. The system digitizes farmer delivery records, auto-generates Acknowledgement Receipts and Payment Forms, tracks coffee bean volumes, and produces monthly financial reports with graphical dashboards.

---

## 👥 Team Members

| Name | Role | Feature Branch |
|------|------|----------------|
| Nicole Salagantin | Farmer Management & Auth | `feature/farmer-management` |
| Eros Uzziel Dagbay | Delivery Entry & Volume Tracking | `feature/delivery-entry` |
| Sean Khalil A. Hembrador | Acknowledgement Receipt & Payment | `feature/acknowledgement-receipt` |
| Louis Ondrej Llamas | Report Generator & Dashboard | `feature/report-generator` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Front-End | React.js + Vite + Tailwind CSS |
| Back-End | Node.js + Express.js |
| Database | MongoDB (via Docker) |
| Authentication | JWT (JSON Web Tokens) |
| Charts | Chart.js |
| Environment | Docker + Docker Compose |

---

## 📁 Project Structure

```
dti-accounting-system/
├── client/                  # React.js front-end (Vite)
│   ├── src/
│   │   ├── pages/           # Module pages (Dashboard, Farmers, Delivery, etc.)
│   │   ├── components/      # Reusable UI components
│   │   └── App.jsx
│   ├── .env
│   └── Dockerfile
├── server/                  # Node.js + Express back-end
│   ├── routes/              # API route handlers
│   ├── models/              # MongoDB/Mongoose schemas
│   ├── middleware/          # Auth middleware (JWT)
│   ├── index.js
│   ├── .env
│   └── Dockerfile
├── docker-compose.yml       # Orchestrates all containers
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Git](https://git-scm.com/) installed

### 1. Clone the repository

```bash
git clone https://github.com/<your-group-org>/dti-accounting-system.git
cd dti-accounting-system
```

### 2. Set up environment variables

**client/.env**
```env
VITE_API_URL=http://localhost:3000
```

**server/.env**
```env
PORT=3000
DATABASE_URL=mongodb://mongo:27017/dti_db
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret_here
```

### 3. Start the full stack with Docker

```bash
docker-compose up --build
```

### 4. Access the application

| Service | URL |
|---------|-----|
| React Front-End | http://localhost:5173 |
| Express API | http://localhost:3000 |
| API Health Check | http://localhost:3000/api |
| MongoDB | mongodb://localhost:27017 |

---

## 🌿 Branch Structure

This repository follows a structured Git branching strategy:

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready, stable codebase. Never commit directly. |
| `staging` | Staging environment for system & acceptance testing. |
| `develop` | Integration branch — all feature branches are merged here first. |
| `feature/*` | One branch per developer/module. Merged into `develop` via Pull Request. |

> See each branch's own `README.md` for branch-specific instructions.

---

## 🧩 System Modules

- **Login / Signup** — JWT-based authentication with role-based access control
- **Dashboard** — Real-time charts and KPI summary cards
- **Farmer Management** — CRUD operations for farmer profiles
- **Bean Management** — Coffee bean types, varieties, and unit costs
- **Delivery Entry** — Record deliveries with auto-calculated total payables
- **Acknowledgement Receipt** — Auto-generated, print-ready AR forms
- **Payment Module** — Payment recording and Payment Form generation
- **Transaction History** — Complete filterable log of all transactions
- **Report Generator** — Monthly consolidated reports with Chart.js visualizations

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Server health check |
| GET | `/api` | API + DB connectivity check |
| GET/POST | `/api/farmers` | Get all / Create farmer |
| GET/PUT/DELETE | `/api/farmers/:id` | Get / Update / Delete farmer |
| GET/POST | `/api/deliveries` | Get all / Create delivery |
| GET | `/api/receipts/:deliveryId` | Generate Acknowledgement Receipt |
| GET/POST | `/api/payments` | Get all / Record payment |
| GET | `/api/reports/monthly` | Monthly consolidated report |

---

## 🐳 Docker Services

```yaml
services:
  client:   # React front-end  → port 5173
  server:   # Express API      → port 3000
  mongo:    # MongoDB           → port 27017
```

---

## 📄 License

This project was developed as an academic requirement.  
**Course:** Web Systems and Technologies  
**Instructor:** Ma'am Guen Gabutin  
**Institution:** [Your School Name]
