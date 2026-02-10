/**
 * aiService.js — AI 分析模組
 *
 * 職責：將 Email 內容透過 Anthropic API 分析，產出標準化的目標資料。
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
 * @property {string}      title    - 目標名稱
 * @property {string}      category - 分類（學習、健康、財務、職涯、生活）
 * @property {string[]}    subtasks - 子任務文字陣列
 * @property {string|null} deadline - 截止日期（YYYY-MM-DD），無法推斷時為 null
 */

// ── Private: Prompt Formatting ──────────────

/**
 * 建立發送給 AI 的 Prompt（SMART 原則）
 *
 * 要求 AI 依據 SMART（Specific, Measurable, Achievable, Relevant, Time-bound）
 * 原則分析 Email 並回傳嚴格的 JSON 格式。
 *
 * @param {string} emailBody - 信件內文
 * @returns {string} 格式化後的 Prompt
 */
function buildPrompt(emailBody) {
  return [
    "你是一位專業的個人目標管理顧問，擅長運用 SMART 原則將模糊的想法轉化為可執行的目標。",
    "",
    "請根據以下 Email 內容，運用 SMART 原則萃取出一個結構化目標：",
    "- Specific（具體）：目標名稱必須明確描述要達成的事項",
    "- Measurable（可衡量）：每個子任務必須有明確的完成標準",
    "- Achievable（可達成）：子任務應為合理可執行的步驟",
    "- Relevant（相關）：所有子任務必須與主目標直接相關",
    "- Time-bound（有時限）：盡可能從信件內容推斷截止日期",
    "",
    "你必須回傳且僅回傳一個嚴格的 JSON 物件，不包含任何 markdown 標記、註解或額外文字。",
    "JSON 結構如下：",
    "{",
    '  "title": "string — 一句話描述目標，以動詞開頭（如：完成…、建立…、學會…）",',
    '  "category": "string — 從以下分類中擇一：學習、健康、財務、職涯、生活",',
    '  "subtasks": ["string", "string", ...],',
    '  "deadline": "string | null — 格式為 YYYY-MM-DD，無法推斷時為 null"',
    "}",
    "",
    "欄位規則：",
    "1. title：具體且可執行的一句話，不超過 30 字",
    "2. category：根據信件內容判斷最適合的分類",
    "3. subtasks：拆解為 2～5 個具體步驟，每個步驟以動詞開頭，描述可量化的行動",
    "4. deadline：優先採用信件中明確提及的日期；若信件僅提及相對時間（如「本週」「下個月」），請推算為具體日期；若完全無時間線索則設為 null",
    "5. 僅回傳 JSON，不要有任何額外輸出",
    "",
    "--- Email 內容 ---",
    emailBody,
  ].join("\n");
}

// ── Constants ───────────────────────────────

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";

// ── Private: API Call ───────────────────────

/**
 * 將 Anthropic API 的 HTTP 錯誤轉換為使用者友善訊息
 *
 * @param {number} status - HTTP 狀態碼
 * @param {Object} body   - 回應 JSON
 * @returns {string} 錯誤訊息
 */
function formatApiError(status, body) {
  const detail = body?.error?.message || "";

  switch (status) {
    case 401:
      return "API Key 無效，請至設定頁面確認";
    case 403:
      return "API Key 權限不足：" + detail;
    case 429:
      return "API 額度不足或請求過於頻繁，請稍後再試";
    case 529:
      return "Anthropic API 暫時過載，請稍後再試";
    default:
      return `API 錯誤（${status}）：${detail || "未知錯誤"}`;
  }
}

/**
 * 從 AI 回應文字中解析 JSON，容忍 markdown 包裹
 *
 * @param {string} text - AI 回應原始文字
 * @returns {ParsedGoal} 解析結果
 */
function parseAIResponse(text) {
  // 移除可能的 markdown code block 包裹
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");

  const parsed = JSON.parse(cleaned);

  // 基本欄位驗證
  if (typeof parsed.title !== "string" || !Array.isArray(parsed.subtasks)) {
    throw new Error("AI 回傳的 JSON 格式不符預期");
  }

  const VALID_CATEGORIES = ["學習", "健康", "財務", "職涯", "生活"];

  return {
    title: parsed.title,
    category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "學習",
    subtasks: parsed.subtasks.filter((s) => typeof s === "string" && s.length > 0),
    deadline: typeof parsed.deadline === "string" ? parsed.deadline : null,
  };
}

// ── Public API ──────────────────────────────

/**
 * 分析 Email 內容，透過 Anthropic API 產出標準化的目標資料
 *
 * @param {string} emailBody - 信件內文
 * @returns {Promise<ParsedGoal>} 標準化的目標資料
 * @throws {Error} API Key 未設定、無效、額度不足或網路錯誤
 */
export async function analyzeEmail(emailBody) {
  const apiKey = getConfig("aiApiKey");
  if (!apiKey) {
    throw new Error("尚未設定 AI API Key，請至設定頁面填寫");
  }

  const prompt = buildPrompt(emailBody);

  let response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    throw new Error("無法連線至 Anthropic API：" + err.message);
  }

  const body = await response.json();

  if (!response.ok) {
    throw new Error(formatApiError(response.status, body));
  }

  const text = body.content?.[0]?.text;
  if (!text) {
    throw new Error("AI 未回傳有效內容");
  }

  try {
    return parseAIResponse(text);
  } catch (err) {
    throw new Error("AI 回應解析失敗：" + err.message);
  }
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
