from __future__ import annotations

import re
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db import init_db
from app.planner import build_today_plan
from app.repository import create_task, list_open_tasks, list_tasks, mark_task_done, update_task
from app.schemas import Task, TaskCreate, TaskUpdate, TodayPlanItem

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
VALID_USER_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")

app = FastAPI(title="Deadline Coach", version="1.2.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


def get_user_id(x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> str:
    if x_user_id is None:
        raise HTTPException(status_code=400, detail="X-User-Id header is required")

    user_id = x_user_id.strip()
    if not VALID_USER_ID_PATTERN.fullmatch(user_id):
        raise HTTPException(
            status_code=400,
            detail="User ID must be 1-64 chars: letters, digits, dot, dash, underscore",
        )
    return user_id


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/tasks", response_model=list[Task])
def get_tasks(
    status: str = Query(default="all", pattern="^(all|open|done)$"),
    user_id: str = Depends(get_user_id),
) -> list[dict]:
    filter_status = None if status == "all" else status
    return list_tasks(user_id=user_id, status=filter_status)


@app.post("/api/tasks", response_model=Task, status_code=201)
def post_task(task: TaskCreate, user_id: str = Depends(get_user_id)) -> dict:
    return create_task(task, user_id=user_id)


@app.patch("/api/tasks/{task_id}", response_model=Task)
def patch_task(task_id: int, task_update: TaskUpdate, user_id: str = Depends(get_user_id)) -> dict:
    task = update_task(task_id=task_id, user_id=user_id, task_update=task_update)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.patch("/api/tasks/{task_id}/done", response_model=Task)
def complete_task(task_id: int, user_id: str = Depends(get_user_id)) -> dict:
    task = mark_task_done(task_id, user_id=user_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.get("/api/today-plan", response_model=list[TodayPlanItem])
def today_plan(user_id: str = Depends(get_user_id)) -> list[dict]:
    return build_today_plan(list_open_tasks(user_id=user_id))
