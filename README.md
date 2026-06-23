# Ashs_cs-project

## AI 智慧行事曆 MVP

這個專案已轉換成一個前端日曆應用，具備以下功能：

- 月檢視 / 週檢視 / 日檢視
- 新增、編輯、刪除事件
- 全天事件、提醒、重複事件、顏色分類
- **透過 Google Apps Script 將事件同步到 Google Sheet（含驗證、詳細回傳格式、操作日誌）**
- 簡易 AI 自然語言解析：新增事件、檢查衝突、查詢空閒時間、任務拆解
- AI 智慧排程：多任務時段規劃與衝突建議、可編輯的排程草案、優先級與時長控制

### 使用方式

1. 開啟 `index.html`，即可看到新的日曆 UI。
2. 點擊「新增事件」建立事件。
3. 點擊「同步到 Google Sheet」會將現有事件傳送到 `GAS_WEBHOOK_URL`。
5. 在 AI 助手輸入框中，嘗試使用：
   - `下週三下午三點跟老師討論專題`
   - `幫我找這週空閒時間`
   - `完成資訊展專題`
   - `幫我排 數學(90) 社團(50)` (可指定時長)
   - `數學:高 社團:中` (指定優先級)

### Google Apps Script 設定

1. **建立 Google Sheet**：
   - 建立新的 Google Sheet
   - 複製 Spreadsheet ID（URL 中 `https://docs.google.com/spreadsheets/d/{ID}/` 的 ID 部分）
   - 編輯 `gas_code.gs`，將 `YOUR_SHEET_ID_HERE` 替換成你的 Spreadsheet ID

2. **部署 GAS Web App**：
   - 在 Google Apps Script 編輯器中複製 `gas_code.gs` 的全部程式碼
   - 點擊「部署」→「新增部署」
   - 類型選「Web 應用程式」
   - 執行身分：選 Google Workspace 帳號
   - 授予存取權的使用者：選「我」
   - 複製 Deployment ID 或最新版本網址作為 `GAS_WEBHOOK_URL`

3. **在 script.js 中設定 GAS_WEBHOOK_URL**：
   ```javascript
   const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/{YOUR_DEPLOYMENT_ID}/exec';
   ```

### 功能說明

#### 通知整合

- 本版面專注於行事曆與 AI 事件建立功能。
- 右側面板會顯示本工具為 Line AI 機器人訊息，而通知機制目前以本機行事曆提醒與 Google Sheet 同步為主。

#### AI 智慧排程

- 輸入多項任務指令：例如 `排 APCS(90) 數學 社團`
- 系統會在未來 7 天內找出合適空檔並生成排程建議
- 在草案中可編輯時長、優先級
- 按「接受並建立所有排程」確認後會：
  1. 建立事件到本地行事曆
  2. POST 到 GAS 保存到 Google Sheet
  3. 若有 Line Notify token，發送通知到 Line

#### Google Sheet 同步與日誌

- 事件會寫入 Google Sheet 的 `Calendar` 工作表
- 每次操作都會記錄到 `CalendarLog` 工作表，包括：
  - 操作時間
  - 操作類型 (saveEvents / sendLineNotify / ERROR)
  - 狀態 (success / error / exception)
  - 數據筆數
  - 詳細資訊（例如寫入行號範圍）

#### GAS 回傳格式

**成功回應** (`status: 'ok'`):
```json
{
  "status": "ok",
  "data": {
    "saved": 3,
    "rowRange": { "from": 2, "to": 4 },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**錯誤回應** (`status: 'error'`):
```json
{
  "status": "error",
  "message": "缺少 events 陣列",
  "statusCode": 400
}
```

---

## 專案檔案

- `index.html`：行事曆前端 UI（包含 AI 面板、整合設定）。
- `styles.css`：樣式與排版（含響應式設計）。
- `script.js`：事件管理、檢視切換、AI 解析、LINE Notify 中繼、API / GAS 整合（~900 行）。
- `mock-events.json`：API 匯入示例資料。
- `gas_code.gs`：Google Apps Script 後端，包含：
  - 請求驗證與錯誤處理
  - 詳細的 JSON 回傳格式
  - Line Notify 中繼功能（`sendLineNotify` action）
  - 操作日誌記錄



