/**
 * store.js — 狀態管理模組（Single Source of Truth）
 *
 * 所有狀態集中在 AppState，每次更動自動：
 * 1. 存入 localStorage（持久化）
 * 2. 發送 "stateChanged" 自定義事件（通知 renderer.js 重新渲染）
 *
 * 資料流方向：使用者操作 → store 更新狀態 → 發送事件 → renderer 重新渲染
 *
 * @module store
 */

import { generateId, todayISO, isOverdue } from "./utils.js";

// ── Constants ────────────────────────────────

/** @type {string} localStorage 的 key */
const STORAGE_KEY = "goal-tracker-data";

/** @type {string[]} 預設分類 */
const DEFAULT_CATEGORIES = ["核心專案", "日常營運", "專業成長", "外部協作", "個人管理"];

// ── Type Definitions (JSDoc) ─────────────────

/**
 * @typedef {Object} Subtask
 * @property {string}  id        - 子任務唯一 ID（前綴 "s_"）
 * @property {string}  text      - 子任務描述文字
 * @property {boolean} completed - 是否已完成
 */

/**
 * @typedef {Object} Goal
 * @property {string}     id        - 目標唯一 ID（前綴 "g_"）
 * @property {string}     title     - 目標名稱
 * @property {string}     category  - 分類標籤
 * @property {string|null} deadline - 截止日期（YYYY-MM-DD）或 null
 * @property {"active"|"completed"} status - 目標狀態
 * @property {string}     createdAt - 建立日期（YYYY-MM-DD）
 * @property {number}     progress  - 進度百分比（0 ~ 100），由 calculateProgress 自動計算
 * @property {Subtask[]}  subtasks  - 子任務陣列
 * @property {string|null} sourceEmailId - 來源 Gmail 信件 ID（僅作索引，用於去重）
 * @property {string|null} sourceLink    - Gmail 信件網頁連結
 */

/**
 * @typedef {Object} AppState
 * @property {Goal[]}    goals          - 所有目標
 * @property {string[]}  categories     - 可用分類列表
 * @property {string}    currentFilter  - 狀態篩選（"all" | "active" | "completed"）
 * @property {string}    filterCategory - 分類篩選（"all" | 分類名稱）
 * @property {string}    sortBy         - 排序方式（"deadline" | "createdAt" | "progress"）
 */

// ── State ────────────────────────────────────

/** @type {AppState} */
let state = loadState();

// ── Private: Persistence ─────────────────────

/**
 * 從 localStorage 載入狀態，若不存在或解析失敗則回傳預設值
 * @returns {AppState}
 */
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.goals)) {
      saved.goals.forEach(migrateGoal);
      return { ...getDefaultState(), ...saved, categories: [...DEFAULT_CATEGORIES] };
    }
    return getDefaultState();
  } catch {
    return getDefaultState();
  }
}

/**
 * 將舊版 Goal 物件遷移至最新結構（原地修改）
 *
 * @param {Goal} goal - 待遷移的 Goal 物件
 */
function migrateGoal(goal) {
  if (typeof goal.progress !== "number") {
    goal.progress = calcProgressValue(goal.subtasks);
  }
  if (goal.sourceEmailId === undefined) {
    goal.sourceEmailId = null;
  }
  if (goal.sourceLink === undefined) {
    goal.sourceLink = null;
  }
}

/**
 * @returns {AppState} 預設的空白狀態
 */
function getDefaultState() {
  return {
    goals: [],
    categories: [...DEFAULT_CATEGORIES],
    currentFilter: "all",
    filterCategory: "all",
    sortBy: "deadline",
  };
}

/**
 * 將目前狀態寫入 localStorage
 */
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Private: Event ───────────────────────────

/**
 * 發送 "stateChanged" 自定義事件，通知所有監聽者（renderer.js）重新渲染
 *
 * @fires window#stateChanged
 */
function notify() {
  window.dispatchEvent(new CustomEvent("stateChanged"));
}

