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

// ── Action Buttons ───────────────────────────

/** @type {HTMLButtonElement} 開啟新增目標 Modal 按鈕 */
export const openFormBtn = document.getElementById("openFormBtn");

/** @type {HTMLButtonElement} 匯出 JSON 按鈕 */
export const exportBtn = document.getElementById("exportBtn");
