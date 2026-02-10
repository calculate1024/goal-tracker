/**
 * dom.js — DOM 元素快取模組
 *
 * 將所有 document.getElementById 集中於此，
 * 避免多個模組重複查詢同一元素。
 *
 * 其他模組透過 import 取得所需的 DOM 參照。
 *
 * @module dom
 */

// ── Dashboard ────────────────────────────────

/** @type {HTMLElement} 全部目標數字 */
export const totalCountEl = document.getElementById("totalCount");

/** @type {HTMLElement} 已完成數字 */
export const completedCountEl = document.getElementById("completedCount");

/** @type {HTMLElement} 進行中數字 */
export const onTrackCountEl = document.getElementById("onTrackCount");

/** @type {HTMLElement} 已逾期數字 */
export const overdueCountEl = document.getElementById("overdueCount");

// ── Filter & Sort ────────────────────────────

/** @type {HTMLSelectElement} 分類篩選下拉 */
export const filterCategoryEl = document.getElementById("filterCategory");

/** @type {HTMLSelectElement} 狀態篩選下拉 */
export const filterStatusEl = document.getElementById("filterStatus");

/** @type {HTMLSelectElement} 排序方式下拉 */
export const sortByEl = document.getElementById("sortBy");

// ── Goal List ────────────────────────────────

/** @type {HTMLElement} 目標卡片掛載容器 */
export const goalContainer = document.getElementById("goalContainer");

// ── Modal ────────────────────────────────────

/** @type {HTMLElement} Modal 根元素 */
export const goalModal = document.getElementById("goalModal");

/** @type {HTMLElement} Modal 遮罩 */
export const modalOverlay = document.getElementById("modalOverlay");

/** @type {HTMLButtonElement} Modal 關閉按鈕 */
export const modalClose = document.getElementById("modalClose");

/** @type {HTMLHeadingElement} Modal 標題 */
export const modalTitle = document.getElementById("modalTitle");

// ── Goal Form ────────────────────────────────

/** @type {HTMLFormElement} 目標表單 */
export const goalForm = document.getElementById("goalForm");

/** @type {HTMLInputElement} 隱藏欄位：目標 ID（編輯模式用） */
export const goalIdInput = document.getElementById("goalId");

/** @type {HTMLInputElement} 目標名稱輸入框 */
export const goalTitleInput = document.getElementById("goalTitle");

/** @type {HTMLSelectElement} 分類選擇下拉 */
export const goalCategorySelect = document.getElementById("goalCategory");

/** @type {HTMLInputElement} 截止日期輸入框 */
export const goalDeadlineInput = document.getElementById("goalDeadline");

/** @type {HTMLElement} 子任務輸入列容器 */
export const subtaskContainer = document.getElementById("subtaskContainer");

/** @type {HTMLButtonElement} 新增子任務按鈕 */
export const addSubtaskBtn = document.getElementById("addSubtaskBtn");

// ── Email-to-Goal ───────────────────────────

/** @type {HTMLButtonElement} Gmail → AI 建議目標按鈕 */
export const emailToGoalBtn = document.getElementById("emailToGoalBtn");

/** @type {HTMLElement} Toast 通知容器 */
export const toastEl = document.getElementById("toast");

// ── Action Buttons ───────────────────────────

/** @type {HTMLButtonElement} 開啟新增目標 Modal 按鈕 */
export const openFormBtn = document.getElementById("openFormBtn");

/** @type {HTMLButtonElement} 匯出 JSON 按鈕 */
export const exportBtn = document.getElementById("exportBtn");

/** @type {HTMLButtonElement} 匯入備份按鈕 */
export const importBtn = document.getElementById("importBtn");

/** @type {HTMLInputElement} 匯入檔案隱藏 input */
export const importFileInput = document.getElementById("importFileInput");

// ── Settings Modal ───────────────────────────

/** @type {HTMLButtonElement} 開啟設定 Modal 按鈕 */
export const openSettingsBtn = document.getElementById("openSettingsBtn");

/** @type {HTMLElement} 設定 Modal 根元素 */
export const settingsModal = document.getElementById("settingsModal");

/** @type {HTMLElement} 設定 Modal 遮罩 */
export const settingsOverlay = document.getElementById("settingsOverlay");

/** @type {HTMLButtonElement} 設定 Modal 關閉按鈕 */
export const settingsClose = document.getElementById("settingsClose");

/** @type {HTMLFormElement} 設定表單 */
export const settingsForm = document.getElementById("settingsForm");

/** @type {HTMLInputElement} Google Client ID 輸入框 */
export const googleClientIdInput = document.getElementById("googleClientId");

/** @type {HTMLInputElement} AI API Key 輸入框 */
export const aiApiKeyInput = document.getElementById("aiApiKey");

/** @type {HTMLButtonElement} 連線測試按鈕 */
export const testConnectionBtn = document.getElementById("testConnectionBtn");

/** @type {HTMLElement} 連線測試結果文字 */
export const testResultEl = document.getElementById("testResult");

/** @type {HTMLButtonElement} 連結 Gmail 帳號按鈕 */
export const connectGmailBtn = document.getElementById("connectGmailBtn");

/** @type {HTMLButtonElement} 解除 Gmail 綁定按鈕 */
export const disconnectGmailBtn = document.getElementById("disconnectGmailBtn");

/** @type {HTMLElement} Gmail 授權狀態文字 */
export const gmailAuthStatusEl = document.getElementById("gmailAuthStatus");

/** @type {HTMLButtonElement} 儲存新金鑰按鈕 */
export const saveApiKeyBtn = document.getElementById("saveApiKeyBtn");

/** @type {HTMLButtonElement} 設定頁匯入按鈕 */
export const settingsImportBtn = document.getElementById("settingsImportBtn");

/** @type {HTMLInputElement} 設定頁匯入檔案 input */
export const settingsImportFile = document.getElementById("settingsImportFile");

/** @type {HTMLElement} 設定頁匯入結果文字 */
export const settingsImportResult = document.getElementById("settingsImportResult");

/** @type {HTMLElement} 金鑰操作結果文字 */
export const keyResultEl = document.getElementById("keyResult");