/**
 * 統一的狀態提交：先持久化，再通知渲染
 */
function commit() {
  save();
  notify();
}

// ── Private: Progress Calculation ────────────

/**
 * 根據子任務完成比例計算進度百分比（純計算，不改變狀態）
 *
 * @param {Subtask[]} subtasks - 子任務陣列
 * @returns {number} 0 ~ 100 的整數百分比
 */
function calcProgressValue(subtasks) {
  if (!subtasks || subtasks.length === 0) return 0;
  const done = subtasks.filter((s) => s.completed).length;
  return Math.round((done / subtasks.length) * 100);
}

/**
 * 重新計算指定目標的 progress 欄位（Private）
 *
 * 當子任務狀態改變時呼叫，會：
 * 1. 根據「已完成子任務 / 總子任務」更新 goal.progress
 * 2. 若全部完成，自動將目標狀態改為 "completed"
 * 3. 若從全部完成退回，自動恢復為 "active"
 *
 * @param {string} goalId - 目標 ID
 */
function calculateProgress(goalId) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return;

  goal.progress = calcProgressValue(goal.subtasks);

  // 自動完成 / 恢復
  const allDone = goal.subtasks.length > 0 && goal.progress === 100;
  if (allDone) {
    goal.status = "completed";
  } else if (goal.status === "completed" && goal.progress < 100) {
    goal.status = "active";
  }
}

// ── Public: Getters ──────────────────────────

/**
 * 取得完整狀態的唯讀副本
 * @returns {AppState}
 */
export function getState() {
  return { ...state };
}

/**
 * 取得所有目標
 * @returns {Goal[]}
 */
export function getGoals() {
  return state.goals;
}

/**
 * 取得可用分類列表
 * @returns {string[]}
 */
export function getCategories() {
  return state.categories;
}

/**
 * 取得目前的狀態篩選值
 * @returns {string} "all" | "active" | "completed"
 */
export function getCurrentFilter() {
  return state.currentFilter;
}

/**
 * 取得目前的分類篩選值
 * @returns {string} "all" | 分類名稱
 */
export function getFilterCategory() {
  return state.filterCategory;
}

/**
 * 取得目前的排序方式
 * @returns {string} "deadline" | "createdAt" | "progress"
 */
export function getSortBy() {
  return state.sortBy;
}

/**
 * 取得經過篩選與排序後的目標陣列
 *
 * 參數皆為可選，未提供時自動使用目前 AppState 中的對應值。
 *
 * @param {string} [filter=state.currentFilter]   - 狀態篩選（"all" | "active" | "completed"）
 * @param {string} [sortBy=state.sortBy]           - 排序方式（"deadline" | "createdAt" | "progress"）
 * @returns {Goal[]} 篩選並排序後的 Goal 陣列（淺拷貝）
 */
export function getFilteredGoals(filter = state.currentFilter, sortBy = state.sortBy) {
  let goals = [...state.goals];

  // 分類篩選（始終從 state 讀取）
  if (state.filterCategory !== "all") {
    goals = goals.filter((g) => g.category === state.filterCategory);
  }

  // 狀態篩選
  if (filter === "active") {
    goals = goals.filter((g) => g.status === "active");
  } else if (filter === "completed") {
    goals = goals.filter((g) => g.status === "completed");
  }

  // 排序
  switch (sortBy) {
    case "deadline":
      goals.sort((a, b) => (a.deadline || "9999") > (b.deadline || "9999") ? 1 : -1);
      break;
    case "createdAt":
      goals.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      break;
    case "progress":
      goals.sort((a, b) => b.progress - a.progress);
      break;
  }

  return goals;
}

/**
 * 取得儀表板統計數據
 *
 * - total:     所有目標總數
 * - completed: 已完成目標數
 * - onTrack:   進行中且未逾期的目標數
 * - overdue:   進行中且已逾期的目標數
 *
 * @returns {{ total: number, completed: number, onTrack: number, overdue: number }}
 */
