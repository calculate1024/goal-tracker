# GoalTracker — AI 郵件分析目標追蹤系統

> 自動分析過去 24 小時的 Gmail 信件，運用 AI 萃取可執行目標，幫你把大目標拆成小步驟，每天看見自己的進步。

---

## 功能總覽

| # | 功能 | 說明 |
|---|------|------|
| F1 | 目標 CRUD | 建立、編輯、刪除目標，設定截止日期 |
| F2 | 目標分類 | 五大分類：核心專案、日常營運、專業成長、外部協作、個人管理 |
| F3 | 子任務拆解 | 每個目標可拆分為多個可勾選的子任務 |
| F4 | 進度追蹤 | 根據子任務完成比例自動計算進度百分比 |
| F5 | 進度視覺化 | 動態進度條，CSS Custom Property 驅動平滑動畫 |
| F6 | 篩選與排序 | 依分類 / 狀態篩選，依截止日 / 建立日 / 進度排序 |
| F7 | 儀表板 | 首頁顯示全部目標、已完成、進行中、已逾期統計 |
| F8 | Gmail 整合 | OAuth 2.0 授權，讀取過去 24 小時信件（最多 100 封） |
| F9 | AI 批次分析 | 透過 Anthropic API 篩選需行動信件，運用 SMART 原則萃取目標 |
| F10 | 摘要通知 | 分析完成後自動寄送摘要郵件至使用者信箱 |
| F11 | 備份匯出/匯入 | JSON 格式，支援覆蓋與合併兩種匯入模式 |
| F12 | RWD 響應式 | 支援桌面（720px）與手機（< 576px）瀏覽 |

---

## 技術架構

### 技術選型

| 層級 | 技術 | 說明 |
|------|------|------|
| 結構 | HTML5 | 語義化標籤，`lang="zh-TW"` |
| 樣式 | CSS3 | BEM 命名、`:root` 設計 Token、Flexbox / Grid |
| 邏輯 | Vanilla JavaScript (ES6+) | 零框架、零依賴、ES Module |
| 儲存 | localStorage | 目標資料 + 設定（Base64 編碼） |
| AI | Anthropic API | Claude Sonnet 4.5，批次信件分析 |
| 郵件 | Gmail REST API | OAuth 2.0（`gmail.readonly` + `gmail.send`） |
| 版控 | Git + GitHub | — |

### 專案結構

```
goal-tracker/
├── index.html              # 單一進入點（含 CSP meta tag）
├── css/
│   └── style.css           # 主樣式（BEM + :root Token + RWD）
├── js/
│   ├── app.js              # 進入點：初始化、事件綁定、Modal 管理
│   ├── store.js            # 狀態管理（SSOT）+ localStorage 持久化
│   ├── renderer.js         # DOM 渲染（監聽 stateChanged 事件）
│   ├── dom.js              # DOM 元素快取（統一 getElementById）
│   ├── utils.js            # 工具函式（ID 生成、日期格式化）
│   ├── settings.js         # 設定管理 + OAuth token 管理
│   ├── gmailService.js     # Gmail REST API 串接（讀信、寄信）
│   ├── aiService.js        # Anthropic API 分析 + 回應驗證
│   └── workflow.js         # 流程串接（Gmail → AI → Store → 通知）
└── README.md
```

### 模組職責與資料流

```
使用者操作 → app.js → store.js → stateChanged 事件 → renderer.js → DOM 更新
                                                                （單向資料流）

┌──────────────────────────────────────────────────────────────┐
│                        app.js                                │
│           事件綁定 ‧ Modal 管理 ‧ 模組串接                      │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
  ┌────▼────┐   ┌─────▼──────┐   ┌──▼──────────┐
  │store.js │   │renderer.js │   │ workflow.js │
  │ 狀態CRUD │◄──│ 純渲染     │   │ 主控制器     │
  │ 持久化   │   │ .textContent│  │ Gmail→AI→  │
  └────▲────┘   └─────┬──────┘  │ Store→通知  │
       │        ┌─────┴───┐     └──┬──────┬───┘
       │   ┌────▼──┐ ┌────▼──┐    │      │
       │   │utils  │ │ dom   │    │      │
       │   └───────┘ └───────┘    │      │
       │                          │      │
  ┌────┴──────────────────────────┴──┐ ┌─▼──────────┐
  │          settings.js             │ │gmailService │
  │  API Key 管理 ‧ OAuth token 管理  │ │ 信件讀取/寄送│
  └──────────────────────────────────┘ └─────────────┘
                    ▲
              ┌─────┴──────┐
              │ aiService  │
              │ AI 分析+驗證 │
              └────────────┘
```

