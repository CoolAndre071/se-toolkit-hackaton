from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    course: str = Field(default="", max_length=100)
    deadline: date
    estimated_minutes: int | None = Field(default=None, ge=1, le=24 * 60)


class Task(BaseModel):
    id: int
    title: str
    course: str
    deadline: date
    estimated_minutes: int | None
    status: str
    created_at: datetime
    completed_at: datetime | None


class TodayPlanItem(Task):
    days_left: int
    is_overdue: bool
