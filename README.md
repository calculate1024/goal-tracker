# GoalTracker — 個人目標管理系統

> 本文件為專案開發的**最高準則**，所有功能設計、技術選型與開發節奏皆以此為依據。

---

## 1. 專案願景

### 1.1 為什麼做這個專案？

多數待辦清單只解決「今天做什麼」，卻無法回答「我離目標還有多遠」。
GoalTracker 要解決的核心問題是：**讓使用者看見每一個小行動與大目標之間的連結。**

### 1.2 產品定位

| 項目 | 說明 |
|------|------|
| 類型 | 純前端個人目標追蹤工具 |
| 使用者 | 想建立自我管理習慣的個人用戶 |
| 核心價值 | 目標拆解 → 每日行動 → 進度可視化 |
| 一句話描述 | **「把大目標拆成小步驟，每天看見自己的進步」** |

### 1.3 核心功能（MVP Scope）

| # | 功能 | 說明 | 優先級 |
|---|------|------|--------|
| F1 | 目標 CRUD | 建立、編輯、刪除目標，設定截止日期 | P0 |
| F2 | 目標分類 | 支援自訂分類標籤（如：健康、學習、財務） | P0 |
| F3 | 子任務拆解 | 每個目標可拆分為多個可勾選的子任務 | P0 |
| F4 | 進度追蹤 | 根據子任務完成比例自動計算進度百分比 | P0 |
| F5 | 進度視覺化 | 進度條 (Progress Bar) 呈現各目標完成度 | P1 |
| F6 | 篩選與排序 | 依分類 / 狀態 / 截止日篩選，依優先級排序 | P1 |
| F7 | 儀表板總覽 | 首頁顯示整體統計：進行中 / 已完成 / 逾期數量 | P1 |
| F8 | 資料持久化 | 使用 LocalStorage 保存所有資料 | P0 |
| F9 | 匯出資料 | 匯出為 JSON 檔案做備份 | P2 |
| F10 | RWD 響應式 | 支援桌面與手機瀏覽 | P1 |

> **P0** = MVP 必須完成 / **P1** = MVP 盡量完成 / **P2** = 後續迭代

### 1.4 不做的事情（Out of Scope）

- 使用者登入 / 註冊系統
- 多人協作功能
- 後端伺服器或資料庫
- 推播通知

---

## 2. 技術架構

### 2.1 技術選型

| 層級 | 技術 | 說明 |
|------|------|------|
| 結構 | HTML5 | 語義化標籤，語言設定 `zh-TW` |
| 樣式 | CSS3 | BEM 命名規範，Flexbox / Grid 排版 |
| 邏輯 | Vanilla JavaScript (ES6+) | 零框架、零依賴 |
| 儲存 | LocalStorage API | JSON 序列化 |
| 版控 | Git | 功能分支開發 |

### 2.2 專案結構

```
goal-tracker/
├── index.html              # 單一進入點（語義化 HTML5）
├── css/
│   └── style.css           # 主樣式（BEM + :root 設計 Token）
├── js/
│   ├── app.js              # 進入點：初始化與事件綁定
│   ├── store.js            # 狀態管理（SSOT）與 LocalStorage
│   ├── renderer.js         # DOM 渲染邏輯（純讀取，不改狀態）
│   ├── dom.js              # DOM 元素快取（統一 getElementById）
│   ├── gmailService.js     # 信件解析模組（Mock AI → addGoal）
│   ├── settings.js         # 設定管理（API Key 存取 + 連線測試）
│   └── utils.js            # 工具函式（日期格式化、ID 生成等）
└── README.md               # ← 本文件
```

### 2.3 資料模型

```javascript
// 單一目標 (Goal)
{
  id: "g_1738000000000",      // 唯一識別碼
  title: "學會 JavaScript",    // 目標名稱
  category: "學習",            // 分類標籤
  deadline: "2026-03-31",     // 截止日期（ISO 格式）
  status: "active",           // "active" | "completed" | "archived"
  createdAt: "2026-02-10",    // 建立時間
  subtasks: [                 // 子任務陣列
    {
      id: "s_1738000000001",
      text: "完成 DOM 操作練習",
      completed: false
    }
  ]
}

// 完整狀態 (AppState)
{
  goals: [],                  // Goal 陣列
  categories: [               // 預設分類，可自訂
    "學習", "健康", "財務", "職涯", "生活"
  ],
  currentFilter: {
    category: "all",          // 篩選分類
    status: "all"             // 篩選狀態
  },
  sortBy: "deadline"          // "deadline" | "createdAt" | "progress"
}
```

