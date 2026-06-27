# Биржа фриланса для студентов (внутриуниверситетские заказы)

**Цель проекта:** Платформа для размещения и выполнения заказов внутри университета с системой регистрации пользователей, управления заказами и откликами исполнителей. Студенты могут находить заказы, а компании могут публиковать задачи и выбирать исполнителей.

## Стек

- Бэкенд: Python 3.10+ (FastAPI)
- База данных: SQLite
- Фронтенд: HTML/CSS + JS

## Структура проекта

`src/` — бэкенд (Python/FastAPI)
    `src/main.py` — точка входа
    `src/database.py` — подключение к БД, создание таблиц
    `src/models.py` — Pydantic-схемы
    `src/auth.py` — хеширование, зависимость для получения user_id
    `src/routers/` — папка с роутерами (контроллерами)
        `src/routers/__init__.py` — делает папку пакетом
        `src/routers/users.py` — эндпоинты /auth/register, /auth/login, /users/me
        `src/routers/orders.py` — эндпоинты /orders (CRUD + пагинация + проверки)
        `src/routers/responses.py` — эндпоинты /orders/{id}/responses (создание, удаление)

`frontend/` — фронтенд (HTML/CSS/JS)
    `frontend/index.html` — главная страница
    `frontend/style.css` — стили
    `frontend/script.js` — JavaScript

`tests/` — автоматические тесты API (pytest, FastAPI TestClient)  
    `tests/conftest.py` — общие фикстуры (TestClient, подготовка тестовой БД)  
    `tests/test_users.py` — тесты регистрации, логина и профиля пользователя  
    `tests/test_orders.py` — тесты создания, получения, удаления заказов  
    `tests/test_responses.py` — тесты откликов на заказы (создание, удаление)

## Как запустить проект локально

1. Установить зависимости в терминале:

pip install -r requirements.txt

2. Запустить сервер:

uvicorn src.main:app --reload

3. Открой в браузере: 

http://localhost:8000

## Как запустить тесты

Ввести в терминал:

python -m pytest tests -v