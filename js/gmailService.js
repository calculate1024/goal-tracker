/**
 * gmailService.js — Gmail 信件讀取模組
 *
 * 職責：透過 Google API 讀取使用者的 Gmail 信件。
 * 目前為 Mock 實作，未來可替換為真實 Gmail API 呼叫。
 *
 * 本模組只負責「讀取信件」，不負責解析或寫入 store。
 * 解析由 aiService.js 負責，流程串接由 workflow.js 負責。
 *
 * @module gmailService
 */

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
