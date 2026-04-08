const taskForm = document.getElementById("task-form");
const messageEl = document.getElementById("message");
const todayPlanEl = document.getElementById("today-plan");
const allTasksEl = document.getElementById("all-tasks");
const refreshPlanButton = document.getElementById("refresh-plan");
const refreshTasksButton = document.getElementById("refresh-tasks");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toDateString(isoDate) {
  return new Date(isoDate).toLocaleDateString();
}

function taskMeta(task) {
  const parts = [`Deadline: ${toDateString(task.deadline)}`];
  if (task.course) {
    parts.push(`Course: ${task.course}`);
  }
  if (task.estimated_minutes) {
    parts.push(`Effort: ${task.estimated_minutes} min`);
  }
  if (task.days_left !== undefined) {
    parts.push(task.days_left < 0 ? `Overdue by ${Math.abs(task.days_left)} day(s)` : `${task.days_left} day(s) left`);
  }
  return parts.join(" | ");
}

function renderEmptyState(element, text) {
  element.innerHTML = `<li class="task-meta">${escapeHtml(text)}</li>`;
}

function renderTaskItem(task, includePlanFlags = false) {
  const titleClass = task.status === "done" ? "task-title done" : "task-title";
  const overdueBadge = includePlanFlags && task.is_overdue ? "<span class=\"badge-overdue\">Overdue</span>" : "";
  const doneButton = task.status === "done"
    ? ""
    : `<button type=\"button\" data-action=\"done\" data-id=\"${task.id}\">Mark done</button>`;

  return `
    <li class="task-item">
      <div class="task-main">
        <div class="${titleClass}">${escapeHtml(task.title)} ${overdueBadge}</div>
        <div class="task-meta">${escapeHtml(taskMeta(task))}</div>
      </div>
      <div>${doneButton}</div>
    </li>
  `;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = await response.json();
      detail = payload.detail || detail;
    } catch {
      // Keep default detail when non-JSON response is returned.
    }
    throw new Error(detail);
  }

  return response.json();
}

async function loadTodayPlan() {
  const tasks = await fetchJson("/api/today-plan");
  if (!tasks.length) {
    renderEmptyState(todayPlanEl, "No open tasks. Add one above.");
    return;
  }
  todayPlanEl.innerHTML = tasks.map((task) => renderTaskItem(task, true)).join("");
}

async function loadAllTasks() {
  const tasks = await fetchJson("/api/tasks?status=all");
  if (!tasks.length) {
    renderEmptyState(allTasksEl, "No tasks yet.");
    return;
  }
  allTasksEl.innerHTML = tasks.map((task) => renderTaskItem(task)).join("");
}

async function refreshAll() {
  await Promise.all([loadTodayPlan(), loadAllTasks()]);
}

async function handleCreateTask(event) {
  event.preventDefault();
  const formData = new FormData(taskForm);

  const payload = {
    title: (formData.get("title") || "").toString().trim(),
    course: (formData.get("course") || "").toString().trim(),
    deadline: formData.get("deadline"),
  };

  const estimated = (formData.get("estimated_minutes") || "").toString().trim();
  if (estimated) {
    payload.estimated_minutes = Number(estimated);
  }

  try {
    await fetchJson("/api/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    taskForm.reset();
    messageEl.textContent = "Task created.";
    await refreshAll();
  } catch (error) {
    messageEl.textContent = `Failed to create task: ${error.message}`;
  }
}

async function handleMarkDone(event) {
  const button = event.target.closest("button[data-action='done']");
  if (!button) {
    return;
  }

  const taskId = button.getAttribute("data-id");
  try {
    await fetchJson(`/api/tasks/${taskId}/done`, { method: "PATCH" });
    messageEl.textContent = "Task marked as done.";
    await refreshAll();
  } catch (error) {
    messageEl.textContent = `Failed to update task: ${error.message}`;
  }
}

function attachEvents() {
  taskForm.addEventListener("submit", handleCreateTask);
  refreshPlanButton.addEventListener("click", loadTodayPlan);
  refreshTasksButton.addEventListener("click", loadAllTasks);
  todayPlanEl.addEventListener("click", handleMarkDone);
  allTasksEl.addEventListener("click", handleMarkDone);
}

attachEvents();
refreshAll().catch((error) => {
  messageEl.textContent = `Failed to load data: ${error.message}`;
});
