/**
 * renderer.js — DOM 渲染模組
 *
 * 職責：根據 store.js 的狀態，將資料轉化為 DOM 元素。
 * 本模組不直接修改狀態，所有資料皆來自 store.js，所有工具函式皆來自 utils.js，
 * DOM 元素參照皆來自 dom.js。
 *
 * 監聽 window 的 "stateChanged" 事件，一旦觸發即執行完整渲染。
 *
 * @module renderer
 */

import { formatDate, isOverdue } from "./utils.js";
import {
  getFilteredGoals,
  getStats,
  getCategories,
  getCurrentFilter,
  getFilterCategory,
  getSortBy,
} from "./store.js";
import {
  goalContainer,
  totalCountEl,
  completedCountEl,
  onTrackCountEl,
  overdueCountEl,
  filterCategoryEl,
  filterStatusEl,
  sortByEl,
  goalCategorySelect,
} from "./dom.js";

// ── Event Listener ───────────────────────────

/**
 * 監聽 stateChanged 事件，觸發完整重新渲染
 *
 * @listens window#stateChanged
 */
window.addEventListener("stateChanged", () => {
  renderAll();
});

// ── Public: Full Render ──────────────────────

/**
 * 執行完整渲染：儀表板 + 分類選項 + 目標列表
 *
 * @returns {void}
 */
export function renderAll() {
  renderDashboard(getStats());
  renderCategoryOptions();
  renderGoalList();
}

// ── Dashboard ────────────────────────────────

/**
 * 渲染儀表板統計數字
 *
 * 接收統計物件，將數值寫入對應的 DOM 元素。
 *
 * @param {{ total: number, completed: number, onTrack: number, overdue: number }} stats - 由 store.getStats() 提供的統計資料
 * @returns {void}
 */
function renderDashboard(stats) {
  totalCountEl.textContent     = stats.total;
  completedCountEl.textContent = stats.completed;
  onTrackCountEl.textContent   = stats.onTrack;
  overdueCountEl.textContent   = stats.overdue;
}

// ── Category Options ─────────────────────────

/**
 * 渲染分類篩選下拉選單與表單內的分類下拉選單
 * 同時恢復目前的篩選 / 排序選擇狀態
 *
 * @returns {void}
 */
function renderCategoryOptions() {
  const categories = getCategories();

  // 篩選列：分類下拉
  filterCategoryEl.innerHTML = '<option value="all">全部分類</option>';
  categories.forEach((cat) => {
    filterCategoryEl.appendChild(createOption(cat, cat));
  });

  // 表單內：分類下拉
  goalCategorySelect.innerHTML = "";
  categories.forEach((cat) => {
    goalCategorySelect.appendChild(createOption(cat, cat));
  });

  // 恢復目前篩選狀態
  filterCategoryEl.value = getFilterCategory();
  filterStatusEl.value   = getCurrentFilter();
  sortByEl.value       = getSortBy();
}

// ── Goal List ────────────────────────────────

/**
 * 從 store 取得篩選後的目標陣列，渲染為 goal-card DOM
 *
 * 每次呼叫會清空 #goalContainer 並重新建立所有卡片。
 * 資料來源：store.getFilteredGoals()
 * 工具函式：utils.formatDate(), utils.isOverdue()
 *
 * @returns {void}
 */
function renderGoalList() {
  const goals = getFilteredGoals();
  goalContainer.innerHTML = "";

  if (goals.length === 0) {
    goalContainer.innerHTML =
      '<div class="goal-list__empty">沒有符合條件的目標</div>';
    return;
  }

  goals.forEach((goal) => {
    goalContainer.appendChild(createGoalCard(goal));
  });
}

// ── Goal Card Builder ────────────────────────

/**
 * 建立單一 goal-card DOM 元素
 *
 * 包含 BEM Block：goal-card, progress-bar, subtask, category-tag
 *
 * @param {import("./store.js").Goal} goal - Goal 物件
 * @returns {HTMLDivElement} goal-card DOM 節點
 */
