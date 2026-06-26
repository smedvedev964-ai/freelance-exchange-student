"""
Главный модуль приложения FastAPI.
Настраивает CORS, подключает роутеры, обрабатывает ошибки.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError

from src.database import init_db
from src.routers import users, orders, responses

# ---------- Lifespan (инициализация БД при старте) ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Выполняется при запуске и остановке приложения."""
    init_db()   # Создаёт таблицы, если их нет
    yield

# ---------- Создание экземпляра приложения ----------
app = FastAPI(
    title="Student Freelance Exchange API",
    description="Учебный проект биржи фриланса с аутентификацией через заголовок X-User-ID",
    version="2.0",
    lifespan=lifespan
)

app.mount("/static", StaticFiles(directory="frontend"), name="static")

# ---------- CORS (для доступа с фронтенда) ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Подключение роутеров ----------
app.include_router(users.router)
app.include_router(orders.router)
app.include_router(responses.router)

# ---------- Корневой путь -> Swagger ----------
@app.get("/", include_in_schema=False)
def root():
    from fastapi.responses import FileResponse
    return FileResponse("frontend/index.html")

# ---------- Глобальные обработчики ошибок ----------
@app.exception_handler(HTTPException)
def http_exception_handler(request, exc: HTTPException):
    """Форматирует HTTP-исключения в единый JSON-ответ."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(RequestValidationError)
def validation_exception_handler(request, exc: RequestValidationError):
    """Обрабатывает ошибки валидации Pydantic."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Ошибка валидации данных",
            "details": exc.errors()
        }
    )

# ---------- Запуск (для отладки) ----------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)