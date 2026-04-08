from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db import init_db
from app.planner import build_today_plan
from app.repository import create_task, list_open_tasks, list_tasks, mark_task_done
from app.schemas import Task, TaskCreate, TodayPlanItem

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Deadline Coach", version="1.0.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/tasks", response_model=list[Task])
def get_tasks(status: str = Query(default="all", pattern="^(all|open|done)$")) -> list[dict]:
    filter_status = None if status == "all" else status
    return list_tasks(status=filter_status)


@app.post("/api/tasks", response_model=Task, status_code=201)
def post_task(task: TaskCreate) -> dict:
    return create_task(task)


@app.patch("/api/tasks/{task_id}/done", response_model=Task)
def complete_task(task_id: int) -> dict:
    task = mark_task_done(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.get("/api/today-plan", response_model=list[TodayPlanItem])
def today_plan() -> list[dict]:
    return build_today_plan(list_open_tasks())
