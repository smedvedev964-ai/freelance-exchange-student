import os
import sqlite3

DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "freelance_exchange.db")
)

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                budget REAL NOT NULL,
                author_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'open',
                assigned_freelancer_id INTEGER
            )
        """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                freelancer_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
            )
        """
        )
        conn.commit()


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
