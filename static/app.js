const taskForm = document.getElementById("task-form");
const messageEl = document.getElementById("message");
const todayPlanEl = document.getElementById("today-plan");
const allTasksEl = document.getElementById("all-tasks");
const refreshPlanButton = document.getElementById("refresh-plan");
const refreshTasksButton = document.getElementById("refresh-tasks");
const userIdInput = document.getElementById("user-id");
const saveUserButton = document.getElementById("save-user");
const activeUserLabel = document.getElementById("active-user-label");

const USER_STORAGE_KEY = "deadlineCoachUserId";
const USER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;
let activeUserId = "";

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

function updateUserLabel() {
  if (activeUserId) {
    activeUserLabel.textContent = `Current user: ${activeUserId}`;
    return;
  }
  activeUserLabel.textContent = "Set User ID to load your personal task list.";
}

function setActiveUser(userId) {
  activeUserId = userId;
  localStorage.setItem(USER_STORAGE_KEY, userId);
  userIdInput.value = userId;
  updateUserLabel();
}

function requireUserId() {
  if (!activeUserId) {
    throw new Error("Set User ID first");
  }
}

async function fetchJson(url, options = {}) {
  requireUserId();
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": activeUserId,
      ...(options.headers || {}),
    },
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
  if (!activeUserId) {
    renderEmptyState(todayPlanEl, "Set User ID to view your tasks.");
    return;
  }

  const tasks = await fetchJson("/api/today-plan");
  if (!tasks.length) {
    renderEmptyState(todayPlanEl, "No open tasks. Add one above.");
    return;
  }
  todayPlanEl.innerHTML = tasks.map((task) => renderTaskItem(task, true)).join("");
}

async function loadAllTasks() {
  if (!activeUserId) {
    renderEmptyState(allTasksEl, "Set User ID to view your tasks.");
    return;
  }

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

  if (!activeUserId) {
    messageEl.textContent = "Set User ID before creating tasks.";
    return;
  }

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

  if (!activeUserId) {
    messageEl.textContent = "Set User ID before updating tasks.";
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

async function handleSaveUser() {
  const userId = userIdInput.value.trim();
  if (!USER_ID_PATTERN.test(userId)) {
    messageEl.textContent = "User ID must be 1-64 chars: letters, digits, dot, dash, underscore.";
    return;
  }

  setActiveUser(userId);
  messageEl.textContent = `Using task database for user: ${userId}`;
  await refreshAll();
}

function attachEvents() {
  taskForm.addEventListener("submit", handleCreateTask);
  refreshPlanButton.addEventListener("click", loadTodayPlan);
  refreshTasksButton.addEventListener("click", loadAllTasks);
  todayPlanEl.addEventListener("click", handleMarkDone);
  allTasksEl.addEventListener("click", handleMarkDone);
  saveUserButton.addEventListener("click", () => {
    handleSaveUser().catch((error) => {
      messageEl.textContent = `Failed to switch user: ${error.message}`;
    });
  });
  userIdInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSaveUser().catch((error) => {
        messageEl.textContent = `Failed to switch user: ${error.message}`;
      });
    }
  });
}

function restoreUserFromStorage() {
  const storedUserId = (localStorage.getItem(USER_STORAGE_KEY) || "").trim();
  if (USER_ID_PATTERN.test(storedUserId)) {
    setActiveUser(storedUserId);
  } else {
    updateUserLabel();
  }
}

attachEvents();
restoreUserFromStorage();
refreshAll().catch((error) => {
  messageEl.textContent = `Failed to load data: ${error.message}`;
});
