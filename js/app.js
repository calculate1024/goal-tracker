/**
 * app.js — 應用程式進入點
 *
 * 職責：
 * 1. 匯入並初始化所有模組
 * 2. 綁定 UI 事件（Modal、表單、篩選、排序、匯出、卡片操作）
 * 3. 執行第一次渲染
 *
 * 資料流：使用者操作 → app.js 接收事件 → store.js 更新狀態 → renderer.js 重新渲染
 *
 * @module app
 */

import { todayISO } from "./utils.js";
import {
  addGoal,
  updateGoal,
  deleteGoal,
  toggleGoalStatus,
  toggleSubtask,
  setFilter,
  setFilterCategory,
  setSortBy,
  getGoals,
  getExportData,
} from "./store.js";
import { renderAll } from "./renderer.js";
import { saveConfig, getConfig, testGoogleConnection } from "./settings.js";
import {
  goalModal,
  modalOverlay,
  modalClose,
  modalTitle,
  goalForm,
  goalIdInput,
  goalTitleInput,
  goalCategorySelect,
  goalDeadlineInput,
  subtaskContainer,
  addSubtaskBtn,
  openFormBtn,
  exportBtn,
  filterCategoryEl,
  filterStatusEl,
  sortByEl,
  goalContainer,
  openSettingsBtn,
  settingsModal,
  settingsOverlay,
  settingsClose,
  settingsForm,
  googleClientIdInput,
  aiApiKeyInput,
  testConnectionBtn,
  testResultEl,
} from "./dom.js";

// ── Modal ────────────────────────────────────

/**
 * 開啟 Modal（新增 or 編輯模式）
 *
 * @param {string} [goalId] - 若提供則為編輯模式，否則為新增模式
 * @returns {void}
 */
function openModal(goalId) {
  if (goalId) {
    // 編輯模式
    const goal = getGoals().find((g) => g.id === goalId);
    if (!goal) return;

    modalTitle.textContent = "編輯目標";
    goalIdInput.value = goal.id;
    goalTitleInput.value = goal.title;
    goalDeadlineInput.value = goal.deadline || "";

    // 等分類選項渲染完成後再設定值
    requestAnimationFrame(() => {
      goalCategorySelect.value = goal.category;
    });

    // 填入既有子任務
    subtaskContainer.innerHTML = "";
    goal.subtasks.forEach((s) => addSubtaskRow(s.text));
  } else {
    // 新增模式
    modalTitle.textContent = "新增目標";
    goalForm.reset();
    goalIdInput.value = "";
    subtaskContainer.innerHTML = "";
  }

  goalModal.classList.add("modal--open");
  goalTitleInput.focus();
}

/**
 * 關閉 Modal
 *
 * @returns {void}
 */
function closeModal() {
  goalModal.classList.remove("modal--open");
}

// ── Subtask Rows in Form ─────────────────────

/**
 * 在表單中新增一列子任務輸入框
 *
 * @param {string} [value=""] - 預設文字（編輯模式用）
 * @returns {void}
 */
function addSubtaskRow(value = "") {
  const row = document.createElement("div");
  row.className = "goal-form__subtask-row";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "子任務內容";
  input.value = value;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "goal-form__subtask-remove";
  removeBtn.textContent = "\u00d7";
  removeBtn.addEventListener("click", () => row.remove());

  row.append(input, removeBtn);
  subtaskContainer.appendChild(row);

  if (!value) input.focus();
}

// ── Form Submit ──────────────────────────────

/**
 * 處理表單送出（新增 or 更新目標）
 *
 * @param {SubmitEvent} e
 * @returns {void}
 */
function handleFormSubmit(e) {
  e.preventDefault();

  const title = goalTitleInput.value.trim();
  if (!title) return;

  const category = goalCategorySelect.value;
  const deadline = goalDeadlineInput.value;
  const subtaskInputs = subtaskContainer.querySelectorAll("input");
  const subtasks = Array.from(subtaskInputs)
    .map((input) => input.value.trim())
    .filter((text) => text.length > 0);

  const editId = goalIdInput.value;

  if (editId) {
    updateGoal(editId, { title, category, deadline, subtasks });
  } else {
    addGoal({ title, category, deadline, subtasks });
  }

  closeModal();
}

