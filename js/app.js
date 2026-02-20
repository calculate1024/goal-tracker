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
  getCategories,
  addCategory,
  deleteCategory,
  reassignGoals,
  renameCategory,
  getExportData,
  importState,
} from "./store.js";
import { renderAll } from "./renderer.js";
import { saveConfig, getConfig, testGoogleConnection, authorizeGmail, isGmailAuthorized, revokeGoogleAccess } from "./settings.js";
import { runEmailToGoal } from "./workflow.js";
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
  importBtn,
  importFileInput,
  filterCategoryEl,
  filterStatusEl,
  sortByEl,
  goalContainer,
  emailToGoalBtn,
  toastEl,
  openSettingsBtn,
  settingsModal,
  settingsOverlay,
  settingsClose,
  settingsForm,
  googleClientIdInput,
  aiApiKeyInput,
  testConnectionBtn,
  testResultEl,
  connectGmailBtn,
  disconnectGmailBtn,
  gmailAuthStatusEl,
  saveApiKeyBtn,
  keyResultEl,
  settingsImportBtn,
  settingsImportFile,
  settingsImportResult,
  categoryListEl,
  newCategoryInput,
  addCategoryBtn,
  categoryResultEl,
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

// ── Export / Backup ──────────────────────────

/**
 * 下載目前狀態的 JSON 備份檔案
 *
 * @param {string} [filename="goals_backup.json"] - 下載檔名
 * @returns {void}
 */
function downloadBackup(filename = "goals_backup.json") {
  const jsonStr = getExportData();
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 處理手動 JSON 匯出下載
 *
 * @returns {void}
 */
function handleExport() {
  downloadBackup("goals_backup.json");
}

// ── Import ──────────────────────────────────

/**
 * 處理備份檔案匯入
 *
 * @param {Event} e - file input change 事件
 * @returns {void}
 */
function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const mode = confirm(
      "選擇匯入方式：\n\n按「確定」→ 覆蓋現有資料\n按「取消」→ 與現有資料合併"
    )
      ? "overwrite"
      : "merge";

    const result = importState(reader.result, mode);
    showToast(result.message, result.ok ? "success" : "fail");

    // 重置 file input，允許重複選同一檔案
    importFileInput.value = "";
  };
  reader.readAsText(file);
}

// ── Category Management ─────────────────────

/**
 * 在設定 Modal 中渲染分類列表（動態產生 DOM）
 *
 * @returns {void}
 */
function renderCategoryList() {
  const categories = getCategories();
  categoryListEl.innerHTML = "";

  categories.forEach((cat) => {
    const row = document.createElement("div");
    row.className = "settings__category-row";

    const nameSpan = document.createElement("span");
    nameSpan.className = "settings__category-name";
    nameSpan.textContent = cat;

    const actions = document.createElement("div");
    actions.className = "settings__category-actions";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "settings__category-rename-btn";
    renameBtn.textContent = "✎";
    renameBtn.title = "重新命名";
    renameBtn.addEventListener("click", () => handleRenameCategory(cat));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "settings__category-delete-btn";
    deleteBtn.textContent = "✕";
    deleteBtn.title = "刪除";
    deleteBtn.disabled = categories.length <= 1;
    deleteBtn.addEventListener("click", () => handleDeleteCategory(cat));

    actions.append(renameBtn, deleteBtn);
    row.append(nameSpan, actions);
    categoryListEl.appendChild(row);
  });

  categoryResultEl.textContent = "";
}

/**
 * 處理新增分類
 *
 * @returns {void}
 */
function handleAddCategory() {
  const name = newCategoryInput.value.trim();
  if (!name) return;

  if (name.length > 20) {
    categoryResultEl.textContent = "分類名稱不可超過 20 字";
    return;
  }

  const categories = getCategories();
  if (categories.includes(name)) {
    categoryResultEl.textContent = "此分類已存在";
    return;
  }

  addCategory(name);
  newCategoryInput.value = "";
  categoryResultEl.textContent = "";
  renderCategoryList();
}

/**
 * 處理刪除分類（讓用戶選擇目標歸類）
 *
 * @param {string} name - 要刪除的分類名稱
 * @returns {void}
 */
function handleDeleteCategory(name) {
  const goals = getGoals();
  const orphanCount = goals.filter((g) => g.category === name).length;

  if (orphanCount > 0) {
    // 讓用戶從剩餘分類中選擇歸類
    const remaining = getCategories().filter((c) => c !== name);
    const options = remaining.map((c, i) => `${i + 1}. ${c}`).join("\n");
    const input = prompt(
      `分類「${name}」下有 ${orphanCount} 個目標。\n\n請選擇要將這些目標歸類至哪個分類（輸入編號）：\n${options}`
    );

    if (input === null) return; // 使用者取消

    const idx = parseInt(input, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= remaining.length) {
      categoryResultEl.textContent = "輸入無效，刪除已取消";
      return;
    }

    reassignGoals(name, remaining[idx]);
    deleteCategory(name);
    categoryResultEl.textContent = `已刪除「${name}」，${orphanCount} 個目標已移至「${remaining[idx]}」`;
  } else {
    if (!confirm(`確定要刪除分類「${name}」嗎？`)) return;
    deleteCategory(name);
    categoryResultEl.textContent = `已刪除「${name}」`;
  }

  renderCategoryList();
}

/**
 * 處理重新命名分類
 *
 * @param {string} oldName - 目前的分類名稱
 * @returns {void}
 */
