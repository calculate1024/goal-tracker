/**
 * gmailService.js — Gmail 信件讀取與發送模組
 *
 * 職責：透過 Google API 讀取與發送使用者的 Gmail 信件。
 * 讀取目前為 Mock 實作，未來可替換為真實 Gmail API 呼叫。
 * 發送使用 Gmail API 的 users.messages.send 端點。
 *
 * 本模組只負責「信件 I/O」，不負責解析或寫入 store。
 * 解析由 aiService.js 負責，流程串接由 workflow.js 負責。
 *
 * @module gmailService
 */

import { getAccessToken } from "./settings.js";

// ── Mock Data ────────────────────────────────

/**
 * @typedef {Object} Email
 * @property {string} id      - 信件唯一 ID
 * @property {string} from    - 寄件者
 * @property {string} subject - 主旨
 * @property {string} body    - 信件內文
 * @property {string} date    - 收件日期（ISO 格式）
 */

/** @type {Email[]} Mock 信件資料 */
const MOCK_EMAILS = [
  {
    id: "m_001",
    from: "productivity@example.com",
    subject: "本週目標：實踐時間盒工作法",
    body: `實踐「時間盒」工作法\n列出今日三件最重要的事\n為每件事設定 25 分鐘時間盒\n完成後休息 5 分鐘再繼續`,
    date: "2026-02-10",
  },
  {
    id: "m_002",
    from: "coach@example.com",
    subject: "讀書計畫：一件事的力量",
    body: `閱讀《一件事》並實踐核心原則\n找出你的「一件事」\n每天早上優先處理它\n記錄每週的專注時數\n月底回顧成果`,
    date: "2026-02-11",
  },
];

// ── Public API ──────────────────────────────

/**
 * 讀取最新的 Gmail 信件（Mock）
 *
 * 目前回傳預設的 Mock 資料，未來替換為真實 Gmail API 呼叫：
 * `gapi.client.gmail.users.messages.list()`
 *
 * @param {number} [maxResults=5] - 最多回傳幾封信件
 * @returns {Promise<Email[]>} 信件陣列
 */
export async function fetchLatestEmails(maxResults = 5) {
  // Mock：模擬網路延遲
  await new Promise((resolve) => setTimeout(resolve, 300));

  return MOCK_EMAILS.slice(0, maxResults);
}

/**
 * 根據 ID 讀取單封信件的完整內容（Mock）
 *
 * @param {string} emailId - 信件 ID
 * @returns {Promise<Email|null>} 信件物件，找不到時回傳 null
 */
export async function fetchEmailById(emailId) {
  await new Promise((resolve) => setTimeout(resolve, 100));

  return MOCK_EMAILS.find((e) => e.id === emailId) || null;
}

// ── Send Email ──────────────────────────────

/**
 * 將字串編碼為 URL-safe Base64（Gmail API 要求的格式）
 *
 * @param {string} str - 原始字串
 * @returns {string} URL-safe Base64 字串
 */
function toBase64Url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * 組裝 RFC 2822 格式的郵件原文
 *
 * @param {string} to      - 收件者 email
 * @param {string} subject - 郵件主旨
 * @param {string} body    - 郵件內文（純文字）
 * @returns {string} RFC 2822 格式郵件字串
 */
function buildRawEmail(to, subject, body) {
  return [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].join("\r\n");
}

/**
 * 透過 Gmail API 發送電子郵件
 *
 * 使用 users.messages.send 端點，需要 gmail.send 或 gmail.compose 權限。
 * 若 access_token 不存在或權限不足，會拋出錯誤。
 *
 * @param {Object} options
 * @param {string} options.to      - 收件者 email
 * @param {string} options.subject - 郵件主旨
 * @param {string} options.body    - 郵件內文（純文字）
 * @returns {Promise<{ ok: boolean, message: string }>} 發送結果
 */
export async function sendEmail({ to, subject, body }) {
  const token = getAccessToken();
  if (!token) {
    return { ok: false, message: "尚未授權 Gmail，無法發送郵件" };
  }

  const raw = toBase64Url(buildRawEmail(to, subject, body));

  let response;
  try {
    response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      }
    );
  } catch (err) {
    return { ok: false, message: "無法連線至 Gmail API：" + err.message };
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const detail = errBody?.error?.message || `HTTP ${response.status}`;
    return { ok: false, message: "郵件發送失敗：" + detail };
  }

  return { ok: true, message: "郵件已成功發送" };
}
