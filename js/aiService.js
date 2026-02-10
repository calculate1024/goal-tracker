/**
 * aiService.js — AI 分析模組
 *
 * 職責：將 Email 內容透過 AI 分析，產出標準化的目標資料。
 * 目前為 Mock 實作，未來可替換為真實 AI API 呼叫（OpenAI / Gemini 等）。
 *
 * 本模組只負責「分析」，不負責讀取信件或寫入 store。
 * 信件讀取由 gmailService.js 負責，流程串接由 workflow.js 負責。
 *
 * @module aiService
 */

import { getConfig } from "./settings.js";

// ── Type Definitions ────────────────────────

/**
 * AI 分析後的標準目標格式
 *
 * @typedef {Object} ParsedGoal
 * @property {string}   title    - 目標名稱
 * @property {string[]} subtasks - 子任務文字陣列
 * @property {string|null} deadline - 截止日期（YYYY-MM-DD），無法推斷時為 null
 */

// ── Private: Prompt Formatting ──────────────

/**
 * 建立發送給 AI 的 Prompt
 *
 * 要求 AI 回傳嚴格的 JSON 格式，包含 title、subtasks、deadline。
 *
 * @param {string} emailBody - 信件內文
 * @returns {string} 格式化後的 Prompt
 */
function buildPrompt(emailBody) {
  return [
    "你是一位個人目標管理助手。請根據以下 Email 內容，萃取出一個可執行的目標。",
    "",
    "回傳格式必須是嚴格的 JSON（不要包含 markdown 標記），欄位如下：",
    '{',
    '  "title": "目標名稱（簡短、可執行）",',
    '  "subtasks": ["子任務1", "子任務2", ...],',
    '  "deadline": "YYYY-MM-DD 或 null（若信件未提及截止日）"',
    '}',
    "",
    "規則：",
    "1. title 應為一句話，清楚描述目標",
    "2. subtasks 拆解為 2~5 個具體步驟",
    "3. deadline 若信件中有提及日期則填入，否則設為 null",
    "4. 只回傳 JSON，不要額外說明",
    "",
    "--- Email 內容 ---",
    emailBody,
  ].join("\n");
}

// ── Private: Mock AI ────────────────────────

/**
 * Mock AI 解析邏輯
 *
 * 從 Email 內文中擷取第一行作為 title，其餘行作為 subtasks。
 * 模擬真實 AI 的回傳格式。
 *
 * @param {string} emailBody - 信件內文
 * @returns {ParsedGoal} 解析結果
 */
function mockAIParse(emailBody) {
  const lines = emailBody
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const title = lines[0] || "未命名目標";
  const subtasks = lines.slice(1);

  return {
    title,
    subtasks: subtasks.length > 0 ? subtasks : ["開始執行"],
    deadline: null,
  };
}

// ── Public API ──────────────────────────────

/**
 * 分析 Email 內容，產出標準化的目標資料
 *
 * 目前使用 Mock 實作。未來替換為真實 AI API 時，
 * 將 `buildPrompt()` 產出的 Prompt 發送至 API，
 * 並解析回傳的 JSON 為 ParsedGoal。
 *
 * 真實 API 替換範例（OpenAI）：
 * ```js
 * const response = await fetch("https://api.openai.com/v1/chat/completions", {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json",
 *     "Authorization": `Bearer ${apiKey}`,
 *   },
 *   body: JSON.stringify({
 *     model: "gpt-4o-mini",
 *     messages: [{ role: "user", content: buildPrompt(emailBody) }],
 *     response_format: { type: "json_object" },
 *   }),
 * });
 * const data = await response.json();
 * return JSON.parse(data.choices[0].message.content);
 * ```
 *
 * @param {string} emailBody - 信件內文
 * @returns {Promise<ParsedGoal>} 標準化的目標資料
 */
export async function analyzeEmail(emailBody) {
  // 取得 API Key（未來真實呼叫時使用）
  const apiKey = getConfig("aiApiKey");

  // 建立 Prompt（未來真實呼叫時發送至 API）
  const prompt = buildPrompt(emailBody);

  // Mock：模擬 AI 回應延遲
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock：使用本地解析代替 AI API
  // 未來替換時，改為發送 prompt 至 AI API 並解析 JSON 回傳
  const result = mockAIParse(emailBody);

  return result;
}

/**
 * 取得用於除錯的 Prompt 預覽
 *
 * @param {string} emailBody - 信件內文
 * @returns {string} 格式化後的 Prompt 字串
 */
export function getPromptPreview(emailBody) {
  return buildPrompt(emailBody);
}
