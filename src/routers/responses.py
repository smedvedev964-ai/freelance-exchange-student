"""
Роутер для управления откликами на заказы.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from src.database import get_db_connection
from src.models import ResponseCreate
from src.auth import get_current_user_id

router = APIRouter(prefix="/orders/{order_id}/responses", tags=["Отклики"])

@router.get("")
def get_order_responses(order_id: int):
    """
    Получает список всех откликов на конкретный заказ.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Проверяем, существует ли заказ
        cursor.execute("SELECT id FROM orders WHERE id = ?", (order_id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Заказ с id {order_id} не найден"
            )

        cursor.execute("SELECT * FROM responses WHERE order_id = ?", (order_id,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

@router.post("", status_code=status.HTTP_201_CREATED)
def create_response(
    order_id: int,
    response: ResponseCreate,
    user_id: int = Depends(get_current_user_id)
):
    """
    Добавляет отклик на заказ.
    Проверяет, что заказ существует и что фрилансер не пытается откликнуться на свой же заказ.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Проверяем существование заказа и его автора
        cursor.execute("SELECT author_id FROM orders WHERE id = ?", (order_id,))
        order = cursor.fetchone()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Заказ с id {order_id} не найден"
            )
        if order["author_id"] == response.freelancer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Автор заказа не может откликаться на свой собственный заказ"
            )

        # Вставляем отклик
        cursor.execute(
            """
            INSERT INTO responses (order_id, freelancer_id, text)
            VALUES (?, ?, ?)
            """,
            (order_id, response.freelancer_id, response.text)
        )
        conn.commit()
        response_id = cursor.lastrowid

        cursor.execute("SELECT * FROM responses WHERE id = ?", (response_id,))
        new_response = cursor.fetchone()
        return dict(new_response)

@router.delete("/{response_id}")
def delete_response(
    order_id: int,
    response_id: int,
    user_id: int = Depends(get_current_user_id)
):
    """
    Удаляет отклик. Только фрилансер, оставивший отклик, может его удалить.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Проверяем, что отклик существует и принадлежит текущему пользователю
        cursor.execute(
            "SELECT freelancer_id FROM responses WHERE id = ? AND order_id = ?",
            (response_id, order_id)
        )
        response = cursor.fetchone()
        if not response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Отклик не найден или не принадлежит этому заказу"
            )
        if response["freelancer_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только автор отклика может его удалить"
            )

        cursor.execute("DELETE FROM responses WHERE id = ?", (response_id,))
        conn.commit()
        return {"ok": True, "message": f"Отклик {response_id} удалён"}