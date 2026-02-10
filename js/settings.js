/**
 * settings.js — 設定管理模組
 *
 * 職責：管理使用者的敏感設定（Google Client ID、AI API Key），
 * 提供存取介面與連線測試功能。
 *
 * 儲存策略：以 Base64 編碼後寫入 localStorage，
 * 降低明文曝露風險（非加密，僅為混淆）。
 *
 * 本模組不操作 DOM，所有 UI 互動由 app.js 負責。
 *
 * @module settings
 */

// ── Constants ────────────────────────────────

/** @type {string} localStorage 的 key */
const SETTINGS_KEY = "goal-tracker-settings";

// ── Private: Persistence ─────────────────────

/**
 * 從 localStorage 載入所有設定
 *
 * @returns {Object<string, string>} key-value 設定物件
 */
function loadAll() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * 將所有設定寫入 localStorage
 *
 * @param {Object<string, string>} settings - 完整設定物件
 * @returns {void}
 */
function saveAll(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Private: Encoding ────────────────────────

/**
 * 將字串編碼為 Base64（混淆用，非加密）
 *
 * @param {string} value - 明文
 * @returns {string} Base64 字串
 */
function encode(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

/**
 * 將 Base64 字串解碼為明文
 *
 * @param {string} encoded - Base64 字串
 * @returns {string} 明文
 */
function decode(encoded) {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return "";
  }
}

// ── Public API ───────────────────────────────

/**
 * 儲存單一設定值（Base64 編碼後存入 localStorage）
 *
 * @param {string} key   - 設定鍵名（如 "googleClientId"、"aiApiKey"）
 * @param {string} value - 設定值（明文，儲存時自動編碼）
 * @returns {void}
 */
export function saveConfig(key, value) {
  const settings = loadAll();
  settings[key] = encode(value);
  saveAll(settings);
}

/**
 * 讀取單一設定值（自動解碼）
 *
 * @param {string} key - 設定鍵名
 * @returns {string} 明文設定值，若不存在則回傳空字串
 */
export function getConfig(key) {
  const settings = loadAll();
  const encoded = settings[key];
  return encoded ? decode(encoded) : "";
}

/**
 * 測試 Google Client ID 是否有效
 *
 * 嘗試呼叫 Google Identity Services API 初始化，
 * 若 Client ID 格式正確且 GIS 腳本已載入則視為成功。
 *
 * @param {string} clientId - Google Client ID
 * @returns {Promise<{ ok: boolean, message: string }>} 測試結果
 */
export function testGoogleConnection(clientId) {
  return new Promise((resolve) => {
    if (!clientId || !clientId.includes(".apps.googleusercontent.com")) {
      resolve({ ok: false, message: "Client ID 格式不正確" });
      return;
    }

    if (typeof google === "undefined" || !google.accounts) {
      resolve({ ok: false, message: "Google Identity Services 尚未載入" });
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: () => {},
      });
      resolve({ ok: true, message: "連線成功" });
    } catch (err) {
      resolve({ ok: false, message: "初始化失敗：" + err.message });
    }
  });
}
