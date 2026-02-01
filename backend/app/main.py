"""
Ideograph Backend API
FastAPI application for the Ideograph startup evaluation tool
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import graph_router, agent_router
from .routes.debate import router as debate_router

# Create FastAPI app
app = FastAPI(
    title="Ideograph API",
    description="Backend API for the Ideograph startup idea evaluation tool",
    version="1.0.0",
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(graph_router)
app.include_router(agent_router)
app.include_router(debate_router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Ideograph API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
