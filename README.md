# Биржа фриланса для студентов (внутриуниверситетские заказы)

**Цель проекта:** Платформа для размещения и выполнения заказов внутри университета с системой регистрации пользователей, управления заказами и откликами исполнителей. Студенты могут находить заказы, а компании могут публиковать задачи и выбирать исполнителей.

## Стек

- Бэкенд: Python 3.10+ (FastAPI)
- База данных: SQLite
- Фронтенд: HTML/CSS + JS

## Структура проекта

- src/
   - main.py — точка входа
   - database.py — подключение к БД
   - models.py — Pydantic-схемы
   - auth.py — авторизация
   - routers/
     - users.py — пользователи
     - orders.py — заказы
     - responses.py — отклики

frontend/
    index.html
    style.css
    script.js

tests/
    conftest.py
    test_users.py
    test_orders.py
    test_responses.py

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