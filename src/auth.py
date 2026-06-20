"""
Вспомогательные функции для аутентификации:
хеширование паролей, проверка пароля, получение текущего пользователя по заголовку.
"""
import hashlib
from fastapi import Header, HTTPException, status
from src.database import get_db_connection

def hash_password(password: str) -> str:
    """Хеширует пароль с помощью SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет, соответствует ли введённый пароль сохранённому хешу."""
    return hash_password(plain_password) == hashed_password

def get_current_user_id(x_user_id: int = Header(..., description="ID текущего пользователя")):
    """
    Зависимость FastAPI, которая извлекает user_id из заголовка X-User-ID
    и проверяет, что такой пользователь существует в БД.
    Если нет – выбрасывает 403.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = ?", (x_user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Пользователь с таким ID не найден"
            )
    return x_user_id