export function getStats() {
  const goals = state.goals;
  const active = goals.filter((g) => g.status === "active");
  const overdueCount = active.filter((g) => isOverdue(g.deadline)).length;

  return {
    total: goals.length,
    completed: goals.filter((g) => g.status === "completed").length,
    onTrack: active.length - overdueCount,
    overdue: overdueCount,
  };
}

/**
 * 取得所有已處理過的 Email ID 集合（用於去重）
 *
 * @returns {Set<string>} 已處理的 Gmail message ID 集合
 */
export function getProcessedEmailIds() {
  const ids = new Set();
  for (const goal of state.goals) {
    if (goal.sourceEmailId) {
      ids.add(goal.sourceEmailId);
    }
  }
  return ids;
}

// ── Public: Goal CRUD ────────────────────────

/**
 * 新增目標
 *
 * 自動產生唯一 ID、建立 subtasks 陣列、初始化 progress 為 0。
 *
 * @param {Object} goalData - 目標資料
 * @param {string}        goalData.title    - 目標名稱（必填）
 * @param {string}        goalData.category - 分類標籤（必填）
 * @param {string|null}   [goalData.deadline=null] - 截止日期（YYYY-MM-DD）
 * @param {string[]}      [goalData.subtasks=[]]   - 子任務文字陣列
 * @param {string|null}   [goalData.sourceEmailId=null] - 來源 Gmail 信件 ID
 * @param {string|null}   [goalData.sourceLink=null]    - Gmail 信件網頁連結
 * @returns {Goal} 新建立的 Goal 物件
 *
 * @example
 * addGoal({
 *   title: "學會 JavaScript",
 *   category: "學習",
 *   deadline: "2026-03-31",
 *   subtasks: ["完成 DOM 練習", "完成 Event 練習"]
 * });
 */
export function addGoal({ title, category, deadline = null, subtasks = [], sourceEmailId = null, sourceLink = null }) {
  /** @type {Goal} */
  const goal = {
    id: generateId("g"),
    title,
    category,
    deadline,
    status: "active",
    createdAt: todayISO(),
    progress: 0,
    subtasks: subtasks.map((text) => ({
      id: generateId("s"),
      text,
      completed: false,
    })),
    sourceEmailId,
    sourceLink,
  };

  state.goals.push(goal);
  commit();
  return goal;
}

/**
 * 更新目標的指定欄位
 *
 * @param {string} id      - 目標 ID
 * @param {Object} updates - 要更新的欄位
 * @param {string}      [updates.title]    - 新標題
 * @param {string}      [updates.category] - 新分類
 * @param {string|null} [updates.deadline] - 新截止日
 * @param {string[]}    [updates.subtasks] - 新子任務文字陣列（全量替換）
 * @returns {Goal|null} 更新後的 Goal，找不到時回傳 null
 */
export function updateGoal(id, updates) {
  const goal = state.goals.find((g) => g.id === id);
  if (!goal) return null;

  if (updates.title !== undefined) goal.title = updates.title;
  if (updates.category !== undefined) goal.category = updates.category;
  if (updates.deadline !== undefined) goal.deadline = updates.deadline || null;
  if (updates.subtasks !== undefined) {
    goal.subtasks = updates.subtasks.map((s) =>
      typeof s === "string"
        ? { id: generateId("s"), text: s, completed: false }
        : s
    );
    calculateProgress(id);
  }

  commit();
  return goal;
}

/**
 * 刪除目標
 *
 * @param {string} id - 要刪除的目標 ID
 * @returns {void}
 */
export function deleteGoal(id) {
  state.goals = state.goals.filter((g) => g.id !== id);
  commit();
}

/**
 * 切換目標狀態（active ↔ completed）
 *
 * @param {string} id - 目標 ID
 * @returns {void}
 */
export function toggleGoalStatus(id) {
  const goal = state.goals.find((g) => g.id === id);
  if (!goal) return;
  goal.status = goal.status === "completed" ? "active" : "completed";
  commit();
}

