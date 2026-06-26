"""
Роутер для управления заказами.
Все эндпоинты требуют идентификации пользователя через заголовок X-User-ID.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from src.database import get_db_connection
from src.models import OrderCreate, OrderUpdate
from src.auth import get_current_user_id

router = APIRouter(prefix="/orders", tags=["Заказы"])

# ---------- Вспомогательные функции ----------
def validate_status_transition(old_status: str, new_status: str) -> None:
    """
    Проверяет допустимость перехода между статусами заказа.
    Допустимые переходы: open -> in_progress -> closed (обратно нельзя).
    """
    allowed_transitions = {
        "open": ["in_progress"],
        "in_progress": ["closed"],
        "closed": []  # из закрытого заказа нельзя изменить статус
    }
    if new_status not in allowed_transitions.get(old_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый переход из статуса '{old_status}' в '{new_status}'"
        )

def check_order_exists(cursor, order_id: int) -> dict:
    """Проверяет существование заказа и возвращает его данные."""
    cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
    order = cursor.fetchone()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Заказ с id {order_id} не найден"
        )
    return order

# ---------- Эндпоинты ----------
@router.get("")
def get_all_orders(
    status: Optional[str] = None,
    limit: int = 10,
    offset: int = 0
):
    """
    Получает список заказов с возможностью фильтрации по статусу и пагинации.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        query = """
            SELECT 
                orders.*,
                users.username as author_username,
                assignee.username as assigned_freelancer_username
            FROM orders
            LEFT JOIN users ON orders.author_id = users.id
            LEFT JOIN users assignee ON orders.assigned_freelancer_id = assignee.id
        """
        params = []
        if status:
            query += " WHERE orders.status = ?"
            params.append(status)
        query += " ORDER BY orders.id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

@router.get("/{order_id}")
def get_order_by_id(order_id: int):
    """Возвращает один заказ по его ID."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                orders.*,
                users.username as author_username,
                assignee.username as assigned_freelancer_username
            FROM orders
            LEFT JOIN users ON orders.author_id = users.id
            LEFT JOIN users assignee ON orders.assigned_freelancer_id = assignee.id
            WHERE orders.id = ?
        """, (order_id,))
        order = cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Заказ не найден")
        return dict(order)

@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(
    order: OrderCreate,
    user_id: int = Depends(get_current_user_id)
):
    """
    Создаёт новый заказ от имени текущего пользователя.
    author_id берётся из заголовка X-User-ID.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO orders (title, description, budget, author_id, status)
            VALUES (?, ?, ?, ?, 'open')
            """,
            (order.title, order.description, order.budget, user_id)
        )
        conn.commit()
        order_id = cursor.lastrowid

        cursor.execute("""
            SELECT 
                orders.*,
                users.username as author_username,
                assignee.username as assigned_freelancer_username
            FROM orders
            LEFT JOIN users ON orders.author_id = users.id
            LEFT JOIN users assignee ON orders.assigned_freelancer_id = assignee.id
            WHERE orders.id = ?
        """, (order_id,))
        new_order = cursor.fetchone()
        return dict(new_order)

@router.patch("/{order_id}")
def update_order(
    order_id: int,
    order_data: OrderUpdate,
    user_id: int = Depends(get_current_user_id)
):
    """
    Обновляет статус и/или назначает исполнителя.
    Только автор заказа может его менять.
    Проверяется допустимость перехода статусов и что исполнитель откликался.
    """
    update_fields = order_data.model_dump(exclude_unset=True)
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не переданы поля для обновления"
        )

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Проверяем существование и авторство
        order = check_order_exists(cursor, order_id)
        if order["author_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только автор может редактировать заказ"
            )

        # Если меняется статус – проверяем переход
        new_status = update_fields.get("status")
        if new_status:
            validate_status_transition(order["status"], new_status)

        # Если назначается исполнитель – проверяем, что он откликался
        new_freelancer = update_fields.get("assigned_freelancer_id")
        if new_freelancer is not None:
            cursor.execute(
                "SELECT 1 FROM responses WHERE order_id = ? AND freelancer_id = ?",
                (order_id, new_freelancer)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Фрилансер не откликался на этот заказ"
                )
            # При назначении исполнителя статус должен быть не 'open'
            if not new_status and order["status"] == "open":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="При назначении исполнителя необходимо изменить статус на 'in_progress' или 'closed'"
                )

        # Формируем и выполняем UPDATE
        set_clause = ", ".join([f"{key} = ?" for key in update_fields.keys()])
        query_values = list(update_fields.values()) + [order_id]
        cursor.execute(f"UPDATE orders SET {set_clause} WHERE id = ?", query_values)
        conn.commit()

        # Возвращаем обновлённый заказ с именами
        cursor.execute("""
            SELECT 
                orders.*,
                users.username as author_username,
                assignee.username as assigned_freelancer_username
            FROM orders
            LEFT JOIN users ON orders.author_id = users.id
            LEFT JOIN users assignee ON orders.assigned_freelancer_id = assignee.id
            WHERE orders.id = ?
        """, (order_id,))
        updated_order = cursor.fetchone()
        return dict(updated_order)

@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    user_id: int = Depends(get_current_user_id)
):
    """
    Удаляет заказ. Доступно только автору.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        order = check_order_exists(cursor, order_id)
        if order["author_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только автор может удалить заказ"
            )
        cursor.execute("DELETE FROM orders WHERE id = ?", (order_id,))
        conn.commit()
        return {"ok": True, "message": f"Заказ {order_id} удалён"}