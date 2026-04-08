from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    course: str = Field(default="", max_length=100)
    deadline: date
    estimated_minutes: int | None = Field(default=None, ge=1, le=24 * 60)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    course: str | None = Field(default=None, max_length=100)
    deadline: date | None = None
    estimated_minutes: int | None = Field(default=None, ge=1, le=24 * 60)

    @model_validator(mode="after")
    def validate_payload(self) -> "TaskUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")

        for required_field in ("title", "course", "deadline"):
            if required_field in self.model_fields_set and getattr(self, required_field) is None:
                raise ValueError(f"{required_field} cannot be null")

        if "title" in self.model_fields_set and self.title is not None and not self.title.strip():
            raise ValueError("title cannot be blank")

        return self


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
