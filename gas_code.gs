const SHEET_NAME = 'Calendar';
const SPREADSHEET_ID = 'YOUR_SHEET_ID_HERE';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (!payload || !Array.isArray(payload.events)) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: '請提供 events 陣列' })).setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: `找不到工作表：${SHEET_NAME}` })).setMimeType(ContentService.MimeType.JSON);
    }

    const rows = payload.events.map((event) => [
      event.title || '',
      event.category || '',
      event.allDay ? '是' : '否',
      event.start || '',
      event.end || '',
      event.remind || '',
      event.recurring || '',
      event.description || ''
    ]);

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', saved: rows.length })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Calendar GAS').addItem('說明', 'showHelp').addToUi();
}

function showHelp() {
  SpreadsheetApp.getUi().alert('請將此 GAS 部署為 Web App，並使用 doPost 接收 JSON 事件資料。');
}
