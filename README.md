## TrailMix – Hiking Event & Matching Platform

TrailMix is a full‑stack app for organizing group hikes and matching hikers with similar interests.  
The backend is built with FastAPI and Firebase/Firestore; the frontend (in `trailmix/`) is a React Native app.

Trailmix is meant to be a community hiking platform, allowing for connection between hikers and organization for hiking events.

---

### Features

- **User accounts**
  - Email/password signup & login (Firebase Authentication)
  - User profiles with interests, bio, hiking level, profile picture, etc.
  - Admin‑only promotion to “wayfarer” role

- **Hiking events**
  - Create, list, and delete hiking events
  - Join/leave events as an attendee
  - Automatic cleanup of expired events via background scheduler

- **Matching**
  - Interest‑based user matching using an L2AP k‑NN index (cosine similarity)
  - Swipe interface with “like”/“pass”
  - Mutual matches and conversations

- **Messaging**
  - Real‑time chat via WebSockets and Redis pub/sub
  - Conversation threads and message history

- **Maps**
  - Trail map generation using OpenStreetMap / Overpass
  - Displays trails and trailheads around a selected location

- **Uploads**
  - Profile picture upload, serve, and delete endpoints

---

### Tech Stack

- **Backend**
  - Python 3.x
  - FastAPI + Uvicorn
  - Firebase Authentication & Firestore
  - Redis (for messaging)
  - APScheduler (background jobs)
- **Frontend**
  - React Native (in `trailmix/`)
- **Other**
  - Docker / docker‑compose for local dev
  - Pytest for backend tests

---

### Prerequisites

- Python 3.10+  
- Node.js + yarn/npm (for the frontend)  
- Docker & docker‑compose (recommended for running full stack)  
- Firebase project with:
  - Service account key (`backend/secrets/serviceAccountKey.json`)
  - `.env` file in `backend/secrets/.env` with at least:
    - `FIREBASE_API_KEY=...`
    - `DATABASE_URL=...` (for messaging DB)
    - `REDIS_URL=...`

---

### Backend – Local Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txtCreate `backend/secrets/.env`:
```

FIREBASE_API_KEY=your_firebase_api_key
DATABASE_URL=postgresql://trailmix:trailmix_password@localhost:5432/trailmix_db
REDIS_URL=redis://localhost:6379/0Place `serviceAccountKey.json` in `backend/secrets/`.

---

### Running the Backend
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
API docs will be available at:

- Swagger UI: `http://localhost:8000/docs`  
- ReDoc: `http://localhost:8000/redoc`

---

### Running Tests (Backend)
```bash
cd backend
pytest---
```

### Frontend (Quick Note)

The React Native app lives in `trailmix/`.  
It expects the backend API to be reachable at `http://<your-backend-host>:8000/api/v1`.  
Check the frontend config for the exact `API_BASE_URL`.

---

### Deployment (High‑Level)

- Build and run via Docker (backend):
```bash
docker build -t trailmix-backend ./backend
docker run -p 8000:8000 --env-file backend/secrets/.env trailmix-backend- Configure:
  - Environment variables on the server
  - Firebase credentials
  - Redis and database services
```
- Alternatively:
  ```bash
  start.bat
  ```
  or
  ```bash
  start.sh
  ```
  handles deployment automatically.

---

### Alternative Startup (Debug Mode)

Alternatively, you can start the project using the provided scripts:
```bash
./start.bat   # Windows
./start.sh    # macOS / Linux
```
These scripts create an all-in-one terminal for running and debugging the project. <br>
<br>
Requirements
- Before running the scripts, make sure you have:
- Docker installed and running
- Node.js installed on your local machine
- Expo Go installed on the mobile device you’re using for testing

What Happens: <br>
Running either script will open a terminal interface. <br>
When prompted, selecting options 1–3 will generate a QR code you can scan with Expo Go to test the app.
