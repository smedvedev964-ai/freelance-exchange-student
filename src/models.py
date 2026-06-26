"""
Pydantic-схемы для валидации запросов и формирования ответов.
"""
from typing import Optional
from pydantic import BaseModel, Field, EmailStr

# ---------- Схемы для пользователей ----------
class UserRegister(BaseModel):
    """Данные для регистрации нового пользователя."""
    username: str = Field(..., min_length=3, max_length=50, description="Уникальное имя пользователя")
    email: EmailStr = Field(..., description="Электронная почта")
    password: str = Field(..., min_length=6, description="Пароль (не менее 6 символов)")

class UserLogin(BaseModel):
    """Данные для входа в систему."""
    username: str = Field(..., description="Имя пользователя")
    password: str = Field(..., description="Пароль")

class UserProfile(BaseModel):
    """Профиль пользователя (без пароля)."""
    id: int
    username: str
    email: str
    created_at: str   # Будет возвращаться как строка ISO

# ---------- Схемы для заказов ----------
class OrderCreate(BaseModel):
    """Данные для создания нового заказа (author_id берётся из заголовка)."""
    title: str = Field(..., min_length=1, max_length=200, description="Название заказа")
    description: Optional[str] = Field(None, max_length=1000, description="Описание заказа")
    budget: float = Field(..., gt=0, description="Бюджет (должен быть больше 0)")

class OrderUpdate(BaseModel):
    """Данные для обновления заказа (статус и/или исполнитель)."""
    status: Optional[str] = Field(
        None,
        pattern="^(open|in_progress|closed)$",
        description="Новый статус (open | in_progress | closed)"
    )
    assigned_freelancer_id: Optional[int] = Field(
        None,
        description="ID фрилансера, назначаемого исполнителем"
    )

# ---------- Схемы для откликов ----------
class ResponseCreate(BaseModel):
    """Данные для создания отклика на заказ."""
    freelancer_id: int = Field(..., description="ID фрилансера, оставляющего отклик")
    text: str = Field(..., min_length=1, max_length=1000, description="Текст отклика")