from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

DB_PATH = Path("deadline_coach.db")


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
    finally:
        connection.close()


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL DEFAULT 'default',
                title TEXT NOT NULL,
                course TEXT NOT NULL DEFAULT '',
                deadline TEXT NOT NULL,
                estimated_minutes INTEGER,
                status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'done')),
                created_at TEXT NOT NULL,
                completed_at TEXT
            );
            """
        )
        columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(tasks)").fetchall()
        }
        if "user_id" not in columns:
            connection.execute(
                "ALTER TABLE tasks ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default'"
            )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_tasks_user_status_deadline
            ON tasks (user_id, status, deadline, id)
            """
        )
        connection.commit()