### 2.4 模組職責

```
┌─────────────────────────────────────────────┐
│                 index.html                  │
│           （結構 + 事件觸發點）                │
└──────────────────┬──────────────────────────┘
                   │
          ┌────────▼────────┐
          │     app.js      │  進入點：初始化、事件監聽、模組串接
          └──┬─────────┬────┘
             │         │
    ┌────────▼──┐  ┌───▼────────┐
    │ store.js  │  │ renderer.js│
    │           │  │            │
    │ - state   │  │ - render() │
    │ - CRUD    │◄─┤ - DOM 操作  │
    │ - save()  │  │            │
    │ - load()  │  └───┬────────┘
    └───────────┘      │
         ┌─────────────┤
    ┌────▼─────┐  ┌────▼─────┐
    │ utils.js │  │  dom.js  │  統一 DOM 元素快取
    │ 日期、ID │  │ getElementById │
    └──────────┘  └──────────┘
```

**資料流方向（單向）：**
```
使用者操作 → app.js 接收事件 → store.js 更新狀態 → renderer.js 重新渲染
```

### 2.5 命名規範

**CSS — BEM（Block Element Modifier）：**

| Block | 說明 |
|-------|------|
| `.dashboard` | 儀表板總覽區域 |
| `.goal-card` | 單一目標卡片 |
| `.goal-form` | 新增 / 編輯目標表單 |
| `.subtask` | 子任務項目 |
| `.progress-bar` | 進度條 |
| `.filter` | 篩選列 |
| `.modal` | 彈窗 |
| `.category-tag` | 分類標籤 |

命名範例：
```css
.goal-card              /* Block */
.goal-card__title       /* Element */
.goal-card__title--overdue  /* Modifier */
```

**JavaScript：**
- 函式：camelCase（`addGoal`, `renderDashboard`）
- 常數：UPPER_SNAKE_CASE（`STORAGE_KEY`, `DEFAULT_CATEGORIES`）
- DOM 元素變數：以 `el` 或語義命名（`goalList`, `modalOverlay`）

**檔案：** kebab-case（`goal-card.css`, `app.js`）

---

## 3. 開發時程（2 週）

### Phase 1 — 核心骨架（Day 1 ~ 3）

| 天 | 任務 | 對應功能 | 交付物 |
|----|------|----------|--------|
| D1 | 專案初始化、HTML 結構搭建 | — | `index.html` 完整語義結構 |
| D2 | CSS 基礎樣式 + RWD 佈局 | F10 | 響應式骨架可在手機/桌面正常顯示 |
| D3 | `store.js` + `utils.js` 建立 | F8 | 狀態管理與 LocalStorage 讀寫可運作 |

### Phase 2 — 目標管理功能（Day 4 ~ 7）

| 天 | 任務 | 對應功能 | 交付物 |
|----|------|----------|--------|
| D4 | 目標 CRUD 功能 | F1 | 可新增、編輯、刪除目標 |
| D5 | 目標分類標籤 | F2 | 可選擇 / 自訂分類標籤 |
| D6 | 子任務拆解功能 | F3 | 可在目標內新增 / 勾選子任務 |
| D7 | 進度計算邏輯 | F4 | 子任務完成比自動反映在目標上 |

### Phase 3 — 視覺化與篩選（Day 8 ~ 11）

| 天 | 任務 | 對應功能 | 交付物 |
|----|------|----------|--------|
| D8 | 進度條 UI | F5 | 動態進度條正確顯示百分比 |
| D9 | 篩選與排序 | F6 | 可依分類 / 狀態 / 截止日篩選 |
| D10 | 儀表板總覽 | F7 | 首頁顯示統計數據 |
| D11 | 元件樣式精修 | F10 | 全裝置 UI 一致性調整 |