// ── Goal List Event Delegation ───────────────

/**
 * 處理目標卡片區域的事件委派（click + change）
 *
 * @param {Event} e
 * @returns {void}
 */
function handleGoalListEvent(e) {
  const target = /** @type {HTMLElement} */ (e.target);

  // 子任務 checkbox
  if (target.dataset.action === "subtask") {
    toggleSubtask(target.dataset.goalId, target.dataset.subtaskId);
    return;
  }

  // 目標操作按鈕
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;

  switch (action) {
    case "toggle":
      toggleGoalStatus(id);
      break;
    case "edit":
      openModal(id);
      break;
    case "delete":
      if (confirm("確定要刪除這個目標嗎？")) {
        deleteGoal(id);
      }
      break;
  }
}

// ── Export ────────────────────────────────────

/**
 * 處理 JSON 匯出下載（DOM 操作在 app.js，資料來自 store.js）
 *
 * @returns {void}
 */
function handleExport() {
  const jsonStr = getExportData();
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `goal-tracker-backup-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Settings Modal ───────────────────────────

/**
 * 開啟設定 Modal，並載入已儲存的設定值
 *
 * @returns {void}
 */
function openSettings() {
  googleClientIdInput.value = getConfig("googleClientId");
  aiApiKeyInput.value = getConfig("aiApiKey");
  testResultEl.textContent = "";
  testResultEl.className = "settings__test-result";
  settingsModal.classList.add("modal--open");
}

/**
 * 關閉設定 Modal
 *
 * @returns {void}
 */
function closeSettings() {
  settingsModal.classList.remove("modal--open");
}

/**
 * 處理設定表單儲存
 *
 * @param {SubmitEvent} e
 * @returns {void}
 */
function handleSettingsSave(e) {
  e.preventDefault();
  saveConfig("googleClientId", googleClientIdInput.value.trim());
  saveConfig("aiApiKey", aiApiKeyInput.value.trim());
  closeSettings();
}

/**
 * 處理連線測試按鈕點擊
 *
 * @returns {void}
 */
async function handleTestConnection() {
  const clientId = googleClientIdInput.value.trim();
  testResultEl.textContent = "測試中…";
  testResultEl.className = "settings__test-result";

  const result = await testGoogleConnection(clientId);

  testResultEl.textContent = result.message;
  testResultEl.className = "settings__test-result" +
    (result.ok ? " settings__test-result--success" : " settings__test-result--fail");
}

// ── Event Bindings ───────────────────────────

// Goal Modal
openFormBtn.addEventListener("click", () => openModal());
modalOverlay.addEventListener("click", closeModal);
modalClose.addEventListener("click", closeModal);

// Settings Modal
openSettingsBtn.addEventListener("click", openSettings);
settingsOverlay.addEventListener("click", closeSettings);
settingsClose.addEventListener("click", closeSettings);
settingsForm.addEventListener("submit", handleSettingsSave);
testConnectionBtn.addEventListener("click", handleTestConnection);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeSettings();
  }
});

// Form
goalForm.addEventListener("submit", handleFormSubmit);
addSubtaskBtn.addEventListener("click", () => addSubtaskRow());

// Filter & Sort
filterCategoryEl.addEventListener("change", (e) => setFilterCategory(e.target.value));
filterStatusEl.addEventListener("change", (e) => setFilter(e.target.value));
sortByEl.addEventListener("change", (e) => setSortBy(e.target.value));

// Goal list delegation
goalContainer.addEventListener("click", handleGoalListEvent);
goalContainer.addEventListener("change", handleGoalListEvent);

// Export
exportBtn.addEventListener("click", handleExport);

// ── Init ─────────────────────────────────────

// 第一次渲染
renderAll();

