/**
 * gmailService.js — Gmail 信件讀取與發送模組
 *
 * 職責：透過 Google API 讀取與發送使用者的 Gmail 信件。
 * 讀取使用 Gmail REST API（list + get + 解析）。
 * 發送使用 Gmail API 的 users.messages.send 端點。
 *
 * 本模組只負責「信件 I/O」，不負責解析或寫入 store。
 * 解析由 aiService.js 負責，流程串接由 workflow.js 負責。
 *
 * @module gmailService
 */

import { getAccessToken } from "./settings.js";

// ── Constants ────────────────────────────────

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

// ── Type Definitions ────────────────────────

/**
 * @typedef {Object} Email
 * @property {string} id      - 信件唯一 ID
 * @property {string} from    - 寄件者
 * @property {string} to      - 收件者（Delivered-To 或 To）
 * @property {string} subject - 主旨
 * @property {string} body    - 信件內文
 * @property {string} date    - 收件日期（ISO 格式）
 */

// ── Private Helpers ─────────────────────────

/**
 * 將 Gmail API 回傳的 URL-safe Base64 body 解碼為 UTF-8 明文
 *
 * @param {string} data - URL-safe Base64 編碼的字串
 * @returns {string} 解碼後的 UTF-8 明文
 */
function decodeBase64Url(data) {
  if (!data) return "";
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return atob(base64);
  }
}

/**
 * 遞迴搜尋 payload 找到 text/plain 的內容並解碼
 *
 * @param {Object} payload - Gmail message 的 payload 物件
 * @returns {string} 解碼後的純文字字串
 */
function extractPlainText(payload) {
  if (!payload) return "";

  // 非 multipart：直接從 body.data 解碼
  if (payload.body && payload.body.data) {
    if (!payload.mimeType || payload.mimeType === "text/plain") {
      return decodeBase64Url(payload.body.data);
    }
  }

  // multipart：遞迴搜尋 parts
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
      // 遞迴處理巢狀 parts（如 multipart/alternative 內的 multipart/mixed）
      if (part.parts) {
        const result = extractPlainText(part);
        if (result) return result;
      }
    }
  }

  return "";
}

/**
 * 從 Gmail message 的 payload.headers 中找出指定 header 的值
 *
 * @param {Array<{name: string, value: string}>} headers - header 陣列
 * @param {string} name - 要找的 header 名稱（不區分大小寫）
 * @returns {string} header 值，找不到時回傳空字串
 */
function getHeader(headers, name) {
  if (!headers) return "";
  const header = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header ? header.value : "";
}

/**
 * 將 Gmail API 回傳的 message 物件轉換為 Email 格式
 *
 * @param {Object} msg - Gmail API 回傳的 message 物件
 * @returns {Email} 標準化的 Email 物件
 */
function parseMessage(msg) {
  const headers = msg.payload ? msg.payload.headers : [];
  return {
    id: msg.id,
    from: getHeader(headers, "From"),
    to: getHeader(headers, "Delivered-To") || getHeader(headers, "To"),
    subject: getHeader(headers, "Subject"),
    body: extractPlainText(msg.payload),
    date: getHeader(headers, "Date"),
  };
}

// ── Public API ──────────────────────────────

/**
 * 讀取過去 24 小時內的 Gmail 信件
 *
 * 僅回傳 24 小時內收到的信件，避免處理過時或過量的資訊。
 * 使用 Gmail REST API：先 list 取得 ID，再逐筆 get 完整內容。
 *
 * @param {number} [maxResults=100] - 最多回傳幾封信件（Gmail API 上限 500）
 * @returns {Promise<Email[]>} 信件陣列（僅包含過去 24 小時內的信件）
 */
export async function fetchLatestEmails(maxResults = 100) {
  const token = getAccessToken();
  if (!token) {
    throw new Error("尚未授權 Gmail，請先連結 Google 帳號");
  }

  // Step 1: 取得 message ID 列表
  const listUrl = `${GMAIL_API}/messages?q=newer_than:1d&maxResults=${maxResults}`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(
      "Gmail API 讀取失敗：" + (err?.error?.message || `HTTP ${listRes.status}`)
    );
  }

  const listData = await listRes.json();
  const messageIds = listData.messages || [];

  if (messageIds.length === 0) return [];

  // Step 2: 逐筆取得完整信件內容
  const emails = await Promise.all(
    messageIds.map(async ({ id }) => {
      const msgRes = await fetch(`${GMAIL_API}/messages/${id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!msgRes.ok) return null;
      const msg = await msgRes.json();
      return parseMessage(msg);
    })
  );

  return emails.filter((e) => e !== null);
}

/**
 * 根據 ID 讀取單封信件的完整內容
 *
 * @param {string} emailId - 信件 ID
 * @returns {Promise<Email|null>} 信件物件，找不到時回傳 null
 */
export async function fetchEmailById(emailId) {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${GMAIL_API}/messages/${emailId}?format=full`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const msg = await res.json();
    return parseMessage(msg);
  } catch {
    return null;
  }
}

// ── User Profile ────────────────────────────

/**
 * 取得目前授權使用者的 Gmail 電子郵件地址
 *
 * @returns {Promise<string>} 使用者的 email 地址
 * @throws {Error} 未授權或 API 呼叫失敗
 */
export async function fetchUserEmail() {
  const token = getAccessToken();
  if (!token) {
    throw new Error("尚未授權 Gmail，請先連結 Google 帳號");
  }

  const res = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      "無法取得使用者資訊：" + (err?.error?.message || `HTTP ${res.status}`)
    );
  }

  const profile = await res.json();
  if (!profile.emailAddress) {
    throw new Error("Gmail profile 未回傳 emailAddress");
  }
  return profile.emailAddress;
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
      `${GMAIL_API}/messages/send`,
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
