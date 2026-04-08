from __future__ import annotations

from datetime import datetime, timezone
from sqlite3 import Row

from app.db import get_connection
from app.schemas import TaskCreate


def _row_to_task(row: Row) -> dict:
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


def create_task(task: TaskCreate) -> dict:
    created_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO tasks (title, course, deadline, estimated_minutes, status, created_at)
            VALUES (?, ?, ?, ?, 'open', ?)
            """,
            (
                task.title.strip(),
                task.course.strip(),
                task.deadline.isoformat(),
                task.estimated_minutes,
                created_at,
            ),
        )
        task_id = cursor.lastrowid
        connection.commit()
    saved_task = get_task(task_id)
    if saved_task is None:
        raise RuntimeError("Task was created but could not be read from database")
    return saved_task


def get_task(task_id: int) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, title, course, deadline, estimated_minutes, status, created_at, completed_at
            FROM tasks
            WHERE id = ?
            """,
            (task_id,),
        ).fetchone()
    return _row_to_task(row) if row is not None else None


def list_tasks(status: str | None = None) -> list[dict]:
    query = """
        SELECT id, title, course, deadline, estimated_minutes, status, created_at, completed_at
        FROM tasks
    """
    params: tuple[str, ...] = ()
    if status is not None:
        query += " WHERE status = ?"
        params = (status,)
    query += " ORDER BY deadline ASC, id ASC"

    with get_connection() as connection:
        rows = connection.execute(query, params).fetchall()
    return [_row_to_task(row) for row in rows]


def list_open_tasks() -> list[dict]:
    return list_tasks(status="open")


def mark_task_done(task_id: int) -> dict | None:
    completed_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE tasks
            SET status = 'done', completed_at = ?
            WHERE id = ? AND status != 'done'
            """,
            (completed_at, task_id),
        )
        connection.commit()
    if cursor.rowcount == 0:
        return get_task(task_id)
    return get_task(task_id)