### Phase 4 — 收尾與交付（Day 12 ~ 14）

| 天 | 任務 | 對應功能 | 交付物 |
|----|------|----------|--------|
| D12 | JSON 匯出功能 | F9 | 可匯出備份資料 |
| D13 | 整合測試 + Bug 修復 | — | 所有功能正常運作 |
| D14 | 文件補齊 + CLAUDE.md | — | 專案可交付 |

### 里程碑檢查點

```
Day 3  ✦ Milestone 1 — 骨架完成，可在瀏覽器看到空白佈局
Day 7  ✦ Milestone 2 — 核心 CRUD 可用，資料可持久化（MVP 可 Demo）
Day 11 ✦ Milestone 3 — 完整功能可用，UI 精修完成
Day 14 ✦ Milestone 4 — 專案交付，文件齊全
```

---

## 4. 設計原則

1. **單向資料流** — 狀態改變只透過 `store.js`，渲染只透過 `renderer.js`，不允許直接操作 DOM 來改資料。
2. **零依賴** — 不引入任何第三方函式庫或框架，所有功能手刻實現。
3. **漸進增強** — 先確保核心功能（P0）完整可用，再疊加增強功能（P1、P2）。
4. **語義化優先** — HTML 使用正確的語義標籤；CSS 類名反映元件結構而非外觀。

---

## 5. 如何運行

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

## 6. 資料夾結構說明

| 檔案 | 職責 | 依賴 |
|------|------|------|
| `index.html` | 語義化頁面結構，`<script type="module">` 載入 `app.js` | `css/style.css` |
| `css/style.css` | `:root` 設計 Token + BEM 樣式 + RWD 斷點 | — |
| `js/dom.js` | 統一快取所有 `getElementById` 參照，避免重複查詢 | — |
| `js/utils.js` | 純函式工具（`generateId`、`formatDate`、`isOverdue`、`todayISO`） | — |
| `js/store.js` | Single Source of Truth；狀態 CRUD + localStorage 持久化 + `stateChanged` 事件 | `utils.js` |
| `js/renderer.js` | 監聽 `stateChanged` → 渲染 Dashboard / 目標列表 / 進度條 | `store.js`、`utils.js`、`dom.js` |
| `js/app.js` | 進入點：綁定所有 UI 事件 → 呼叫 store mutation → 觸發渲染迴圈 | `store.js`、`renderer.js`、`utils.js`、`dom.js` |
| `js/gmailService.js` | 信件內文解析（Mock AI）→ 萃取 title/subtasks → 呼叫 `addGoal()` | `store.js` |
| `js/settings.js` | 敏感設定管理（Base64 編碼存入 localStorage）+ Google 連線測試 | — |

---

## 7. 技術亮點

| 亮點 | 說明 |
|------|------|
| **單向資料流** | `使用者操作 → app.js → store.js → stateChanged 事件 → renderer.js`，嚴格禁止反向操作 |
| **BEM 命名規範** | 8 個 Block（`dashboard`、`goal-card`、`goal-form`、`subtask`、`progress-bar`、`filter`、`modal`、`category-tag`），HTML / CSS / JS 三端一致 |
| **零硬編碼 CSS** | 所有設計值（色彩、間距、圓角、字級、陰影、動畫、尺寸）皆透過 `:root` Custom Property 管理 |
| **CSS Custom Property 驅動動畫** | 進度條透過 `style.setProperty("--progress", ...)` 傳值，CSS `width: var(--progress, 0%)` + `transition` 實現平滑動畫 |
| **ES6 Module 架構** | 5 個模組各司其職，透過 `import` / `export` 組裝，單一 `<script type="module">` 進入點 |
| **統一 DOM 快取** | `dom.js` 集中管理所有 `getElementById`，消除跨模組重複查詢 |
| **Custom Event 通訊** | `store.js` 透過 `window.dispatchEvent(new CustomEvent("stateChanged"))` 通知渲染層，模組間零耦合 |
| **完整 JSDoc 標註** | 所有 exported function 皆附 `@param` / `@returns`，型別定義使用 `@typedef` |
| **零依賴** | 不引入任何第三方套件，100% Vanilla JavaScript |

