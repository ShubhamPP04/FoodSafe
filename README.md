# SafeThali — AI-Powered Food Adulteration Detection

> A full-stack web app for detecting food adulteration using AI, computer vision, and NLP. Built around **Delhi NCT** with **English + Hindi** support.

## Design System

SafeThali uses a **Soft Structuralism** design language with:
- **Emerald accent** (`#00BFA5`) on pure white surfaces
- **Plus Jakarta Sans** typography (800-weight display headings)
- **Double-bezel card architecture** (nested outer shell + inner core)
- **Floating glass pill navigation** with backdrop blur
- **Dark mode** with OLED-black palette (`#0A0A0B` canvas)
- **Fluid motion** using `cubic-bezier(0.32, 0.72, 0, 1)` transitions
- **Aether Lane-style landing page** with massive split typography over deep green gradient
- **PWA** with installable manifest, service worker, and push notifications

### Design Tokens
| Token | Light | Dark |
|-------|-------|------|
| Canvas | `#F5F5F7` | `#0A0A0B` |
| Paper | `#FFFFFF` | `#161618` |
| Ink | `#1D1D1F` | `#F5F5F7` |
| Brand | `#00BFA5` | `#00D9BE` |
| Chili | `#FF3B30` | `#FF453A` |

## Features

- **Scan any food** — text search, camera capture, image upload, or voice input
- **AI risk analysis** — adulterant detection, safety score, seasonal risk, home tests
- **Brand comparison** — compare branded products with FSSAI certification status
- **Delhi Risk Map** — interactive Leaflet map with community adulteration reports
- **Food diary** — scan history, risk distribution charts, AI insights, weekly digest
- **AI meal planner** — personalized meal suggestions based on scan history
- **Symptom checker** — AI-powered food poisoning analysis with urgency levels
- **Festival guide** — seasonal food safety alerts for Indian festivals
- **Family profiles** — per-member health conditions and personalized warnings
- **Live news feed** — FSSAI alerts via Gemini google_search grounding
- **Dark mode** — persisted theme toggle with full CSS variable swap
- **Bilingual** — English & Hindi with instant language switching

## Project Structure

```
foodsafe/
├── frontend/          # React 18 + Vite 7 + Tailwind 3 + Framer Motion (PWA)
│   ├── src/
│   │   ├── components/   # UI kit, layout, chatbot, shared components
│   │   ├── pages/        # 16 pages (Landing, Auth, Scan, Result, Diary, Map, etc.)
│   │   ├── store/        # Zustand store with persist middleware
│   │   ├── services/     # Axios API client with token refresh
│   │   ├── i18n/         # English + Hindi translations
│   │   └── utils/        # Risk config, date helpers, PDF generation
│   └── public/           # Favicon, manifest, PWA icons
├── backend/           # FastAPI Python backend
│   ├── routers/         # 15 API routers (scan, brands, community, news, etc.)
│   ├── services/        # AI service (Gemini), RAG, YOLO, overconsumption
│   ├── app/             # Config, database (MongoDB Atlas via Motor)
│   └── api/             # Vercel serverless entry point
├── ml/                # ML models, notebooks, training scripts
└── docs/              # Research paper, deployment guide
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 7, Tailwind 3, Framer Motion, Leaflet, Zustand, PWA |
| Backend | FastAPI, Uvicorn, Motor (MongoDB async) |
| Database | **MongoDB Atlas** (via Motor async driver) |
| AI/ML | Google Gemini (text + vision), YOLOv8, IndicBERT, Prophet, scikit-learn |
| RAG | Flat JSON vector store + Gemini rerank |
| Hosting | Vercel (FE + BE serverless), MongoDB Atlas (DB) |
| Design | Soft Structuralism, double-bezel cards, dark mode, Plus Jakarta Sans |

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- A **MongoDB Atlas** cluster (free M0 tier works)
- A **Google Gemini** API key ([get one here](https://aistudio.google.com/app/apikey))

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (see `.env.example`):

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?appName=Cluster0
MONGO_DB_NAME=foodsafe
```

Start the server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000/api
```

Then:
```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:5173.

### 3. Deploy to Vercel

**Frontend** (`frontend/vercel.json`):
- All routes rewrite to `index.html` for SPA routing
- Auto-deploys from GitHub `main` branch

**Backend** (`backend/vercel.json`):
- Serverless FastAPI via `api/index.py`
- Daily cron job at 6am UTC generates fresh Delhi NCR adulteration data via Gemini
- Weekly cron jobs for FSSAI scraping, ML retraining, and digest emails

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `GEMINI_API_KEY` | backend/.env | Gemini AI for scan analysis, news, brands |
| `MONGO_URI` | backend/.env | MongoDB Atlas connection string |
| `MONGO_DB_NAME` | backend/.env | Database name (default: foodsafe) |
| `SECRET_KEY` | backend/.env | JWT signing secret |
| `VITE_API_URL` | frontend/.env | Backend API base URL |
| `CRON_SECRET` | backend/.env | Vercel Cron auth (optional) |

## Database

**MongoDB Atlas** collections:

| Collection | Purpose |
|------------|---------|
| `users` | Accounts (email unique), profile, city |
| `refresh_tokens` | JWT refresh tokens (rotated, hash-indexed) |
| `scan_records` | Food scan history + risk results |
| `community_reports` | Citizen adulteration reports (powers the map) |
| `fssai_violations` | Scraper-fed FSSAI violation records + RAG source |
| `safe_brands` | Verified safe brand recommendations |
| `push_subscriptions` | Web Push notification endpoints |

## Test Credentials

```
Email: test@safethali.com
Password: test123
```

Or use **"Skip for now"** on the auth page to browse in guest mode.

## License

MIT License — open for research and educational use.
