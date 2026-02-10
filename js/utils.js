/**
 * utils.js — 工具函式模組
 *
 * 提供 ID 生成、日期格式化等純函式，不依賴任何外部狀態。
 * @module utils
 */

// ── ID Generation ────────────────────────────

/**
 * 產生唯一 ID
 *
 * 格式：`{prefix}_{timestamp36}{random4}`
 * 例如：`g_m1abc2de` (goal) 或 `s_m1abc3fg` (subtask)
 *
 * @param {string} prefix - ID 前綴（"g" = goal, "s" = subtask）
 * @returns {string} 唯一識別碼
 */
export function generateId(prefix) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${timestamp}${random}`;
}

// ── Date Utilities ───────────────────────────

/**
 * 取得今天的日期字串（ISO 格式）
 *
 * @returns {string} YYYY-MM-DD 格式的今日日期
 */
export function todayISO() {
  return new Date().toISOString().split("T")[0];
}

/**
 * 將 ISO 日期字串格式化為易讀的短日期
 *
 * @param {string | null} dateStr - ISO 日期字串（YYYY-MM-DD），null 回傳空字串
 * @returns {string} 格式化後的日期（例："2/14"），或空字串
 *
 * @example
 * formatDate("2026-02-14"); // "2/14"
 * formatDate(null);         // ""
 */
export function formatDate(dateStr) {
  if (!dateStr) return "";
  const [, month, day] = dateStr.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

/**
 * 取得昨天的日期字串（ISO 格式）
 *
 * @returns {string} YYYY-MM-DD 格式的昨日日期
 */
export function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

/**
 * 判斷指定截止日是否已逾期（早於今天）
 *
 * @param {string | null} deadline - ISO 日期字串（YYYY-MM-DD）
 * @returns {boolean} 若已逾期回傳 true，無截止日回傳 false
 */
export function isOverdue(deadline) {
  if (!deadline) return false;
  return new Date(deadline) < new Date(todayISO());
}
