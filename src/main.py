from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import RedirectResponse

from src.database import get_db_connection, init_db
from src.models import OrderCreate, OrderUpdate, ResponseCreate

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Student Freelance Exchange API", lifespan=lifespan
)


@app.get("/")
def main_root():
    """Перенаправляет пользователя с главного корня сразу в Swagger документацию."""
    return RedirectResponse(url="/docs")


@app.get("/orders", status_code=status.HTTP_200_OK)
def get_all_orders():
    """Получает список всех заказов"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orders")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@app.post("/orders", status_code=status.HTTP_201_CREATED)
def create_order(order: OrderCreate):
    """Создает новый заказ"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO orders (title, description, budget, author_id, status)
            VALUES (?, ?, ?, ?, 'open')
        """,
            (order.title, order.description, order.budget, order.author_id),
        )
        conn.commit()
        order_id = cursor.lastrowid

        cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
        new_order = cursor.fetchone()
        return dict(new_order)


@app.get("/orders/{id}/responses", status_code=status.HTTP_200_OK)
def get_order_responses(id: int):
    """Получает список откликов на заказ с определенным id'шником"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM orders WHERE id = ?", (id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Заказ с id {id} не найден",
            )

        cursor.execute("SELECT * FROM responses WHERE order_id = ?", (id,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@app.post("/orders/{id}/responses", status_code=status.HTTP_201_CREATED)
def create_response(id: int, response: ResponseCreate):
    """Добавляет отклик на заказ"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM orders WHERE id = ?", (id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Заказ с id {id} не найден",
            )

        cursor.execute(
            """
            INSERT INTO responses (order_id, freelancer_id, text)
            VALUES (?, ?, ?)
        """,
            (id, response.freelancer_id, response.text),
        )
        conn.commit()
        response_id = cursor.lastrowid

        cursor.execute(
            "SELECT * FROM responses WHERE id = ?", (response_id,)
        )
        new_response = cursor.fetchone()
        return dict(new_response)


@app.patch("/orders/{id}", status_code=status.HTTP_200_OK)
def update_order(id: int, order_data: OrderUpdate):
    """Изменяет статус заказа или закрепляет исполнителя"""

    update_fields = order_data.model_dump(exclude_unset=True)

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не переданы поля для обновления",
        )

    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM orders WHERE id = ?", (id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Заказ с id {id} не найден",
            )

        set_clause = ", ".join([f"{key} = ?" for key in update_fields.keys()])
        query_values = list(update_fields.values()) + [id]

        sql_query = f"UPDATE orders SET {set_clause} WHERE id = ?"
        cursor.execute(sql_query, query_values)
        conn.commit()

        cursor.execute("SELECT * FROM orders WHERE id = ?", (id,))
        updated_order = cursor.fetchone()
        return dict(updated_order)
