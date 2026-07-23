# 🌿 FoodSafe — AI-Powered Food Adulteration Detection

> A research-grade, full-stack web app for detecting food adulteration using AI, computer vision, and NLP. Built around **Delhi NCT** with Hindi/English support.

## 🎯 Project Overview

FoodSafe helps Indian families detect food adulteration using:
- **Real-time camera detection** (YOLOv8 → Gemini Vision)
- **Multilingual NLP** (IndicBERT/MuRIL, Gemini)
- **Predictive risk scoring** (Prophet time-series)
- **Personalized health profiles** (scikit-learn)
- **FSSAI violation data integration** (live scraper + RAG)
- **Live news feed** (Gemini `google_search` grounding)

## 📁 Project Structure

```
foodsafe/
├── frontend/          # React + Vite + Tailwind web app (PWA)
├── backend/           # FastAPI Python backend
├── ml/                # ML models, notebooks, training scripts
└── docs/              # Research paper, API docs
```

## 🛠️ Tech Stack

| Layer       | Technology                                         |
|-------------|----------------------------------------------------|
| Frontend    | React, Vite, Tailwind CSS, Leaflet.js, PWA         |
| Backend     | FastAPI, Uvicorn, Celery                           |
| Database    | **MongoDB Atlas** (via Motor async driver)         |
| AI/ML       | Google Gemini (text + vision), YOLOv8, IndicBERT, Prophet, scikit-learn |
| RAG         | Flat JSON vector store + Gemini rerank             |
| Hosting     | Vercel (FE), Render (BE), MongoDB Atlas (DB)       |

## 🚀 Quick Start

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

# MongoDB Atlas connection string
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?appName=Cluster0
MONGO_DB_NAME=foodsafe
```

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

On boot the backend pings Atlas and creates indexes (unique `users.email`, etc.).

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

App runs at http://127.0.0.1:3000.

### 3. (Optional) Seed data

```bash
# Safe brands + a baseline set of FSSAI violations
python seed.py

# AI-generated Delhi community adulteration reports (powers the map)
python seed_delhi.py

# Index violations into the RAG store
python scripts/build_fssai_index.py
```

## 🗄️ Database

FoodSafe uses **MongoDB Atlas** as its primary data store. Collections:

| Collection            | Purpose                                                  |
|-----------------------|----------------------------------------------------------|
| `users`               | Accounts (email unique), profile, city                   |
| `refresh_tokens`      | JWT refresh tokens (rotated, hash-indexed)               |
| `scan_records`        | Food scan history + risk results                         |
| `community_reports`   | Citizen-submitted adulteration reports (powers the map)  |
| `fssai_violations`    | Scraper-fed FSSAI violation records + RAG source         |
| `safe_brands`         | Verified safe brand recommendations                      |
| `push_subscriptions`  | Web Push notification endpoints                          |

> Migrating from the old SQLite setup? The `foodsafe.db` file is no longer used and can be deleted. All data now lives in Atlas.

## 🔬 Research Questions

1. Can multimodal AI detect food adulteration more accurately than single-modality approaches?
2. How does regional NLP (Hindi/English) improve food safety awareness vs English-only?
3. Can time-series ML on FSSAI data predict seasonal adulteration spikes?
4. What is the impact of personalized toxin exposure scoring on dietary behaviour?

## 📄 License

MIT License — open for research and educational use.
