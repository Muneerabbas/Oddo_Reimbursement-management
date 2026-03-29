# 🏢 Odoo Reimbursement Management

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-4-purple?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Node.js-18-green?logo=node.js" alt="Node" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-14-blue?logo=postgresql" alt="Postgres" />
</p>

A modern, full-stack corporate reimbursement and expense management system, complete with multi-tier role hierarchies, OCR smart scanning, dynamic routing rules, and an embedded SQL-backed AI Support Agent. 

## 🌟 Key Features

* **Smart Expense Extraction (OCR)**: Upload bills or receipts to naturally extract totals, dates, and categories without manual entry.
* **Dynamic Policy Builder**: Build custom JSON-based routing predicates for expenses matching specific amount bands, departments, or overarching policy categories.
* **Role-Based Hierarchy Tiers**: Define strict reporting lines and organizational tiers visually via an interactive Team Viewer. Approvals intuitively escalate up the chain based on dynamic configurations.
* **Intelligent Support Chatbot**: Ask "Why is my expense delayed?" and instantly receive accurate deterministic answers backed by internal SQL Query Plans mapping user scopes, audit logs, and SLA statuses.
* **Multi-Currency Out-Of-The-Box**: Complete support for `USD`, `EUR`, `GBP`, `CAD`, and `INR` alongside normalized UI aggregations.

## 📁 Repository Structure

```
Oddo_Reimbursement-management/
├── backend/                  # Node.js / Express TS Backend
│   ├── src/                  
│   │   ├── controllers/      # Express API Request Handlers
│   │   ├── services/         # Core Business Logic (AI, Auth, OCR, etc.)
│   │   └── config/           # Database drivers and Environment rules
│   ├── .env.example          # Sample environment secrets
│   └── package.json 
└── frontend/                 # React & Vite SPA
    ├── src/                  
    │   ├── components/       # Reusable UI / Complex Form components
    │   ├── pages/            # View domains (Teams, Admin Rules, Expenses)
    │   ├── services/         # Secure Axios interceptors & HTTP clients
    │   └── contexts/         # Global Layout, Auth, and Context Providers
    └── tailwind.config.js    # Component color configurations
```

## 🛠️ Quick Start & Installation

### 1. Prerequisites
Ensure you have the following installed on your local machine:
* **Node.js** `v18.x` or higher
* **PostgreSQL** `v14.x` or higher running locally (or via Docker)
* **npm** or **yarn**

### 2. Configure Environment Variables

**Backend Configuration (`backend/.env`)**  
Navigate to the `backend/` directory, copy `.env.example` to `.env`:
```bash
cd backend
cp .env.example .env
```
Inside `.env`, define the fields pointing to your Postgres initialization state:
```env
PORT=5001
# Use DATABASE_URL or individual credentials below:
# DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=reimbursement
DB_USER=postgres
DB_PASSWORD=secret
JWT_SECRET=super-secret-dev-key
```

**Frontend Configuration (`frontend/.env`)**  
Navigate to the `frontend/` directory and create `.env`:
```env
# Maps to the correct default backend port proxy over Vite
VITE_API_BASE_URL=http://localhost:5001/api
```

### 3. Install & Start Servers

**Boot up the Backend API:**
```bash
# In Terminal 1 (Backend)
cd backend
npm install
npm run dev
# Note: Express automatically synchronizes database tables via migrations upon boot.
```

**Boot up the Frontend Application:**
```bash
# In Terminal 2 (Frontend)
cd frontend
npm install
npm run dev
```

Visit the application locally at `http://localhost:5173`.

## 📦 Technology Decisions

- **Tailwind CSS & Lucide Icons**: Chosen for rapid, dynamic UI styling that prevents bloated classes while maintaining a cohesive, beautiful corporate enterprise look and feel.
- **Axios & Vite Proxies**: Global Axios instance handlers capture entirely silent token-refresh logic, meaning the app remains completely stable and never unceremoniously dumps users across sessions.
- **PostgreSQL (pg)**: Standard pg driver to ensure unbridled raw SQL capability for the extremely intensive query evaluations inside the `supportAgentService.ts` Chatbot engine.

## 🤝 Contributing
1. Check out a descriptive feature branch (`git checkout -b feature/advanced-rule-builder`)
2. Commit your changes logically (`git commit -m 'feat: implement dynamic sliders for budget controls'`)
3. Push up to your designated branch (`git push origin feature/advanced-rule-builder`)
4. Open a Pull Request!

---
*A corporate reimbursement tool built specifically for deployment speed, dynamic hierarchy routing, and pristine User Experiences.*
