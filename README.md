# ResQMap AI — Disaster Management & Emergency Response Platform

ResQMap AI is an AI-powered disaster management and emergency response system built with React, Vite, Leaflet, and FastAPI.

## Features
- **Real-Time Interactive Command Centre**: Map-based monitoring of active disaster incidents (floods, fires, landslides).
- **AI Priority Scoring**: Dynamic severity and urgency prioritization for quick resource dispatch.
- **Resource Dispatch**: Allocate ambulances, fire engines, and emergency shelters to high-priority zones.
- **Citizen Incident Reporting**: Public portal for uploading disaster reports and photos.
- **Dark / Light Theme**: Optimized UI for command centers and high-contrast night operations.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Leaflet, Lucide Icons, Recharts
- **Backend**: FastAPI, Python, SQLite, SQLAlchemy, Pydantic

## Local Setup

### 1. Frontend
```bash
npm install
npm run dev
```

### 2. Backend
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