function createGoalCard(goal) {
  const overdue = goal.status === "active" && isOverdue(goal.deadline);

  // ── Card container ──
  const card = document.createElement("div");
  card.className = "goal-card" + (goal.status === "completed" ? " goal-card--completed" : "");
  card.dataset.id = goal.id;

  // ── Header: title + actions ──
  const header = document.createElement("div");
  header.className = "goal-card__header";

  const title = document.createElement("h3");
  title.className = "goal-card__title";
  title.textContent = goal.title;

  const actions = document.createElement("div");
  actions.className = "goal-card__actions";

  actions.appendChild(
    createActionButton(
      goal.status === "completed" ? "\u21A9" : "\u2713",
      goal.status === "completed" ? "恢復" : "完成",
      "toggle",
      goal.id
    )
  );
  actions.appendChild(createActionButton("\u270E", "編輯", "edit", goal.id));
  actions.appendChild(
    createActionButton("\u2715", "刪除", "delete", goal.id, "goal-card__action--delete")
  );

  header.append(title, actions);

  // ── Meta: category-tag + deadline ──
  const meta = document.createElement("div");
  meta.className = "goal-card__meta" + (overdue ? " goal-card__meta--overdue" : "");

  const tag = document.createElement("span");
  tag.className = "category-tag";
  tag.textContent = goal.category;
  meta.appendChild(tag);

  if (goal.deadline) {
    const deadlineSpan = document.createElement("span");
    deadlineSpan.textContent =
      (overdue ? "\u26A0 逾期 " : "\u2192 ") + formatDate(goal.deadline);
    meta.appendChild(deadlineSpan);
  }

  // ── Progress bar（透過 CSS custom property 驅動動畫）──
  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar";
  progressBar.style.setProperty("--progress", goal.progress + "%");

  const track = document.createElement("div");
  track.className = "progress-bar__track";

  const fill = document.createElement("div");
  fill.className = "progress-bar__fill";

  const progressText = document.createElement("div");
  progressText.className = "progress-bar__text";
  const doneCount = goal.subtasks.filter((s) => s.completed).length;
  progressText.textContent =
    goal.progress + "% 完成" +
    (goal.subtasks.length > 0 ? `（${doneCount}/${goal.subtasks.length}）` : "");

  track.appendChild(fill);
  progressBar.append(track, progressText);

  // ── Subtask list ──
  const subtaskList = document.createElement("div");
  goal.subtasks.forEach((sub) => {
    const row = document.createElement("div");
    row.className = "subtask" + (sub.completed ? " subtask--completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "subtask__checkbox";
    checkbox.checked = sub.completed;
    checkbox.dataset.action = "subtask";
    checkbox.dataset.goalId = goal.id;
    checkbox.dataset.subtaskId = sub.id;

    const text = document.createElement("span");
    text.className = "subtask__text";
    text.textContent = sub.text;

    row.append(checkbox, text);
    subtaskList.appendChild(row);
  });

  // ── Assemble card ──
  card.append(header, meta, progressBar, subtaskList);
  return card;
}

// ── Helper ───────────────────────────────────

/**
 * 建立操作按鈕（完成 / 編輯 / 刪除）
 *
 * @param {string} icon      - 按鈕文字（Unicode 字元）
 * @param {string} titleText - tooltip 文字
 * @param {string} action    - data-action 值（"toggle" | "edit" | "delete"）
 * @param {string} id        - data-id 值（goal ID）
 * @param {string} [extraClass=""] - 額外 CSS class
 * @returns {HTMLButtonElement}
 */
function createActionButton(icon, titleText, action, id, extraClass = "") {
  const btn = document.createElement("button");
  btn.className = "goal-card__action" + (extraClass ? " " + extraClass : "");
  btn.type = "button";
  btn.textContent = icon;
  btn.title = titleText;
  btn.dataset.action = action;
  btn.dataset.id = id;
  return btn;
}

/**
 * 建立 <option> 元素
 *
 * @param {string} value - option value
 * @param {string} text  - 顯示文字
 * @returns {HTMLOptionElement}
 */
function createOption(value, text) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = text;
  return opt;
}
