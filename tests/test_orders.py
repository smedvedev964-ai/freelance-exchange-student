"""
Тесты для заказов:
- создание
- получение
- удаление
"""

# ---------- Создание пользователя ----------
def create_user(client, name):

    response = client.post(
        "/auth/register",
        json={
            "username": name,
            "email": f"{name}@mail.com",
            "password": "123456"
        }
    )

    return response.json()["id"]

# ---------- Создание заказа ----------
def test_create_order(client):

    user = create_user(client, "author")

    response = client.post(
        "/orders",
        headers={
            "X-User-ID": str(user)
        },
        json={
            "title": "Site",
            "description": "Need site",
            "budget": 1500
        }
    )

    assert response.status_code == 201
    assert response.json()["author_id"] == user

# ---------- Список заказов ----------
def test_get_orders(client):

    response = client.get("/orders")

    assert response.status_code == 200
    assert isinstance(response.json(), list)

# ---------- Один заказ ----------
def test_get_order_by_id(client):

    user = create_user(client, "author2")

    order = client.post(
        "/orders",
        headers={"X-User-ID": str(user)},
        json={
            "title": "API",
            "description": "FastAPI",
            "budget": 2000
        }
    )

    order_id = order.json()["id"]

    response = client.get(f"/orders/{order_id}")

    assert response.status_code == 200

# ---------- Удаление заказа ----------
def test_delete_order(client):

    user = create_user(client, "delete")

    order = client.post(
        "/orders",
        headers={"X-User-ID": str(user)},
        json={
            "title": "Delete",
            "description": "Delete",
            "budget": 300
        }
    )

    order_id = order.json()["id"]

    response = client.delete(
        f"/orders/{order_id}",
        headers={
            "X-User-ID": str(user)
        }
    )

    assert response.status_code == 200