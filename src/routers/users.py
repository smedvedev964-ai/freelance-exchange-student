"""
Роутер для операций с пользователями:
регистрация, логин, получение профиля.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from src.database import get_db_connection
from src.models import UserRegister, UserLogin, UserProfile
from src.auth import hash_password, verify_password, get_current_user_id

router = APIRouter(prefix="/auth", tags=["Пользователи"])

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserProfile)
def register(user_data: UserRegister):
    """
    Регистрация нового пользователя.
    Проверяет уникальность username и email, хеширует пароль.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Проверка, что username или email уже заняты
        cursor.execute(
            "SELECT id FROM users WHERE username = ? OR email = ?",
            (user_data.username, user_data.email)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким username или email уже существует"
            )

        hashed = hash_password(user_data.password)
        cursor.execute(
            "INSERT INTO users (username, email, hashed_password) VALUES (?, ?, ?)",
            (user_data.username, user_data.email, hashed)
        )
        conn.commit()
        user_id = cursor.lastrowid

        # Возвращаем созданный профиль
        cursor.execute(
            "SELECT id, username, email, created_at FROM users WHERE id = ?",
            (user_id,)
        )
        new_user = cursor.fetchone()
        return dict(new_user)

@router.post("/login")
def login(user_data: UserLogin):
    """
    Вход в систему.
    Проверяет пароль и возвращает данные пользователя (включая user_id).
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, username, email, hashed_password FROM users WHERE username = ?",
            (user_data.username,)
        )
        row = cursor.fetchone()
        if not row or not verify_password(user_data.password, row["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверное имя пользователя или пароль"
            )
        return {
            "user_id": row["id"],
            "username": row["username"],
            "email": row["email"]
        }

@router.get("/users/me", response_model=UserProfile)
def get_my_profile(user_id: int = Depends(get_current_user_id)):
    """
    Возвращает профиль текущего пользователя (требуется заголовок X-User-ID).
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, username, email, created_at FROM users WHERE id = ?",
            (user_id,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        return dict(user)