---

## 8. 部署指南（非技術人員版）

> 這份指南寫給不熟悉程式的朋友，只要按照步驟操作，就能把 GoalTracker 跑起來。

### 8.1 你需要準備什麼？

| 項目 | 說明 | 怎麼取得 |
|------|------|----------|
| 一台電腦 | Windows、Mac 或 Linux 皆可 | — |
| 瀏覽器 | Chrome、Edge、Firefox 任一皆可 | 電腦通常已內建 |
| Python | 用來啟動本地伺服器 | 到 [python.org](https://www.python.org/downloads/) 下載安裝，安裝時勾選「Add to PATH」 |

> **小提示：** 不確定有沒有裝 Python？打開終端機（Windows 按 `Win + R` 輸入 `cmd`），輸入 `python --version`，有看到版本號就代表已安裝。

### 8.2 下載專案

**方法 A：直接下載（最簡單）**

1. 用瀏覽器打開 https://github.com/calculate1024/goal-tracker
2. 點綠色的 **「Code」** 按鈕 → 選 **「Download ZIP」**
3. 把下載的 ZIP 檔解壓縮到任意資料夾（例如桌面）

**方法 B：用 Git 下載**

打開終端機，輸入：

```
git clone https://github.com/calculate1024/goal-tracker.git
```

### 8.3 啟動應用程式

1. 打開終端機（Windows: `cmd`；Mac: `終端機`）
2. 用 `cd` 指令進入專案資料夾，例如：
   ```
   cd Desktop/goal-tracker
   ```
3. 輸入以下指令啟動伺服器：
   ```
   python -m http.server 8080
   ```
4. 看到 `Serving HTTP on 0.0.0.0 port 8080` 就代表成功了
5. 打開瀏覽器，在網址列輸入：
   ```
   http://localhost:8080
   ```
6. 你應該會看到 GoalTracker 的畫面！

> **注意：** 請不要關閉終端機視窗，關閉的話伺服器就會停止。想停止時按 `Ctrl + C`。

### 8.4 開始使用

| 操作 | 怎麼做 |
|------|--------|
| 新增目標 | 點「**+ 新增目標**」按鈕，填寫名稱、分類、截止日和子任務後按「儲存」 |
| 勾選子任務 | 打勾 checkbox，進度條會自動更新 |
| 完成目標 | 點目標卡片右上角的 **✓** 按鈕 |
| 編輯目標 | 點 **✎** 按鈕 |
| 刪除目標 | 點 **✕** 按鈕，確認後刪除 |
| 篩選 | 用頂部的下拉選單依分類或狀態篩選 |
| 排序 | 用右側下拉選單依截止日、建立日或進度排序 |
| 備份資料 | 點頁面底部「**匯出 JSON 備份**」，會下載一個 `.json` 檔案 |
| 設定 | 點右上角 **⚙** 齒輪圖示，可設定 Google Client ID 和 AI API Key |

### 8.5 資料存在哪裡？

你的所有目標資料都存在**瀏覽器的 localStorage** 裡，也就是存在你自己的電腦上。

- **不會上傳到任何伺服器** — 你的資料完全屬於你
- **換瀏覽器或清除瀏覽器資料會遺失** — 建議定期用「匯出 JSON 備份」保存
- **不同電腦之間不會同步** — 這是單機版應用程式

### 8.6 常見問題

| 問題 | 解決方法 |
|------|----------|
| 畫面空白，什麼都沒出現 | 確認你是用 `python -m http.server` 啟動，而不是直接雙擊 `index.html` 開啟 |
| 終端機顯示「python 不是內部或外部命令」 | Python 沒安裝或沒加入 PATH，請重新安裝並勾選「Add to PATH」 |
| Port 8080 已被佔用 | 把指令改成 `python -m http.server 9090`，然後瀏覽器改開 `http://localhost:9090` |
| 之前的目標不見了 | 可能清除了瀏覽器資料，未來建議定期匯出 JSON 備份 |
| 齒輪設定裡的連線測試失敗 | 這是正常的，需要先取得有效的 Google Client ID 才能通過測試 |
