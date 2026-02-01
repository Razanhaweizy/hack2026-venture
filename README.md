# Ideograph

Startup Idea Evaluation Tool with a 3D dependency graph visualization.

## Project Structure

```
/
├── backend/           # Python FastAPI backend
│   ├── app/
│   │   ├── main.py   # FastAPI application
│   │   ├── models/   # Pydantic data models
│   │   ├── routes/   # API endpoints
│   │   └── services/ # Business logic
│   ├── data/         # CSV data files
│   └── requirements.txt
│
└── frontend/          # React + Three.js frontend
    ├── src/
    │   ├── api/      # API client
    │   ├── components/
    │   ├── store/    # Zustand stores
    │   └── ...
    └── package.json
```

## Setup

### Backend (Python)

1. Create and activate virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the backend:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at http://localhost:8000

### Frontend (React)

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run the frontend:
```bash
npm run dev
```

The app will be available at http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph/state` | Get complete graph state |
| GET | `/api/graph/progress` | Get skeleton completion progress |
| GET | `/api/graph/nodes` | Get all nodes |
| POST | `/api/graph/nodes` | Create a new node |
| PUT | `/api/graph/nodes/{id}` | Update a node |
| DELETE | `/api/graph/nodes/{id}` | Delete a node |
| GET | `/api/graph/edges` | Get all edges |
| POST | `/api/graph/edges` | Create a new edge |
| DELETE | `/api/graph/edges/{id}` | Delete an edge |
| GET | `/api/graph/export/nodes.csv` | Export nodes as CSV |
| GET | `/api/graph/export/edges.csv` | Export edges as CSV |

## Quick Start (Both)

Run both backend and frontend:

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```
