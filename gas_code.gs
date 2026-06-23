const SHEET_NAME = 'Calendar';
const SPREADSHEET_ID = 'YOUR_SHEET_ID_HERE';
const LOG_SHEET_NAME = 'CalendarLog';

function initializeSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['事件標題', '分類', '全天', '開始時間', '結束時間', '提醒', '重複', '描述', '優先級', '時長(分)']);
  }
  let logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!logSheet) {
    logSheet = ss.insertSheet(LOG_SHEET_NAME);
    logSheet.appendRow(['時間', '操作類型', '狀態', '數據筆數', '詳情']);
  }
}

function logAction(actionType, status, count, details) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) initializeSheets();
    logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (logSheet) {
      logSheet.appendRow([new Date(), actionType, status, count || 0, details || '']);
    }
  } catch (e) {
    // ignore log errors
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (!payload) {
      return createErrorResponse('無效 JSON payload', 400);
    }

    // check action type
    const action = payload.action || 'saveEvents';

    if (action === 'saveEvents') {
      return handleSaveEvents(payload);
    } else if (action === 'sendLineNotify') {
      return handleLineNotify(payload);
    } else {
      return createErrorResponse(`未知操作: ${action}`, 400);
    }
  } catch (error) {
    logAction('ERROR', 'exception', 0, error.message);
    return createErrorResponse(error.message, 500);
  }
}

function handleSaveEvents(payload) {
  try {
    if (!Array.isArray(payload.events)) {
      return createErrorResponse('請提供 events 陣列', 400);
    }

    initializeSheets();
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return createErrorResponse(`找不到工作表：${SHEET_NAME}`, 404);
    }

    const lastRowBefore = sheet.getLastRow();
    const rows = payload.events.map((event) => [
      event.title || '',
      event.category || '',
      event.allDay ? '是' : '否',
      event.start || '',
      event.end || '',
      event.remind || '',
      event.recurring || '',
      event.description || '',
      event.priority || '',
      event.duration || ''
    ]);

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    const lastRowAfter = sheet.getLastRow();
    const savedCount = rows.length;
    logAction('saveEvents', 'success', savedCount, `行 ${lastRowBefore + 1} - ${lastRowAfter}`);
    return createSuccessResponse({
      saved: savedCount,
      rowRange: { from: lastRowBefore + 1, to: lastRowAfter },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logAction('saveEvents', 'error', 0, error.message);
    return createErrorResponse(error.message, 500);
  }
}

function handleLineNotify(payload) {
  try {
    if (!payload.message) {
      return createErrorResponse('缺少 message 欄位', 400);
    }
    if (!payload.lineToken) {
      return createErrorResponse('缺少 lineToken 欄位', 400);
    }

    const lineApiUrl = 'https://notify-api.line.me/api/notify';
    const params = {
      message: payload.message,
      imageFullsize: payload.imageFullsize || null,
      imageThumbnail: payload.imageThumbnail || null
    };
    const options = {
      method: 'post',
      headers: {
        Authorization: `Bearer ${payload.lineToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      payload: Object.entries(params)
        .filter(([k, v]) => v != null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&'),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(lineApiUrl, options);
    const respCode = response.getResponseCode();
    const respText = response.getContentText();

    if (respCode === 200) {
      logAction('sendLineNotify', 'success', 1, payload.message.substring(0, 100));
      return createSuccessResponse({
        notified: true,
        lineStatus: respCode,
        timestamp: new Date().toISOString()
      });
    } else {
      logAction('sendLineNotify', 'error', 0, `LINE API ${respCode}: ${respText.substring(0, 100)}`);
      return createErrorResponse(`LINE API 錯誤 ${respCode}: ${respText}`, respCode);
    }
  } catch (error) {
    logAction('sendLineNotify', 'exception', 0, error.message);
    return createErrorResponse(error.message, 500);
  }
}

function createSuccessResponse(data) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'ok', data: data })
  ).setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(message, statusCode) {
  const resp = ContentService.createTextOutput(
    JSON.stringify({ status: 'error', message: message, statusCode: statusCode })
  ).setMimeType(ContentService.MimeType.JSON);
  return resp;
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Calendar GAS')
    .addItem('說明', 'showHelp')
    .addSeparator()
    .addItem('初始化工作表', 'initializeSheets')
    .addToUi();
}

function showHelp() {
  const msg = `AI 智慧行事曆 GAS 後端

部署方式：
1. 在 Google Apps Script 中，點擊「部署」→「新增部署」→「類型」選「Web 應用程式」
2. 執行身分：選 Google Workspace 帳號
3. 授予存取權的使用者：選「我」
4. 複製「新部署 ID」或「最新版本的網址」作為 GAS_WEBHOOK_URL

設定：
- 編輯 gas_code.gs，將 SPREADSHEET_ID 設為你的 Spreadsheet ID
- 將 GAS_WEBHOOK_URL 填入 script.js

功能：
- saveEvents: 接收事件並寫入 Calendar 工作表
- sendLineNotify: 中繼 Line Notify 訊息（解決 CORS）

記錄：操作會被記入 CalendarLog 工作表`;
  SpreadsheetApp.getUi().alert(msg);
}
