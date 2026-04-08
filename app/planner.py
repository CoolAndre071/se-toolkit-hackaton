from __future__ import annotations

from datetime import date
from typing import Any


def task_sort_key(task: dict[str, Any], today: date) -> tuple[int, int, str]:
    deadline = date.fromisoformat(task["deadline"])
    days_left = (deadline - today).days
    estimated_minutes = task.get("estimated_minutes")
    effort_key = estimated_minutes if isinstance(estimated_minutes, int) else 10**9
    return (days_left, effort_key, task["title"].lower())


def build_today_plan(tasks: list[dict[str, Any]], today: date | None = None) -> list[dict[str, Any]]:
    plan_day = today or date.today()
    sorted_tasks = sorted(tasks, key=lambda task: task_sort_key(task, plan_day))
    for task in sorted_tasks:
        deadline = date.fromisoformat(task["deadline"])
        task["days_left"] = (deadline - plan_day).days
        task["is_overdue"] = task["days_left"] < 0
    return sorted_tasks