### 資料模型

```javascript
// 目標 (Goal)
{
  id: "g_m1abc2de",
  title: "完成季度報告初稿",
  category: "核心專案",           // 核心專案 | 日常營運 | 專業成長 | 外部協作 | 個人管理
  deadline: "2026-03-15",        // YYYY-MM-DD | null
  status: "active",              // "active" | "completed"
  createdAt: "2026-02-10",
  progress: 40,                  // 0–100，自動計算
  subtasks: [
    { id: "s_m1abc3fg", text: "蒐集各部門數據", completed: true },
    { id: "s_m1abc4hi", text: "撰寫摘要章節", completed: false }
  ]
}

// localStorage 儲存結構
{
  "goal-tracker-data": {
    goals: [],
    categories: ["核心專案", "日常營運", "專業成長", "外部協作", "個人管理"],
    currentFilter: "all",
    filterCategory: "all",
    sortBy: "deadline"
  },
  "goal-tracker-settings": {
    googleClientId: "<Base64>",
    aiApiKey: "<Base64>"
  }
}
```

---

## Email-to-Goal 流程

點擊「✨ 從 Gmail 獲取 AI 建議目標」按鈕後，系統執行以下流程：

```
1. 檢查憑證 ─→ 2. 抓取信件 ─→ 3. 取得使用者 Email
                                         │
4. 格式化信件 ←─────────────────────────────┘
       │
5. 發送至 Anthropic API（SMART prompt + 篩選指令）
       │
6. 解析 AI 回應 ─→ 7. 欄位驗證/截斷 ─→ 8. 寫入 Store
                                              │
9. 寄送摘要通知信 ←──────────────────────────────┘
```

**AI 分析策略：**
- **第一步 — 篩選**：判斷哪些信件需要使用者行動（寧可多納入，不要遺漏）
- **第二步 — 萃取**：運用 SMART 原則將信件轉化為結構化目標
- **回傳格式**：`{ analysis_summary, goals[] }`，含篩選統計與優先度排序

---

## 安全措施

| 項目 | 措施 |
|------|------|
| XSS 防護 | DOM 渲染全部使用 `.textContent`，不使用 `innerHTML` |
| CSP | `index.html` 設定 Content-Security-Policy，限制 `script-src`、`connect-src` 等 |
| Prompt Injection | `sanitizeEmailContent()` 移除注入模式 + XML tag 框架隔離信件內容 |
| AI 回應驗證 | 欄位長度截斷（title 60、subtask 100、field 200）+ deadline 格式驗證 + 分類白名單 |
| OAuth Token | 僅存記憶體，不寫入 localStorage；追蹤過期時間，到期自動清除 |
| API Key 儲存 | Base64 編碼存入 localStorage（混淆用，非加密） |
| 零依賴 | 無第三方 npm 套件，減少供應鏈風險 |

**已知限制：**
- API Key 透過瀏覽器直接發送至 Anthropic API，DevTools 可見
- Base64 編碼不等同加密，需依賴使用者保護自身瀏覽器環境
- Google Identity Services 為動態打包，無法使用 SRI（已由 CSP 限制來源）

---

## 如何運行

本專案為純前端靜態檔案，需透過 HTTP Server 啟動（ES Module 需要 HTTP 環境）。

**方法一：Python 內建伺服器（推薦）**

```bash
cd goal-tracker
python -m http.server 8080
```

開啟瀏覽器造訪 `http://localhost:8080`。

**方法二：VS Code Live Server**

安裝 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) 擴充套件，在 `index.html` 上右鍵 → 「Open with Live Server」。

