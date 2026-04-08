const taskForm = document.getElementById("task-form");
const taskFormTitle = document.getElementById("task-form-title");
const submitTaskButton = document.getElementById("submit-task");
const cancelEditButton = document.getElementById("cancel-edit");
const messageEl = document.getElementById("message");
const todayPlanEl = document.getElementById("today-plan");
const allTasksEl = document.getElementById("all-tasks");
const refreshPlanButton = document.getElementById("refresh-plan");
const refreshTasksButton = document.getElementById("refresh-tasks");
const allTasksFilter = document.getElementById("all-tasks-filter");
const userIdInput = document.getElementById("user-id");
const saveUserButton = document.getElementById("save-user");
const activeUserLabel = document.getElementById("active-user-label");

const USER_STORAGE_KEY = "deadlineCoachUserId";
const TASK_FILTER_STORAGE_KEY = "deadlineCoachAllTasksFilter";
const USER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;
const VALID_TASK_FILTERS = new Set(["open", "all"]);
let activeUserId = "";
let editingTaskId = null;
const taskById = new Map();

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

  const actions = [`<button type=\"button\" data-action=\"edit\" data-id=\"${task.id}\">Edit</button>`];
  if (task.status !== "done") {
    actions.unshift(`<button type=\"button\" data-action=\"done\" data-id=\"${task.id}\">Mark done</button>`);
  }

  return `
    <li class="task-item">
      <div class="task-main">
        <div class="${titleClass}">${escapeHtml(task.title)} ${overdueBadge}</div>
        <div class="task-meta">${escapeHtml(taskMeta(task))}</div>
      </div>
      <div class="task-actions">${actions.join("")}</div>
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

function getAllTasksFilter() {
  const filter = allTasksFilter.value;
  if (!VALID_TASK_FILTERS.has(filter)) {
    return "open";
  }
  return filter;
}

function setAllTasksFilter(filter) {
  const nextFilter = VALID_TASK_FILTERS.has(filter) ? filter : "open";
  allTasksFilter.value = nextFilter;
  localStorage.setItem(TASK_FILTER_STORAGE_KEY, nextFilter);
}

function setEditingMode(task) {
  editingTaskId = task.id;
  taskFormTitle.textContent = `Edit Task #${task.id}`;
  submitTaskButton.textContent = "Save Changes";
  cancelEditButton.hidden = false;

  document.getElementById("title").value = task.title;
  document.getElementById("course").value = task.course || "";
  document.getElementById("deadline").value = task.deadline;
  document.getElementById("estimated_minutes").value = task.estimated_minutes ?? "";
}

function clearEditingMode() {
  editingTaskId = null;
  taskFormTitle.textContent = "Add Task";
  submitTaskButton.textContent = "Create Task";
  cancelEditButton.hidden = true;
  taskForm.reset();
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

function rememberTasks(tasks) {
  for (const task of tasks) {
    taskById.set(task.id, task);
  }
}

async function loadTodayPlan() {
  if (!activeUserId) {
    renderEmptyState(todayPlanEl, "Set User ID to view your tasks.");
    return;
  }

  const tasks = await fetchJson("/api/today-plan");
  rememberTasks(tasks);
  if (!tasks.length) {
    renderEmptyState(todayPlanEl, "No tasks for today. Add one above.");
    return;
  }
  todayPlanEl.innerHTML = tasks.map((task) => renderTaskItem(task, true)).join("");
}

async function loadAllTasks() {
  if (!activeUserId) {
    renderEmptyState(allTasksEl, "Set User ID to view your tasks.");
    return;
  }

  const filter = getAllTasksFilter();
  const tasks = await fetchJson(`/api/tasks?status=${encodeURIComponent(filter)}`);
  rememberTasks(tasks);
  if (!tasks.length) {
    const emptyText = filter === "open" ? "No open tasks." : "No tasks yet.";
    renderEmptyState(allTasksEl, emptyText);
    return;
  }
  allTasksEl.innerHTML = tasks.map((task) => renderTaskItem(task)).join("");
}

async function refreshAll() {
  taskById.clear();
  await Promise.all([loadTodayPlan(), loadAllTasks()]);
}

async function handleSubmitTask(event) {
  event.preventDefault();

  if (!activeUserId) {
    messageEl.textContent = "Set User ID before creating tasks.";
    return;
  }

  const formData = new FormData(taskForm);
  const estimatedRaw = (formData.get("estimated_minutes") || "").toString().trim();

  const payload = {
    title: (formData.get("title") || "").toString().trim(),
    course: (formData.get("course") || "").toString().trim(),
    deadline: formData.get("deadline"),
  };

  if (estimatedRaw) {
    payload.estimated_minutes = Number(estimatedRaw);
  }

  try {
    if (editingTaskId !== null) {
      await fetchJson(`/api/tasks/${editingTaskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...payload,
          estimated_minutes: estimatedRaw ? Number(estimatedRaw) : null,
        }),
      });
      messageEl.textContent = "Task updated.";
      clearEditingMode();
      await refreshAll();
      return;
    }

    await fetchJson("/api/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    messageEl.textContent = "Task created.";
    taskForm.reset();
    await refreshAll();
  } catch (error) {
    messageEl.textContent = `Failed to save task: ${error.message}`;
  }
}

async function handleMarkDone(taskId) {
  await fetchJson(`/api/tasks/${taskId}/done`, { method: "PATCH" });
  if (editingTaskId === taskId) {
    clearEditingMode();
  }
  messageEl.textContent = "Task marked as done.";
  await refreshAll();
}

function handleStartEdit(taskId) {
  const task = taskById.get(taskId);
  if (!task) {
    messageEl.textContent = "Task data is not available. Refresh and try again.";
    return;
  }
  setEditingMode(task);
  messageEl.textContent = `Editing task #${taskId}`;
}

async function handleTaskAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  if (!activeUserId) {
    messageEl.textContent = "Set User ID before updating tasks.";
    return;
  }

  const action = button.getAttribute("data-action");
  const taskId = Number(button.getAttribute("data-id"));

  try {
    if (action === "done") {
      await handleMarkDone(taskId);
      return;
    }

    if (action === "edit") {
      handleStartEdit(taskId);
      return;
    }
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
  clearEditingMode();
  messageEl.textContent = `Using task database for user: ${userId}`;
  await refreshAll();
}

function attachEvents() {
  taskForm.addEventListener("submit", handleSubmitTask);
  cancelEditButton.addEventListener("click", () => {
    clearEditingMode();
    messageEl.textContent = "Edit cancelled.";
  });
  refreshPlanButton.addEventListener("click", loadTodayPlan);
  refreshTasksButton.addEventListener("click", loadAllTasks);
  allTasksFilter.addEventListener("change", () => {
    setAllTasksFilter(allTasksFilter.value);
    loadAllTasks().catch((error) => {
      messageEl.textContent = `Failed to load tasks: ${error.message}`;
    });
  });
  todayPlanEl.addEventListener("click", handleTaskAction);
  allTasksEl.addEventListener("click", handleTaskAction);
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

function restoreTasksFilterFromStorage() {
  const storedFilter = (localStorage.getItem(TASK_FILTER_STORAGE_KEY) || "").trim();
  setAllTasksFilter(storedFilter);
}

attachEvents();
restoreUserFromStorage();
restoreTasksFilterFromStorage();
refreshAll().catch((error) => {
  messageEl.textContent = `Failed to load data: ${error.message}`;
});
