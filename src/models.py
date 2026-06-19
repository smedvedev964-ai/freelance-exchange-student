from typing import Optional
from pydantic import BaseModel, Field


class OrderCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Название заказа")
    description: Optional[str] = Field(None, description="Описание заказа")
    budget: float = Field(..., gt=0, description="Бюджет должен быть больше 0")
    author_id: int = Field(..., description="ID заказчика")


class ResponseCreate(BaseModel):
    freelancer_id: int = Field(..., description="ID фрилансера")
    text: str = Field(..., min_length=1, description="Текст отклика")


class OrderUpdate(BaseModel):
    status: Optional[str] = Field(
        None, pattern="^(open|in_progress|closed)$"
    )
    assigned_freelancer_id: Optional[int] = None
