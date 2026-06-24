# 期末專題 - AI 智慧行事曆

這個專案是一個具備高度整合性的前端日曆應用，無須架設任何傳統後端伺服器 (Serverless)，完全依賴 Google Apps Script (GAS) 串接 LINE Bot 與 Gemini AI，並將 Google Sheet作為雲端資料庫。

## 🚀 核心新功能 (最新改版)

這個專案已轉換成一個前端日曆應用，具備以下功能：

- 月檢視 / 週檢視 / 日檢視
- 新增、編輯、刪除事件
- 全天事件、提醒、重複事件、顏色分類
- **透過 Google Apps Script 將事件同步到 Google Sheet（含驗證、詳細回傳格式、操作日誌）**
- 簡易 AI 自然語言解析：新增事件、檢查衝突、查詢空閒時間、任務拆解
- AI 智慧排程：多任務時段規劃與衝突建議、可編輯的排程草案、優先級與時長控制
- **無伺服器架構 (Serverless)**：捨棄傳統 Flask 後端，完全使用 GAS 處理 Webhook，部署超簡單。
- **LINE Bot 完美整合**：使用者直接用 LINE 傳送自然語言訊息，系統自動解析並建立行程。
- **Gemini AI 智慧大腦**：
  - 精準將口語化文字（如「明天早上十點開會」）轉換為標準時間格式。
  - **超強擴充**：AI 會根據行程自動推算並產生「預估天氣」與「預估交通時間」。
  - 具備閒聊模式，非行程訊息會自動以人性化口吻回覆。
- **網頁端即時自動同步**：前端行事曆每 3 秒自動向雲端討資料，LINE 傳送行程後，網頁無須重新整理即可自動顯示 (Polling)。
- **完整日曆 UI**：支援月/週/日檢視、全天事件、顏色分類、時間區間設定。

---

## 🛠️ 系統架構

1. **使用者**在 LINE Bot 輸入自然語言 (如：「幫我記一下明天下午三點跟老師討論專題」)。
2. **LINE Platform** 觸發 Webhook，傳送資料給 Google Apps Script (GAS)。
3. **GAS** 攔截訊息，呼叫 **Gemini 1.5 Flash API** 進行語意解析，產出 JSON 格式行程 (包含天氣與交通)。
4. **GAS** 將解析完的資料寫入 **Google Sheet** (雲端資料庫)，並回傳成功訊息給 LINE 使用者。
5. **前端網頁 (`index.html`)** 每 3 秒自動呼叫 GAS (`doGet`)，抓取最新資料並渲染到畫面上。

---

## 📖 快速部署教學

### 1. 建立 Google Sheet 資料庫
- 新建一個 Google 試算表，命名為「AI智慧行事曆資料庫」。
- 紀錄你的 Spreadsheet ID (URL 中 `d/` 和 `/edit` 中間的那串)。

### 2. 準備金鑰 (API Keys)
- **LINE Messaging API**: 至 LINE Developers 取得 `Channel Access Token`。
- **Gemini API**: 至 Google AI Studio 免費取得 `API Key`。

### 3. 部署 Google Apps Script (後端)
- 在 Google Drive 新增一個 Google Apps Script 專案。
- 將專案內的程式碼替換為包含 `doGet` (讀取) 與 `doPost` (寫入與 AI 處理) 的完整程式碼。
- 填入你的 `CHANNEL_ACCESS_TOKEN`、`SPREADSHEET_ID` 與 `GEMINI_API_KEY`。
- 點擊「部署」→「建立新版本」，權限設定為「所有人 (Anyone)」。
- 複製發布後的 Web 應用程式網址 (`/exec` 結尾)。

### 4. 設定 LINE Webhook
- 將剛剛複製的 GAS 網址貼入 LINE Developers 的 Webhook URL 並啟用。
- 關閉 LINE 官方帳號設定中的「自動回應訊息」與「錯誤重試 (Webhook error retry)」。

### 5. 綁定前端網頁
- 開啟 `script.js`，將最上方的 `GAS_WEBHOOK_URL` 替換為你的 GAS 部署網址。
- 使用瀏覽器開啟 `index.html` 即可開始使用！

---

## 📂 專案檔案說明

- `index.html`：行事曆前端 UI 介面。
- `styles.css`：樣式與排版（支援響應式設計）。
- `script.js`：前端核心邏輯，負責事件渲染、檢視切換、以及與 GAS 進行資料同步 (`fetch`)。
- `gas_code.gs` (或部署在雲端的程式碼)：GAS 後端大腦，處理 LINE Webhook、對接 Gemini AI 以及 Google Sheet 讀寫。