**方法三：Node.js npx**

```bash
npx serve goal-tracker
```

> **注意：** 直接以 `file://` 開啟 `index.html` 會因瀏覽器 CORS 限制導致 ES Module 無法載入。

---

## 使用方式

### 基本操作

| 操作 | 方式 |
|------|------|
| 新增目標 | 點「+ 新增目標」→ 填寫名稱、分類、截止日、子任務 → 儲存 |
| 勾選子任務 | 打勾 checkbox，進度條自動更新 |
| 完成目標 | 點目標卡片的 **✓** 按鈕 |
| 編輯目標 | 點 **✎** 按鈕 |
| 刪除目標 | 點 **✕** 按鈕，確認後刪除 |
| 篩選 / 排序 | 使用頂部下拉選單 |
| 備份 | 點「匯出 JSON 備份」下載檔案 |
| 匯入 | 點「匯入備份檔案」，支援覆蓋或合併模式 |

### Gmail + AI 功能設定

1. 點右上角 **⚙** 開啟設定
2. 填入 **Google Client ID**（需於 Google Cloud Console 建立 OAuth 2.0 憑證）
3. 填入 **AI API Key**（Anthropic API Key）
4. 點「連線測試」確認 Google 設定
5. 點「連結 Gmail 帳號」完成 OAuth 授權
6. 回到主頁，點「✨ 從 Gmail 獲取 AI 建議目標」

### 資料儲存說明

- 所有目標資料存在瀏覽器的 **localStorage**，不上傳至任何伺服器
- 換瀏覽器或清除瀏覽器資料會遺失，建議定期匯出備份
- 不同電腦之間不會同步

---

## 技術亮點

| 亮點 | 說明 |
|------|------|
| **單向資料流** | `使用者操作 → app.js → store.js → stateChanged → renderer.js`，嚴格禁止反向操作 |
| **零依賴** | 100% Vanilla JavaScript，無任何第三方套件 |
| **9 個 BEM Block** | `dashboard`、`goal-card`、`goal-form`、`subtask`、`progress-bar`、`filter`、`modal`、`category-tag`、`settings` |
| **CSS Custom Property** | 所有設計值透過 `:root` Token 管理；進度條以 `--progress` 變數驅動動畫 |
| **ES6 Module** | 9 個模組各司其職，透過 `import` / `export` 組裝 |
| **Custom Event 通訊** | `store.js` 觸發 `stateChanged` 事件通知渲染層，模組間零耦合 |
| **統一 DOM 快取** | `dom.js` 集中管理所有元素參照，消除重複查詢 |
| **完整 JSDoc** | 所有 exported function 皆附 `@param` / `@returns` 與 `@typedef` |
| **SMART 目標萃取** | AI prompt 結合信件篩選 + SMART 原則，一次 API 呼叫完成批次分析 |
| **Prompt Injection 防護** | 信件內容清理 + XML tag 隔離 + 明確指令框架 |

---

## 設計原則

1. **單向資料流** — 狀態改變只透過 `store.js`，渲染只透過 `renderer.js`
2. **零依賴** — 不引入任何第三方函式庫或框架
3. **語義化優先** — HTML 使用正確的語義標籤，CSS 類名反映元件結構
4. **安全優先** — `.textContent` 防 XSS、CSP 限制來源、AI 回應驗證

---

## 常見問題

| 問題 | 解決方法 |
|------|----------|
| 畫面空白 | 確認以 HTTP Server 啟動，不要直接雙擊 `index.html` |
| `python` 不是內部命令 | 重新安裝 Python 並勾選「Add to PATH」 |
| Port 已被佔用 | 改用 `python -m http.server 9090`，瀏覽器開 `localhost:9090` |
| 目標資料不見了 | 可能清除了瀏覽器資料，建議定期匯出 JSON 備份 |
| 連線測試失敗 | 需填入有效的 Google Client ID |
| AI 分析失敗 | 確認 API Key 有效且額度充足 |
| JS 更新未生效 | 按 `Ctrl + Shift + R` 強制刷新瀏覽器快取 |

---

## License

MIT
