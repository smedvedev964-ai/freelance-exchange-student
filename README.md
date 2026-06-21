# Биржа фриланса для студентов (внутриуниверситетские заказы)

**Цель проекта:** Платформа для соединения студентов и компаний-партнёров университета.
Студенты могут находить заказы, а компании могут публиковать задачи и выбирать исполнителей.

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
`tests/` — тесты (пока пусто)

## Как запустить проект локально
1. Установи зависимости в терминале:

pip install -r requirements.txt

2. Запусти сервер:

uvicorn src.main:app --reload

3. Открой в браузере: 

http://localhost:8000

## Как запустить тесты
(инструкция появится позже)