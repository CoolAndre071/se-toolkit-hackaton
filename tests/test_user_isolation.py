from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def _user_headers(user_id: str) -> dict[str, str]:
    return {"X-User-Id": user_id}


def _test_db_path() -> Path:
    base = Path(".test-db")
    base.mkdir(exist_ok=True)
    return base / f"{uuid4().hex}.db"


def test_users_see_only_their_own_tasks(monkeypatch) -> None:
    from app import db

    monkeypatch.setattr(db, "DB_PATH", _test_db_path())

    with TestClient(app) as client:
        alice_task = client.post(
            "/api/tasks",
            headers=_user_headers("alice"),
            json={
                "title": "Alice task",
                "course": "SE",
                "deadline": "2026-04-12",
                "estimated_minutes": 40,
            },
        )
        bob_task = client.post(
            "/api/tasks",
            headers=_user_headers("bob"),
            json={
                "title": "Bob task",
                "course": "DB",
                "deadline": "2026-04-10",
                "estimated_minutes": 30,
            },
        )

        assert alice_task.status_code == 201
        assert bob_task.status_code == 201

        alice_tasks = client.get("/api/tasks?status=all", headers=_user_headers("alice"))
        bob_tasks = client.get("/api/tasks?status=all", headers=_user_headers("bob"))

        assert alice_tasks.status_code == 200
        assert bob_tasks.status_code == 200
        assert [task["title"] for task in alice_tasks.json()] == ["Alice task"]
        assert [task["title"] for task in bob_tasks.json()] == ["Bob task"]


def test_user_cannot_mark_another_user_task_done(monkeypatch) -> None:
    from app import db

    monkeypatch.setattr(db, "DB_PATH", _test_db_path())

    with TestClient(app) as client:
        alice_task = client.post(
            "/api/tasks",
            headers=_user_headers("alice"),
            json={
                "title": "Alice task",
                "course": "SE",
                "deadline": "2026-04-12",
                "estimated_minutes": 40,
            },
        ).json()

        forbidden_update = client.patch(
            f"/api/tasks/{alice_task['id']}/done",
            headers=_user_headers("bob"),
        )

        assert forbidden_update.status_code == 404

        alice_tasks = client.get("/api/tasks?status=all", headers=_user_headers("alice")).json()
        assert alice_tasks[0]["status"] == "open"


def test_task_endpoints_require_user_header() -> None:
    with TestClient(app) as client:
        response = client.get("/api/tasks")

    assert response.status_code == 400
    assert response.json()["detail"] == "X-User-Id header is required"
