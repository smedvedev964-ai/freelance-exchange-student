from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI()

# Эндпоинт для проверки API
@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# Раздаём статику (фронтенд) из папки frontend
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Отдаём index.html
@app.get("/")
async def root():
    if os.path.exists("frontend/index.html"):
        return FileResponse("frontend/index.html")
    return {"message": "Frontend not ready yet"}