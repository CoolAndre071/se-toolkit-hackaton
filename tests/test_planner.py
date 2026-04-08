from datetime import date

from app.planner import build_today_plan


def test_build_today_plan_includes_only_overdue_and_due_today() -> None:
    tasks = [
        {"id": 1, "title": "Future task", "deadline": "2026-04-11", "estimated_minutes": 30, "status": "open"},
        {"id": 2, "title": "Due today", "deadline": "2026-04-09", "estimated_minutes": 45, "status": "open"},
        {"id": 3, "title": "Overdue", "deadline": "2026-04-08", "estimated_minutes": 20, "status": "open"},
    ]

    plan = build_today_plan(tasks, today=date(2026, 4, 9))

    assert [task["id"] for task in plan] == [3, 2]


def test_build_today_plan_orders_due_today_by_effort() -> None:
    tasks = [
        {"id": 1, "title": "Task C", "deadline": "2026-04-09", "estimated_minutes": 30, "status": "open"},
        {"id": 2, "title": "Task A", "deadline": "2026-04-09", "estimated_minutes": 45, "status": "open"},
        {"id": 3, "title": "Task B", "deadline": "2026-04-09", "estimated_minutes": 20, "status": "open"},
    ]

    plan = build_today_plan(tasks, today=date(2026, 4, 9))

    assert [task["id"] for task in plan] == [3, 1, 2]
    assert plan[0]["days_left"] == 0
    assert plan[0]["is_overdue"] is False


def test_build_today_plan_flags_overdue_tasks() -> None:
    tasks = [
        {"id": 1, "title": "Overdue", "deadline": "2026-04-01", "estimated_minutes": None, "status": "open"},
    ]

    plan = build_today_plan(tasks, today=date(2026, 4, 9))

    assert plan[0]["is_overdue"] is True
    assert plan[0]["days_left"] == -8