function handleRenameCategory(oldName) {
  const newName = prompt(`將「${oldName}」重新命名為：`, oldName);
  if (newName === null) return;

  const result = renameCategory(oldName, newName);
  if (result.renamed) {
    categoryResultEl.textContent =
      result.updatedCount > 0
        ? `已重新命名，${result.updatedCount} 個目標已更新`
        : "已重新命名";
    renderCategoryList();
  } else {
    categoryResultEl.textContent = "重新命名失敗（名稱重複、無效或相同）";
  }
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
  updateGmailAuthUI();
  renderCategoryList();
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
 * 更新 Gmail 授權狀態 UI
 *
 * @returns {void}
 */
function updateGmailAuthUI() {
  if (isGmailAuthorized()) {
    gmailAuthStatusEl.textContent = "已連結";
    gmailAuthStatusEl.className = "settings__gmail-status settings__gmail-status--success";
    connectGmailBtn.hidden = true;
    disconnectGmailBtn.hidden = false;
  } else {
    gmailAuthStatusEl.textContent = "";
    gmailAuthStatusEl.className = "settings__gmail-status";
    connectGmailBtn.hidden = false;
    disconnectGmailBtn.hidden = true;
  }
}

/**
 * 處理連結 Gmail 帳號按鈕點擊
 *
 * @returns {void}
 */
async function handleConnectGmail() {
  const clientId = googleClientIdInput.value.trim();
  if (!clientId) {
    gmailAuthStatusEl.textContent = "請先填入 Google Client ID";
    gmailAuthStatusEl.className = "settings__gmail-status settings__gmail-status--fail";
    return;
  }

  gmailAuthStatusEl.textContent = "授權中…";
  gmailAuthStatusEl.className = "settings__gmail-status";

  const result = await authorizeGmail(clientId);

  if (result.ok) {
    updateGmailAuthUI();
  } else {
    gmailAuthStatusEl.textContent = result.message;
    gmailAuthStatusEl.className = "settings__gmail-status settings__gmail-status--fail";
  }
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

// ── Toast ────────────────────────────────────

/** @type {number|undefined} */
let toastTimer;

/**
 * 顯示 Toast 通知，3 秒後自動消失
 *
 * @param {string} message - 顯示訊息
 * @param {"success"|"fail"|"info"} [type="info"] - 樣式類型
 * @returns {void}
 */
function showToast(message, type = "info") {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.className = `toast toast--visible toast--${type}`;
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("toast--visible");
  }, 3000);
}

// ── Disconnect Gmail ─────────────────────────

/**
 * 處理解除 Gmail 綁定按鈕點擊
 *
 * @returns {Promise<void>}
 */
async function handleDisconnectGmail() {
  if (!confirm("確定要解除 Google 帳號連結嗎？解除後需要重新授權才能使用信件分析功能。")) {
    return;
  }

  const result = await revokeGoogleAccess();
  updateGmailAuthUI();
  showToast(result.message, result.ok ? "success" : "fail");
}

// ── Save API Key ─────────────────────────────

/**
 * 處理儲存新 AI API Key 按鈕點擊
 *
 * @returns {void}
 */
function handleSaveApiKey() {
  const newKey = aiApiKeyInput.value.trim();

  if (!newKey) {
    keyResultEl.textContent = "請輸入 API Key";
    keyResultEl.className = "settings__key-result settings__key-result--fail";
    return;
  }

  if (!confirm("更換 AI API Key 將影響後續的自動化分析，確定要更新嗎？")) {
    return;
  }

  saveConfig("aiApiKey", newKey);
  keyResultEl.textContent = "金鑰已更新";
  keyResultEl.className = "settings__key-result settings__key-result--success";

  setTimeout(() => {
    keyResultEl.textContent = "";
    keyResultEl.className = "settings__key-result";
  }, 2000);
}

// ── Settings: Import Backup ──────────────────

/**
 * 處理設定頁中的備份匯入（覆蓋 + 重新整理頁面）
 *
 * @param {Event} e - file input change 事件
 * @returns {void}
 */
function handleSettingsImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const result = importState(reader.result, "overwrite");

    if (result.ok) {
      settingsImportResult.textContent = result.message;
      settingsImportResult.className = "settings__import-result settings__import-result--success";
      setTimeout(() => location.reload(), 500);
    } else {
      settingsImportResult.textContent = result.message;
      settingsImportResult.className = "settings__import-result settings__import-result--fail";
    }

    settingsImportFile.value = "";
  };
  reader.readAsText(file);
}

// ── Email-to-Goal ────────────────────────────

/**
 * 處理「從 Gmail 獲取 AI 建議目標」按鈕點擊
 *
 * @returns {Promise<void>}
 */
async function handleEmailToGoal() {
  emailToGoalBtn.textContent = "AI 正在閱讀您的信件...";
  emailToGoalBtn.disabled = true;

  try {
    // 自動備份：在 AI 寫入新目標前保存還原點
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    downloadBackup(`goals_auto_backup_${timestamp}.json`);

    const result = await runEmailToGoal();
    showToast(result.message, result.ok ? "success" : "fail");
    renderAll();
  } catch (err) {
    showToast("發生未預期的錯誤：" + err.message, "fail");
  } finally {
    emailToGoalBtn.textContent = "✨ 從 Gmail 獲取 AI 建議目標";
    emailToGoalBtn.disabled = false;
  }
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
connectGmailBtn.addEventListener("click", handleConnectGmail);
disconnectGmailBtn.addEventListener("click", handleDisconnectGmail);
saveApiKeyBtn.addEventListener("click", handleSaveApiKey);
settingsImportBtn.addEventListener("click", () => settingsImportFile.click());
settingsImportFile.addEventListener("change", handleSettingsImport);

// Category Management
addCategoryBtn.addEventListener("click", handleAddCategory);
newCategoryInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleAddCategory();
  }
});

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

// Import
importBtn.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", handleImport);

// Email-to-Goal
emailToGoalBtn.addEventListener("click", handleEmailToGoal);

// ── Init ─────────────────────────────────────

// 第一次渲染
renderAll();

