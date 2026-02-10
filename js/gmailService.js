/**
 * gmailService.js — 信件內容解析模組
 *
 * 職責：接收信件內文，透過 AI 解析（目前為 Mock）萃取目標與子任務，
 * 再呼叫 store.addGoal() 將結果加入系統。
 *
 * 資料流方向：
 *   信件內文 → gmailService.parseEmailToGoal()
 *              → store.addGoal() → stateChanged 事件 → renderer.js 重新渲染
 *
 * 本模組不直接操作 DOM，僅負責「資料解析 → 寫入 store」。
 *
 * @module gmailService
 */

import { addGoal } from "./store.js";

// ── Mock AI Parsing ─────────────────────────

/**
 * （Mock）模擬 AI 解析信件內文，萃取目標標題與子任務
 *
 * 目前為關鍵字比對的 Mock 實作，未來可替換為真實 AI API 呼叫。
 *
 * @param {string} emailContent - 信件內文
 * @returns {{ title: string, subtasks: string[] }} 解析結果
 */
function mockAIParse(emailContent) {
  const content = emailContent.trim();

  // 策略：取第一行（或第一句）作為標題
  const lines = content.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const title = lines[0] || "來自信件的目標";

  // 策略：後續各行視為子任務；若只有一行則嘗試以句號/頓號拆分
  let subtasks = [];

  if (lines.length > 1) {
    subtasks = lines.slice(1).filter((l) => !isMetaLine(l));
  } else {
    const parts = content.split(/[。、；;]/).map((s) => s.trim()).filter((s) => s.length > 0);
    if (parts.length > 1) {
      subtasks = parts.slice(1);
    }
  }

  return { title, subtasks };
}

/**
 * 判斷是否為信件的附屬資訊行（寄件者、日期等），不應作為子任務
 *
 * @param {string} line - 單行文字
 * @returns {boolean} 若為附屬資訊行則回傳 true
 */
function isMetaLine(line) {
  return /^(from|to|date|subject|寄件者|收件者|日期|主旨)[:：]/i.test(line);
}

// ── Public API ──────────────────────────────

/**
 * 解析信件內文並將結果新增為目標
 *
 * 流程：
 * 1. 透過 AI（Mock）將 emailContent 解析為 { title, subtasks }
 * 2. 呼叫 store.addGoal() 寫入狀態
 * 3. store 內部自動觸發 stateChanged → renderer.js 重新渲染
 *
 * @param {string} emailContent - 信件內文
 * @param {string} [category="生活"] - 分類標籤（預設「生活」）
 * @returns {import("./store.js").Goal} 新建立的 Goal 物件
 *
 * @example
 * parseEmailToGoal(`
 *   實踐「時間盒」工作法
 *   列出今日三件最重要的事
 *   為每件事設定 25 分鐘時間盒
 *   完成後休息 5 分鐘再繼續
 * `);
 * // → addGoal({ title: "實踐「時間盒」工作法", category: "生活", subtasks: [...] })
 */
export function parseEmailToGoal(emailContent, category = "生活") {
  const { title, subtasks } = mockAIParse(emailContent);

  return addGoal({ title, category, subtasks });
}
