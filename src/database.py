"""
Модуль для работы с базой данных SQLite.
Содержит инициализацию таблиц и функцию получения соединения.
"""
import os
import sqlite3

# Путь к файлу базы данных (на уровень выше папки src)
DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "freelance_exchange.db")
)

def init_db():
    """
    Создаёт таблицы, если они ещё не существуют.
    Включает поддержку внешних ключей.
    """
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()

        # Включаем проверку внешних ключей
        cursor.execute("PRAGMA foreign_keys = ON;")

        # Таблица пользователей
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                hashed_password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Таблица заказов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                budget REAL NOT NULL,
                author_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'open',
                assigned_freelancer_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_freelancer_id) REFERENCES users(id) ON DELETE SET NULL
            )
        """)

        # Таблица откликов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                freelancer_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        conn.commit()

def get_db_connection():
    """
    Возвращает соединение с БД с row_factory = sqlite3.Row,
    чтобы доступ к колонкам был по имени.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn