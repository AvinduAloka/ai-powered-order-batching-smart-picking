from fastapi import FastAPI

app = FastAPI(
    title="X-Trena Optimization Service",
    version="1.0.0",
    description="Google OR-Tools solvers: storage advice, batching, routing.",
)


@app.get("/meta/health")
async def health() -> dict:
    """Health endpoint — used by docker-compose healthcheck and the .NET OrToolsClient."""
    return {"status": "ok", "service": "optimization"}
