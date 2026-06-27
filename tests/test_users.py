"""
Тесты для пользователей:
- регистрация
- логин
- профиль
"""

# ---------- Регистрация ----------
def test_register(client):

    response = client.post(
        "/auth/register",
        json={
            "username": "alex",
            "email": "alex@mail.com",
            "password": "123456"
        }
    )

    assert response.status_code == 201

    data = response.json()

    assert data["username"] == "alex"
    assert data["email"] == "alex@mail.com"
    assert "id" in data

# ---------- Дубликат пользователя ----------
def test_duplicate_registration(client):

    user = {
        "username": "ivan",
        "email": "ivan@mail.com",
        "password": "123456"
    }

    client.post("/auth/register", json=user)

    response = client.post("/auth/register", json=user)

    assert response.status_code == 400

# ---------- Логин ----------
def test_login(client):

    client.post(
        "/auth/register",
        json={
            "username": "user_login",
            "email": "login@mail.com",
            "password": "123456"
        }
    )

    response = client.post(
        "/auth/login",
        json={
            "username": "user_login",
            "password": "123456"
        }
    )

    assert response.status_code == 200
    assert "user_id" in response.json()

# ---------- Неверный пароль ----------
def test_wrong_password(client):

    response = client.post(
        "/auth/login",
        json={
            "username": "user_login",
            "password": "wrong"
        }
    )

    assert response.status_code == 401

# ---------- Профиль ----------
def test_profile(client):

    user = client.post(
        "/auth/register",
        json={
            "username": "profile",
            "email": "profile@mail.com",
            "password": "123456"
        }
    )

    user_id = user.json()["id"]

    response = client.get(
        "/auth/users/me",
        headers={"X-User-ID": str(user_id)}
    )

    assert response.status_code == 200
    assert response.json()["username"] == "profile"