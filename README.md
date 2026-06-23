# Ashs_cs-project

## AI 智慧行事曆 MVP

這個專案已轉換成一個前端日曆應用，具備以下功能：

- 月檢視 / 週檢視 / 日檢視
- 新增、編輯、刪除事件
- 全天事件、提醒、重複事件、顏色分類
- 從 API 匯入事件資料（`mock-events.json` 作為測試範例）
- 透過 Google Apps Script 將事件同步到 Google Sheet
- 簡易 AI 自然語言解析：新增事件、檢查衝突、查詢空閒時間、任務拆解

### 使用方式

1. 開啟 `index.html`，即可以看到新的日曆 UI。
2. 點擊「新增事件」建立事件。
3. 點擊「從 API 匯入事件」會讀取 `mock-events.json` 並自動新增事件。
4. 點擊「同步到 Google Sheet」會將現有事件傳送到 `GAS_WEBHOOK_URL`。
5. 在 AI 助手輸入框中，嘗試使用：
   - `下週三下午三點跟老師討論專題`
   - `幫我找這週空閒時間`
   - `完成資訊展專題`

### Google Apps Script 範例

請參考 `gas_code.gs`，將 `YOUR_SHEET_ID_HERE` 換成你的 Spreadsheet ID，並部署為 Web App。

---

## 專案檔案

- `index.html`：行事曆前端 UI。
- `styles.css`：樣式與排版。
- `script.js`：事件管理、檢視切換、AI 解析、API / GAS 整合。
- `mock-events.json`：API 匯入示例資料。
- `gas_code.gs`：Google Apps Script 範例程式，接收事件並寫入 Google Sheet。

### Line Notify

在右側「整合 / 通知」區塊可輸入你的 Line Notify 權杖(Token)，並按「儲存權杖」。
- 按「測試傳送通知」可嘗試立即傳送測試訊息（若瀏覽器因 CORS 阻擋，可改用 GAS 作為中繼）。
- 儲存 token 後，若事件設定了提醒（例如提前 30 分鐘），當前瀏覽器 session 會嘗試在提醒時間呼叫 Line Notify 傳送通知（此為示範，非長期後端排程）。

### AI 智慧排程

- 在 AI 助手輸入框輸入指令，例如：`幫我排 APCS、數學` 或 `排定 完成專題`，系統會嘗試在未來 7 天內找出合適空檔並自動建立任務（每項預設 60 分鐘）。
- 若 AI 嘗試建立事件時與現有事件有衝突，系統會回傳衝突提示並嘗試提供重新排程建議。

