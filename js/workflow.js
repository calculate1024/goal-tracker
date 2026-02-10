/**
 * workflow.js — 流程串接模組（主控制器）
 *
 * 職責：串接 gmailService（讀取信件）→ aiService（批次 AI 分析）→ store（寫入目標），
 * 實現「從 Gmail 自動產生目標」的完整流程。
 *
 * 執行前會檢查 settings.js 中的 Client ID 與 API Key 是否已設定，
 * 若未設定則中止並回傳提示訊息。
 *
 * 資料流：Gmail → Email[] → 合併 → aiService.analyzeEmails() → AnalysisResult → store.addGoal()
 *
 * @module workflow
 */

import { fetchLatestEmails, fetchUserEmail, sendEmail } from "./gmailService.js";
import { analyzeEmails, buildSummaryEmail } from "./aiService.js";
import { addGoal } from "./store.js";
import { getConfig, getAccessToken } from "./settings.js";

// ── Type Definitions ────────────────────────

/**
 * 單個目標的處理結果
 *
 * @typedef {Object} GoalResult
 * @property {boolean} success        - 是否成功寫入 store
 * @property {string}  [goalId]       - 成功時的目標 ID
 * @property {string}  title          - 目標名稱
 * @property {string}  category       - 目標分類
 * @property {string}  priority       - 優先度
 * @property {string}  source_subject - 來源信件主旨
 * @property {string}  [error]        - 失敗時的錯誤訊息
 */

/**
 * 工作流程執行結果
 *
 * @typedef {Object} WorkflowResult
 * @property {boolean}      ok              - 整體是否成功
 * @property {string}       message         - 結果摘要訊息
 * @property {GoalResult[]} results         - 每個目標的處理結果
 * @property {Object}       [analysisSummary] - AI 分析摘要
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

// ── Private: Helpers ────────────────────────

/**
 * 從 email header 值中提取純 email 地址
 * 支援 "Name <email>" 格式與純 email 格式
 *
 * @param {string} headerValue - To 或 Delivered-To header 值
 * @returns {string|null} email 地址，無法提取時回傳 null
 */
function extractEmailAddress(headerValue) {
  if (!headerValue) return null;
  const match = headerValue.match(/<([^>]+)>/) || headerValue.match(/([^\s,]+@[^\s,]+)/);
  return match ? match[1] : null;
}

/**
 * 將多封 Email 物件合併為 AI 可讀的文字格式
 *
 * @param {import('./gmailService.js').Email[]} emails - 信件陣列
 * @returns {string} 格式化後的多封信件文字
 */
function formatEmailsForPrompt(emails) {
  return emails
    .map(
      (email, i) =>
        `=== Email ${i + 1}/${emails.length} ===\n` +
        `From: ${email.from}\n` +
        `To: ${email.to}\n` +
        `Subject: ${email.subject}\n` +
        `Date: ${email.date}\n` +
        `---\n` +
        `${email.body}`
    )
    .join("\n\n");
}

// ── Public API ──────────────────────────────

/**
 * 執行完整的「Gmail → 目標」工作流程（批次分析）
 *
 * 步驟：
 * 1. 檢查 Client ID 與 API Key 是否已設定
 * 2. 取得使用者 email 與最新 Gmail 信件
 * 3. 合併所有信件後一次送給 AI 批次分析
 * 4. AI 自動篩選需行動的信件並產出目標
 * 5. 將分析結果自動寫入 store（addGoal）
 * 6. 發送摘要通知郵件
 * 7. 回傳處理結果摘要
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

  // Step 2: 讀取信件，並取得使用者 email
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
      message: "過去 24 小時內沒有可處理的信件",
      results: [],
    };
  }

  // 取得使用者 email：優先 profile API，fallback 從信件 To header 提取
  let userEmail = null;
  try {
    userEmail = await fetchUserEmail();
  } catch {
    // profile API 失敗，從已取得的信件 headers 提取
    for (const email of emails) {
      userEmail = extractEmailAddress(email.to);
      if (userEmail) break;
    }
  }

  // Step 3: 合併信件並送 AI 批次分析
  const emailBodies = formatEmailsForPrompt(emails);

  let analysisResult;
  try {
    analysisResult = await analyzeEmails(emailBodies, userEmail || "（未知使用者）");
  } catch (err) {
    return {
      ok: false,
      message: "AI 分析失敗：" + err.message,
      results: [],
    };
  }

  // Step 4: 將篩選後的目標寫入 store
  /** @type {GoalResult[]} */
  const results = [];

  for (const parsedGoal of analysisResult.goals) {
    try {
      const goal = addGoal({
        title: parsedGoal.title,
        category: parsedGoal.category || "學習",
        deadline: parsedGoal.deadline,
        subtasks: parsedGoal.subtasks,
      });

      results.push({
        success: true,
        goalId: goal.id,
        title: parsedGoal.title,
        category: parsedGoal.category,
        priority: parsedGoal.priority,
        source_subject: parsedGoal.source_subject,
      });
    } catch (err) {
      results.push({
        success: false,
        title: parsedGoal.title,
        category: parsedGoal.category,
        priority: parsedGoal.priority,
        source_subject: parsedGoal.source_subject,
        error: err.message,
      });
    }
  }

  // Step 5: 發送摘要通知郵件
  let sendWarning = "";

  if (userEmail && getAccessToken()) {
    try {
      const summaryEmail = buildSummaryEmail(analysisResult);
      const emailResult = await sendEmail({
        to: userEmail,
        subject: summaryEmail.subject,
        body: summaryEmail.body,
      });
      if (!emailResult.ok) {
        sendWarning = emailResult.message;
      }
    } catch (err) {
      sendWarning = err.message;
    }
  } else if (!userEmail) {
    sendWarning = "無法取得使用者 email，跳過摘要郵件發送";
  }

  // Step 6: 組合結果摘要
  const summary = analysisResult.analysis_summary;
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  let message = `分析 ${summary.total_emails} 封信件：${summary.filtered_in} 封需行動、${summary.filtered_out} 封已排除`;
  if (successCount > 0) {
    message += `，已建立 ${successCount} 個目標`;
  }
  if (failCount > 0) {
    message += `，${failCount} 個目標寫入失敗`;
  }
  if (sendWarning) {
    message += `（郵件通知失敗：${sendWarning}）`;
  }

  return {
    ok: failCount === 0,
    message,
    results,
    analysisSummary: summary,
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