// ── Public: Subtask ──────────────────────────

/**
 * 切換子任務的完成狀態
 *
 * 切換後自動呼叫 calculateProgress 重新計算進度，
 * 並根據結果自動更新目標的 status。
 *
 * @param {string} goalId    - 目標 ID
 * @param {string} subtaskId - 子任務 ID
 * @returns {void}
 */
export function toggleSubtask(goalId, subtaskId) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return;

  const subtask = goal.subtasks.find((s) => s.id === subtaskId);
  if (!subtask) return;

  subtask.completed = !subtask.completed;
  calculateProgress(goalId);
  commit();
}

// ── Public: Filter & Sort ────────────────────

/**
 * 設定狀態篩選條件
 *
 * @param {string} value - "all" | "active" | "completed"
 * @returns {void}
 */
export function setFilter(value) {
  state.currentFilter = value;
  commit();
}

/**
 * 設定分類篩選條件
 *
 * @param {string} value - "all" 或分類名稱
 * @returns {void}
 */
export function setFilterCategory(value) {
  state.filterCategory = value;
  commit();
}

/**
 * 設定排序方式
 *
 * @param {string} value - "deadline" | "createdAt" | "progress"
 * @returns {void}
 */
export function setSortBy(value) {
  state.sortBy = value;
  commit();
}

// ── Public: Category ─────────────────────────

/**
 * 新增自訂分類（若已存在則忽略）
 *
 * @param {string} name - 分類名稱
 * @returns {void}
 */
export function addCategory(name) {
  if (!state.categories.includes(name)) {
    state.categories.push(name);
    commit();
  }
}

// ── Public: Export ────────────────────────────

/**
 * 取得目前狀態的 JSON 字串，供 UI 層觸發下載使用
 *
 * store 只負責提供資料，不操作 DOM。
 * 實際的檔案下載邏輯應由 app.js 處理。
 *
 * @returns {string} 格式化的 JSON 字串（2-space indent）
 */
export function getExportData() {
  return JSON.stringify(state, null, 2);
}

// ── Private: Import Validation ──────────────

/**
 * 驗證匯入資料的格式是否正確
 *
 * @param {*} data - 解析後的 JSON 資料
 * @returns {{ valid: boolean, error?: string }}
 */
function validateImportData(data) {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "匯入資料格式錯誤：非有效的 JSON 物件" };
  }
  if (!Array.isArray(data.goals)) {
    return { valid: false, error: "匯入資料格式錯誤：缺少 goals 陣列" };
  }
  for (const goal of data.goals) {
    if (!goal.id || !goal.title) {
      return { valid: false, error: "匯入資料格式錯誤：目標缺少 id 或 title" };
    }
  }
  return { valid: true };
}

// ── Public: Import ──────────────────────────

/**
 * 匯入備份資料並還原狀態
 *
 * @param {string} jsonString - JSON 字串
 * @param {"overwrite"|"merge"} mode - 覆蓋或合併
 * @returns {{ ok: boolean, message: string, count: number }}
 */
export function importState(jsonString, mode) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { ok: false, message: "JSON 解析失敗，請確認檔案格式", count: 0 };
  }

  const validation = validateImportData(parsed);
  if (!validation.valid) {
    return { ok: false, message: validation.error, count: 0 };
  }

  // 遷移匯入的 goals 至最新結構
  parsed.goals.forEach(migrateGoal);

  if (mode === "overwrite") {
    state = { ...getDefaultState(), ...parsed };
    commit();
    return { ok: true, message: `已覆蓋還原 ${state.goals.length} 個目標`, count: state.goals.length };
  }

  // merge：只加入 id 不重複的 goal
  const existingIds = new Set(state.goals.map((g) => g.id));
  const newGoals = parsed.goals.filter((g) => !existingIds.has(g.id));
  state.goals.push(...newGoals);
  commit();
  return { ok: true, message: `已合併匯入 ${newGoals.length} 個新目標`, count: newGoals.length };
}
