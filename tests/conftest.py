"""
Тестовая конфигурация.
Создание TestClient и подготовка тестовой базы.
"""

import os
import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.database import init_db, DB_PATH


# ---------- ТЕСТОВАЯ БАЗА ДАННЫХ ----------
@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Создаёт тестовую БД и очищает её перед тестами.
    """

    # если файл уже есть — удаляем
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    # создаём таблицы
    init_db()

    yield
    # ВАЖНО: не удаляем файл (Windows SQLite держит его)


# ---------- HTTP CLIENT ДЛЯ ТЕСТОВ ----------
@pytest.fixture()
def client():
    """
    HTTP клиент для тестирования FastAPI.
    """
    return TestClient(app)