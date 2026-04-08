from __future__ import annotations

from datetime import datetime, timezone
from sqlite3 import Row
from typing import Any

from app.db import get_connection
from app.schemas import TaskCreate


def _row_to_task(row: Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "course": row["course"],
        "deadline": row["deadline"],
        "estimated_minutes": row["estimated_minutes"],
        "status": row["status"],
        "created_at": row["created_at"],
        "completed_at": row["completed_at"],
    }


def create_task(task: TaskCreate, user_id: str) -> dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO tasks (user_id, title, course, deadline, estimated_minutes, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'open', ?)
            """,
            (
                user_id,
                task.title.strip(),
                task.course.strip(),
                task.deadline.isoformat(),
                task.estimated_minutes,
                created_at,
            ),
        )
        task_id = cursor.lastrowid
        connection.commit()
    saved_task = get_task(task_id, user_id)
    if saved_task is None:
        raise RuntimeError("Task was created but could not be read from database")
    return saved_task


def get_task(task_id: int, user_id: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, title, course, deadline, estimated_minutes, status, created_at, completed_at
            FROM tasks
            WHERE id = ? AND user_id = ?
            """,
            (task_id, user_id),
        ).fetchone()
    return _row_to_task(row) if row is not None else None


def list_tasks(user_id: str, status: str | None = None) -> list[dict[str, Any]]:
    query = """
        SELECT id, title, course, deadline, estimated_minutes, status, created_at, completed_at
        FROM tasks
        WHERE user_id = ?
    """
    params: tuple[object, ...] = (user_id,)
    if status is not None:
        query += " AND status = ?"
        params = (user_id, status)
    query += " ORDER BY deadline ASC, id ASC"

    with get_connection() as connection:
        rows = connection.execute(query, params).fetchall()
    return [_row_to_task(row) for row in rows]


def list_open_tasks(user_id: str) -> list[dict[str, Any]]:
    return list_tasks(user_id=user_id, status="open")


def mark_task_done(task_id: int, user_id: str) -> dict[str, Any] | None:
    completed_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE tasks
            SET status = 'done', completed_at = ?
            WHERE id = ? AND user_id = ? AND status != 'done'
            """,
            (completed_at, task_id, user_id),
        )
        connection.commit()
    if cursor.rowcount == 0:
        return get_task(task_id, user_id)
    return get_task(task_id, user_id)
