/**
 * workflow.js — 流程串接模組（主控制器）
 *
 * 職責：串接 gmailService（讀取信件）→ aiService（AI 分析）→ store（寫入目標），
 * 實現「從 Gmail 自動產生目標」的完整流程。
 *
 * 執行前會檢查 settings.js 中的 Client ID 與 API Key 是否已設定，
 * 若未設定則中止並回傳提示訊息。
 *
 * 資料流：Gmail → Email[] → aiService.analyzeEmail() → ParsedGoal → store.addGoal()
 *
 * @module workflow
 */

import { fetchLatestEmails, sendEmail } from "./gmailService.js";
import { analyzeEmail } from "./aiService.js";
import { addGoal } from "./store.js";
import { getConfig, getAccessToken } from "./settings.js";

// ── Type Definitions ────────────────────────

/**
 * 單封信件的處理結果
 *
 * @typedef {Object} EmailResult
 * @property {string}  emailId      - 信件 ID
 * @property {string}  subject      - 信件主旨
 * @property {boolean} success      - 是否成功產生目標
 * @property {string}  [goalId]     - 成功時的目標 ID
 * @property {string}  [title]      - 成功時的目標名稱
 * @property {string}  [error]      - 失敗時的錯誤訊息
 * @property {string}  [sendWarning] - 發信失敗的警告訊息
 */

/**
 * 工作流程執行結果
 *
 * @typedef {Object} WorkflowResult
 * @property {boolean}       ok       - 整體是否成功
 * @property {string}        message  - 結果摘要訊息
 * @property {EmailResult[]} results  - 每封信件的處理結果
 */

// ── Private: Credential Check ───────────────

/**
 * 檢查必要的設定是否已填寫
 *
 * @returns {{ valid: boolean, missing: string[] }} 檢查結果
 */
function checkCredentials() {
  const missing = [];

  if (!getConfig("googleClientId")) {
    missing.push("Google Client ID");
  }
  if (!getConfig("aiApiKey")) {
    missing.push("AI API Key");
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ── Private: Email Notification ─────────────

/**
 * 組裝目標建立結果的摘要郵件內文
 *
 * @param {EmailResult[]} successResults - 成功建立的目標結果
 * @returns {string} 純文字郵件內文
 */
function buildSummaryBody(successResults) {
  const lines = [
    "GoalTracker — AI 目標建立通知",
    "",
    `已從信件中成功建立 ${successResults.length} 個目標：`,
    "",
  ];

  successResults.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.title}`);
    lines.push(`   來源信件主旨：${r.subject}`);
    lines.push("");
  });

  lines.push("請開啟 GoalTracker 查看完整內容並開始執行！");
  return lines.join("\n");
}

/**
 * 嘗試發送結果摘要郵件至使用者的 Gmail（me）
 *
 * 發信失敗不應中斷主流程，因此回傳結果而非拋出錯誤。
 *
 * @param {EmailResult[]} successResults - 成功建立的目標結果
 * @returns {Promise<{ ok: boolean, message: string }>} 發送結果
 */
async function trySendSummaryEmail(successResults) {
  try {
    return await sendEmail({
      to: "me",
      subject: `[GoalTracker] 已建立 ${successResults.length} 個新目標`,
      body: buildSummaryBody(successResults),
    });
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

// ── Public API ──────────────────────────────

/**
 * 執行完整的「Gmail → 目標」工作流程
 *
 * 步驟：
 * 1. 檢查 Client ID 與 API Key 是否已設定
 * 2. 讀取最新 Gmail 信件
 * 3. 逐封信件透過 AI 分析
 * 4. 將分析結果自動寫入 store（addGoal）
 * 5. 回傳處理結果摘要
 *
 * @param {number} [maxEmails=5] - 最多處理幾封信件
 * @returns {Promise<WorkflowResult>} 工作流程執行結果
 */
export async function runEmailToGoal(maxEmails = 5) {
  // Step 1: 檢查設定
  const credentials = checkCredentials();
  if (!credentials.valid) {
    return {
      ok: false,
      message: `請先至設定頁面填寫：${credentials.missing.join("、")}`,
      results: [],
    };
  }

  // Step 2: 讀取信件
  let emails;
  try {
    emails = await fetchLatestEmails(maxEmails);
  } catch (err) {
    return {
      ok: false,
      message: "讀取 Gmail 信件失敗：" + err.message,
      results: [],
    };
  }

  if (emails.length === 0) {
    return {
      ok: true,
      message: "沒有新的信件可處理",
      results: [],
    };
  }

  // Step 3 & 4: 逐封分析並寫入 store
  /** @type {EmailResult[]} */
  const results = [];

  for (const email of emails) {
    try {
      const parsed = await analyzeEmail(email.body);

      const goal = addGoal({
        title: parsed.title,
        category: parsed.category || "學習",
        deadline: parsed.deadline,
        subtasks: parsed.subtasks,
      });

      results.push({
        emailId: email.id,
        subject: email.subject,
        success: true,
        goalId: goal.id,
        title: parsed.title,
      });
    } catch (err) {
      results.push({
        emailId: email.id,
        subject: email.subject,
        success: false,
        error: err.message,
      });
    }
  }

  // Step 5: 自動發送結果摘要郵件
  const successResults = results.filter((r) => r.success);
  let sendWarning = "";

  if (successResults.length > 0 && getAccessToken()) {
    const emailResult = await trySendSummaryEmail(successResults);
    if (!emailResult.ok) {
      sendWarning = emailResult.message;
    }
  }

  // Step 6: 組合結果摘要
  const successCount = successResults.length;
  const failCount = results.length - successCount;

  let message = `已處理 ${results.length} 封信件：${successCount} 個目標建立成功`;
  if (failCount > 0) {
    message += `，${failCount} 封處理失敗`;
  }
  if (sendWarning) {
    message += `（郵件通知失敗：${sendWarning}）`;
  }

  return {
    ok: failCount === 0,
    message,
    results,
  };
}

/**
 * 檢查工作流程是否可執行（設定是否完整）
 *
 * 供 UI 層在顯示按鈕前檢查，避免使用者點擊後才發現未設定。
 *
 * @returns {{ ready: boolean, missing: string[] }}
 */
export function isWorkflowReady() {
  const { valid, missing } = checkCredentials();
  return { ready: valid, missing };
}
