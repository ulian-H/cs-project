const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
const CATEGORY_COLOR_KEYS = ['blue', 'red', 'green', 'orange', 'purple', 'teal', 'pink', 'lime', 'indigo', 'gray'];
const CATEGORY_KEY_TO_LABEL = {
  blue: '藍色',
  red: '紅色',
  green: '綠色',
  orange: '橘色',
  purple: '紫色',
  teal: '青色',
  pink: '粉色',
  lime: '黃綠',
  indigo: '靛藍',
  gray: '灰色'
};
const LEGACY_CATEGORY_NAME_TO_KEY = {
  藍色: 'blue',
  紅色: 'red',
  綠色: 'green',
  橘色: 'orange',
  紫色: 'purple',
  青色: 'teal',
  粉色: 'pink',
  黃綠: 'lime',
  靛藍: 'indigo',
  灰色: 'gray',
  學校: 'blue',
  APCS: 'red',
  社團: 'green',
  私事: 'orange'
};
const DEFAULT_CATEGORY_LABELS = ['藍色', '紅色', '綠色', '橘色', '紫色', '青色', '粉色', '黃綠', '靛藍', '灰色'];

const state = {
  view: 'month',
  currentDate: new Date(),
  events: [],
  editingEventId: null,
  categoryLabels: []
};

const dom = {};

document.addEventListener('DOMContentLoaded', () => {
  dom.calendarGrid = document.getElementById('calendar-grid');
  dom.calendarList = document.getElementById('calendar-list');
  dom.currentPeriod = document.getElementById('current-period');
  dom.summaryPanel = document.getElementById('summary-panel');
  dom.aiInput = document.getElementById('ai-input');
  dom.aiResponse = document.getElementById('ai-response');
  dom.eventModal = document.getElementById('event-modal');
  dom.eventForm = document.getElementById('event-form');
  dom.eventTitle = document.getElementById('event-title');
  dom.eventDate = document.getElementById('event-date');
  dom.eventStart = document.getElementById('event-start');
  dom.eventEnd = document.getElementById('event-end');
  dom.eventAllDay = document.getElementById('event-all-day');
  dom.eventCategory = document.getElementById('event-category');
  dom.categoryList = document.getElementById('category-list');
  dom.eventRemind = document.getElementById('event-remind');
  dom.eventRecurring = document.getElementById('event-recurring');
  dom.eventDesc = document.getElementById('event-desc');
  dom.eventMessage = document.getElementById('event-message');
  dom.saveEventBtn = document.getElementById('save-event-btn');
  dom.deleteEventBtn = document.getElementById('delete-event-btn');

  document.getElementById('prev-btn').addEventListener('click', goPrevious);
  document.getElementById('next-btn').addEventListener('click', goNext);
  document.getElementById('open-event-btn').addEventListener('click', () => openEventModal());
  document.getElementById('sync-sheet-btn').addEventListener('click', syncAllEventsToSheet);
  document.getElementById('close-modal-btn').addEventListener('click', closeEventModal);
  dom.saveEventBtn.addEventListener('click', saveEventFromForm);
  dom.deleteEventBtn.addEventListener('click', deleteEventFromForm);
  document.getElementById('ai-action-btn').addEventListener('click', handleAiCommand);
  document.querySelectorAll('.view-btn').forEach((btn) => btn.addEventListener('click', switchView));
  dom.eventAllDay.addEventListener('change', toggleAllDay);

  // AI controls
  dom.aiDuration = document.getElementById('ai-duration');
  dom.aiPriority = document.getElementById('ai-priority');
  dom.aiDraftToggle = document.getElementById('ai-draft-toggle');
  dom.aiDraft = document.getElementById('ai-draft');

  // auto-fill example buttons
  const autoWeatherBtn = document.getElementById('auto-weather-btn');
  const autoGmailBtn = document.getElementById('auto-gmail-btn');
  const autoTransportBtn = document.getElementById('auto-transport-btn');
  if (autoWeatherBtn) autoWeatherBtn.addEventListener('click', demoAutoFillWeather);
  if (autoGmailBtn) autoGmailBtn.addEventListener('click', demoAutoFillGmail);
  if (autoTransportBtn) autoTransportBtn.addEventListener('click', demoAutoFillTransport);

  // Integration / notification controls (Google sign-in & Email)
  dom.googleSignInBtn = document.getElementById('google-signin-btn');
  dom.googleSignOutBtn = document.getElementById('google-signout-btn');
  dom.userInfo = document.getElementById('user-info');
  dom.notifyEmail = document.getElementById('notify-email');
  dom.testEmailBtn = document.getElementById('test-email-btn');
  if (dom.googleSignInBtn) dom.googleSignInBtn.addEventListener('click', () => signInWithGoogle());
  if (dom.googleSignOutBtn) dom.googleSignOutBtn.addEventListener('click', () => signOutGoogle());
  if (dom.testEmailBtn) dom.testEmailBtn.addEventListener('click', async () => {
    const email = dom.notifyEmail ? dom.notifyEmail.value.trim() : '';
    if (!email) {
      if (dom.userInfo) dom.userInfo.textContent = '請先輸入通知 Email。';
      return;
    }
    if (dom.userInfo) dom.userInfo.textContent = '正在嘗試寄送測試通知...';
    try {
      await sendEmailNotification(email, '測試通知：AI 行事曆', '這是一封測試通知，系統設定完成後會改為自動傳送。');
      if (dom.userInfo) dom.userInfo.textContent = '測試通知已發送（若使用 mailto，請檢查郵件客戶端）。';
    } catch (e) {
      if (dom.userInfo) dom.userInfo.textContent = `測試通知失敗：${e.message}`;
    }
  });

  state.categoryLabels = loadCategoryLabels();
  renderCategoryPanel();
  updateCategoryOptions();
  state.events = getInitialEvents();
  render();
  scheduleAllSessionReminders();
});

function getInitialEvents() {
  return [
    { id: 1, title: 'APCS 練習', start: '2026-07-20T10:00', end: '2026-07-20T11:30', allDay: false, category: '紅色', remind: '30', recurring: 'weekly', description: '每週二課後練習。' },
    { id: 2, title: '社團 meeting', start: '2026-07-21T18:30', end: '2026-07-21T20:00', allDay: false, category: '綠色', remind: '1440', recurring: 'none', description: '討論專題進度。' },
    { id: 3, title: '期中考準備', start: '2026-07-22T00:00', end: '2026-07-22T23:59', allDay: true, category: '藍色', remind: '1440', recurring: 'none', description: '全天讀書計畫。' }
  ];
}

function render() {
  updateViewButtons();
  renderHeader();
  if (state.view === 'month') renderMonthView();
  else if (state.view === 'week') renderWeekView();
  else renderDayView();
  renderSummary();
}

function updateViewButtons() {
  document.querySelectorAll('.view-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === state.view);
  });
}

function renderHeader() {
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const date = state.currentDate;
  if (state.view === 'month') {
    dom.currentPeriod.textContent = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  } else if (state.view === 'week') {
    const weekStart = getStartOfWeek(date);
    const weekEnd = addDays(weekStart, 6);
    dom.currentPeriod.textContent = `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;
  } else {
    dom.currentPeriod.textContent = formatShortDate(date);
  }
}

function renderMonthView() {
  dom.calendarList.classList.add('hidden');
  dom.calendarGrid.classList.remove('hidden');
  dom.calendarGrid.innerHTML = '';

  const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  dayLabels.forEach((label) => {
    const cell = document.createElement('div');
    cell.className = 'day-label';
    cell.textContent = label;
    dom.calendarGrid.appendChild(cell);
  });

  const firstDay = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
  const lastDay = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1, 0);
  const startOffset = firstDay.getDay();
  const cells = startOffset + lastDay.getDate();
  const totalCells = Math.ceil(cells / 7) * 7;
  const startDate = addDays(firstDay, -startOffset);
  const rangeEvents = getEventsInRange(startDate, addDays(startDate, totalCells - 1));

  for (let i = 0; i < totalCells; i += 1) {
    const date = addDays(startDate, i);
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (date.getMonth() !== state.currentDate.getMonth()) cell.classList.add('empty');
    if (isSameDate(date, new Date())) cell.classList.add('today');
    const number = document.createElement('div');
    number.className = 'day-number';
    number.textContent = date.getDate();
    if (isSameDate(date, state.currentDate)) number.classList.add('current');
    cell.appendChild(number);

    const events = rangeEvents.filter((event) => isSameDate(parseISO(event.start), date));
    events.slice(0, 3).forEach((event) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `event-chip ${getCategoryClass(event.category) || ''}`;
      chip.textContent = `${formatEventTime(event)} ${event.title}`;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        openEventModal(date, event.id);
      });
      cell.appendChild(chip);
    });

    if (events.length > 3) {
      const more = document.createElement('div');
      more.className = 'day-more';
      more.textContent = `還有 ${events.length - 3} 項`;
      cell.appendChild(more);
    }

    cell.addEventListener('click', () => openEventModal(date));
    dom.calendarGrid.appendChild(cell);
  }
}

function renderWeekView() {
  dom.calendarGrid.classList.add('hidden');
  dom.calendarList.classList.remove('hidden');
  dom.calendarList.innerHTML = '';

  const weekStart = getStartOfWeek(state.currentDate);
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(weekStart, i);
    const dayEvents = getEventsInRange(date, date).sort((a, b) => parseISO(a.start) - parseISO(b.start));
    const card = document.createElement('div');
    card.className = 'event-card';
    const title = document.createElement('h3');
    title.textContent = `${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]} ${formatShortDate(date)}`;
    card.appendChild(title);
    if (!dayEvents.length) {
      const empty = document.createElement('p');
      empty.textContent = '今天沒有事件，點擊新增。';
      card.appendChild(empty);
    } else {
      dayEvents.forEach((event) => {
        card.appendChild(createEventSummary(event));
      });
    }
    card.addEventListener('click', () => openEventModal(date));
    dom.calendarList.appendChild(card);
  }
}

function renderDayView() {
  dom.calendarGrid.classList.add('hidden');
  dom.calendarList.classList.remove('hidden');
  dom.calendarList.innerHTML = '';

  const date = state.currentDate;
  const dayEvents = getEventsInRange(date, date).sort((a, b) => parseISO(a.start) - parseISO(b.start));
  const card = document.createElement('div');
  card.className = 'event-card';
  const title = document.createElement('h3');
  title.textContent = `日檢視 ${formatShortDate(date)}`;
  card.appendChild(title);
  if (!dayEvents.length) {
    const empty = document.createElement('p');
    empty.textContent = '今天沒有事件，使用右上角新增事件。';
    card.appendChild(empty);
  } else {
    dayEvents.forEach((event) => {
      card.appendChild(createEventSummary(event));
    });
  }
  dom.calendarList.appendChild(card);
}

function createEventSummary(event) {
  const container = document.createElement('div');
  container.className = 'event-summary';
  container.style.padding = '10px 0';
  container.style.borderBottom = '1px solid var(--border)';
  const heading = document.createElement('h3');
  heading.textContent = `${event.title}`;
  heading.style.margin = '0 0 4px 0';
  const meta = document.createElement('small');
  meta.textContent = `${formatEventTime(event)} · ${event.category} ${event.recurring !== 'none' ? `· ${event.recurring}` : ''}`;
  const desc = document.createElement('p');
  desc.textContent = event.description || '無說明。';
  desc.style.margin = '6px 0 0 0';
  container.appendChild(heading);
  container.appendChild(meta);
  container.appendChild(desc);
  container.addEventListener('click', () => openEventModal(parseISO(event.start), event.id));
  return container;
}

function formatEventTime(event) {
  if (event.allDay) return '全天';
  return `${toTimeString(event.start)} - ${toTimeString(event.end)}`;
}

function loadCategoryLabels() {
  try {
    const raw = localStorage.getItem('calendar_category_labels');
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length === CATEGORY_COLOR_KEYS.length) {
      return parsed.map((label, index) => label || DEFAULT_CATEGORY_LABELS[index]);
    }
  } catch (e) {
    console.warn('載入分類標籤失敗', e);
  }
  return [...DEFAULT_CATEGORY_LABELS];
}

function saveCategoryLabels() {
  localStorage.setItem('calendar_category_labels', JSON.stringify(state.categoryLabels));
}

function getCategoryClass(category) {
  if (!category) return '';
  if (LEGACY_CATEGORY_NAME_TO_KEY[category]) return LEGACY_CATEGORY_NAME_TO_KEY[category];
  const index = state.categoryLabels.indexOf(category);
  if (index !== -1) return CATEGORY_COLOR_KEYS[index];
  const lowerCategory = category.toLowerCase();
  if (CATEGORY_COLOR_KEYS.includes(lowerCategory)) return lowerCategory;
  return '';
}

function renderCategoryPanel() {
  if (!dom.categoryList) return;
  dom.categoryList.innerHTML = '';
  state.categoryLabels.forEach((label, index) => {
    const li = document.createElement('li');
    li.className = 'category-item';
    const chip = document.createElement('span');
    chip.className = `chip ${CATEGORY_COLOR_KEYS[index]}`;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = label;
    input.dataset.index = String(index);
    input.className = 'category-input';
    input.addEventListener('input', (e) => {
      const idx = Number(e.target.dataset.index);
      const value = e.target.value.trim() || DEFAULT_CATEGORY_LABELS[idx];
      state.categoryLabels[idx] = value;
      saveCategoryLabels();
      updateCategoryOptions();
      render();
    });
    li.appendChild(chip);
    li.appendChild(input);
    dom.categoryList.appendChild(li);
  });
}

function updateCategoryOptions() {
  if (!dom.eventCategory) return;
  dom.eventCategory.innerHTML = '';
  state.categoryLabels.forEach((label, index) => {
    const opt = document.createElement('option');
    opt.value = label;
    opt.textContent = label;
    opt.dataset.key = CATEGORY_COLOR_KEYS[index];
    dom.eventCategory.appendChild(opt);
  });
}

function renderSummary() {
  const date = state.currentDate;
  const todayEvents = getEventsInRange(date, date).sort((a, b) => parseISO(a.start) - parseISO(b.start));
  if (!todayEvents.length) {
    dom.summaryPanel.textContent = '';
    return;
  }
  const lines = todayEvents.map((event) => {
    return `${formatEventTime(event)} · ${event.category} · ${event.title}`;
  });
  dom.summaryPanel.innerHTML = `<strong>今日 ${todayEvents.length} 項事件</strong><br>${lines.join('<br>')}`;
}

function switchView(event) {
  state.view = event.currentTarget.dataset.view;
  render();
}

function goPrevious() {
  if (state.view === 'month') state.currentDate = addMonths(state.currentDate, -1);
  else state.currentDate = addDays(state.currentDate, -7);
  render();
}

function goNext() {
  if (state.view === 'month') state.currentDate = addMonths(state.currentDate, 1);
  else state.currentDate = addDays(state.currentDate, 7);
  render();
}

function openEventModal(date = new Date(), eventId = null) {
  state.editingEventId = null;
  dom.eventMessage.textContent = '';
  dom.eventForm.reset();
  dom.eventAllDay.checked = false;
  toggleAllDay();

  const selectedDate = date instanceof Date ? date : new Date(date);
  const iso = selectedDate.toISOString().slice(0, 10);
  dom.eventDate.value = iso;
  dom.eventStart.value = '14:00';
  dom.eventEnd.value = '15:00';

  if (eventId != null) {
    const event = state.events.find((item) => item.id === eventId);
    if (event) {
      state.editingEventId = event.id;
      dom.eventTitle.value = event.title;
      dom.eventDate.value = event.start.slice(0, 10);
      dom.eventStart.value = event.allDay ? '' : event.start.slice(11, 16);
      dom.eventEnd.value = event.allDay ? '' : event.end.slice(11, 16);
      dom.eventAllDay.checked = event.allDay;
      dom.eventCategory.value = event.category;
      dom.eventRemind.value = event.remind;
      dom.eventRecurring.value = event.recurring || 'none';
      dom.eventDesc.value = event.description;
      dom.deleteEventBtn.classList.remove('hidden');
    }
  } else {
    dom.deleteEventBtn.classList.add('hidden');
  }
  toggleAllDay();
  dom.eventModal.classList.remove('hidden');
  dom.eventModal.setAttribute('aria-hidden', 'false');
}

function closeEventModal() {
  dom.eventModal.classList.add('hidden');
  dom.eventModal.setAttribute('aria-hidden', 'true');
}

function toggleAllDay() {
  const allDay = dom.eventAllDay.checked;
  dom.eventStart.disabled = allDay;
  dom.eventEnd.disabled = allDay;
}

function saveEventFromForm() {
  const title = dom.eventTitle.value.trim();
  const date = dom.eventDate.value;
  const start = dom.eventStart.value;
  const end = dom.eventEnd.value;
  const allDay = dom.eventAllDay.checked;
  const category = dom.eventCategory.value;
  const remind = dom.eventRemind.value;
  const recurring = dom.eventRecurring.value;
  const description = dom.eventDesc.value.trim();

  if (!title || !date) {
    dom.eventMessage.textContent = '請填寫標題和日期。';
    return;
  }
  if (!allDay && (!start || !end)) {
    dom.eventMessage.textContent = '請填寫開始與結束時間，或選擇全天事件。';
    return;
  }
  const startDateTime = allDay ? `${date}T00:00` : `${date}T${start}`;
  const endDateTime = allDay ? `${date}T23:59` : `${date}T${end}`;
  const newEvent = {
    id: state.editingEventId || Date.now(),
    title,
    start: startDateTime,
    end: endDateTime,
    allDay,
    category,
    remind,
    recurring: recurring || 'none',
    description,
  };

  const conflict = getConflict(newEvent);
  if (conflict) {
    const suggestion = suggestReschedule(newEvent) || suggestReschedule(conflict);
    let msg = `時間衝突：與「${conflict.title}」重疊。請調整時間或保留兩者。`;
    if (suggestion) {
      msg += ` 建議改到 ${formatShortDate(suggestion.start)} ${String(suggestion.start.getHours()).padStart(2,'0')}:${String(suggestion.start.getMinutes()).padStart(2,'0')}`;
    }
    dom.eventMessage.textContent = msg;
    return;
  }

  if (state.editingEventId) {
    state.events = state.events.map((item) => (item.id === state.editingEventId ? newEvent : item));
  } else {
    state.events.push(newEvent);
  }
  // schedule a session reminder when created/updated
  scheduleReminderForEvent(newEvent);
  closeEventModal();
  render();
}

function deleteEventFromForm() {
  if (!state.editingEventId) return;
  state.events = state.events.filter((item) => item.id !== state.editingEventId);
  closeEventModal();
  render();
}



function syncAllEventsToSheet() {
  dom.aiResponse.textContent = '正在同步事件到 Google Sheet…';
  fetch(GAS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'saveEvents', events: state.events }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.status === 'ok') {
        const data = result.data || {};
        const rowInfo = data.rowRange ? ` (行 ${data.rowRange.from} - ${data.rowRange.to})` : '';
        dom.aiResponse.textContent = `✓ 已同步 ${data.saved || state.events.length} 筆事件至 Google Sheet${rowInfo}。`;
      } else {
        throw new Error(result.message);
      }
    })
    .catch((error) => {
      dom.aiResponse.textContent = `同步失敗：${error.message}。請確認 GAS 網址與 SPREADSHEET_ID 設定。`;
    });
}

function handleAiCommand() {
  const text = dom.aiInput.value.trim();
  if (!text) {
    dom.aiResponse.textContent = '請輸入自然語言指令，例如「下週三下午三點跟老師討論專題」。';
    return;
  }
  // detect scheduling intent
  if (/幫我排|排定|安排/.test(text)) {
    const defaultDur = Number(dom.aiDuration.value) || 60;
    const defaultPriority = dom.aiPriority.value || '中';
    const draftMode = !!dom.aiDraftToggle.checked;
    const result = aiScheduleTasks(text, { defaultDuration: defaultDur, defaultPriority, draftMode });
    if (draftMode && Array.isArray(result)) {
      renderScheduleDraft(result);
      dom.aiResponse.textContent = `已產生 ${result.length} 筆排程草案，請在下方檢視並接受或編輯。`;
    } else {
      dom.aiResponse.textContent = result;
    }
    return;
  }
  const normalized = text.replace(/，/g, ',').replace(/。/g, '.');
  if (/(空閒|空檔)/.test(normalized)) {
    dom.aiResponse.textContent = getFreeTimeSummary();
    return;
  }
  if (/完成.*(專題|作業|任務)/.test(normalized)) {
    dom.aiResponse.textContent = getTaskBreakdown(normalized);
    return;
  }
  const event = parseNaturalLanguageEvent(normalized);
  if (event) {
    const conflict = getConflict(event);
    if (conflict) {
      const suggestion = suggestReschedule(event) || suggestReschedule(conflict);
      let msg = `發現衝突：與「${conflict.title}」重疊，請調整時間。`;
      if (suggestion) {
        msg += ` 建議改到 ${formatShortDate(suggestion.start)} ${String(suggestion.start.getHours()).padStart(2,'0')}:${String(suggestion.start.getMinutes()).padStart(2,'0')}`;
      }
      dom.aiResponse.textContent = msg;
      return;
    }
    state.events.push(event);
    dom.aiInput.value = '';
    render();
    scheduleReminderForEvent(event);
    dom.aiResponse.textContent = `已新增事件：「${event.title}」 ${formatEventTime(event)}。`;
    return;
  }
  dom.aiResponse.textContent = '無法解析指令，請使用「下週三下午三點跟老師討論專題」或「幫我找這週空閒時間」。';
}

function parseNaturalLanguageEvent(text) {
  const date = parseDateToken(text);
  const time = parseTimeToken(text);
  if (!date) return null;
  const title = text
    .replace(/(下週|下禮拜|下星期|明天|後天|今天|星期[一二三四五六日天]|周[一二三四五六日]|[0-9]{1,2}月[0-9]{1,2}日|[0-9]{1,2}月|[0-9]{1,2}號|[0-9]{1,2}日|[0-9]{1,2}[/\-][0-9]{1,2}|上午|下午|晚[上間]|早上|中午|晚上|凌晨|點|時|:|分|半)/g, '')
    .replace(/跟|和|與/g, ' ')
    .replace(/\b(要|想|我|今天|明天|後天|下週|下禮拜|上午|下午|晚上|早上)\b/g, '')
    .replace(/\b(完成|討論|安排|準備)\b/g, ' ')
    .trim();
  const titleText = title || '新事件';
  const start = `${formatISODate(date)}T${time || '15:00'}`;
  const end = `${formatISODate(date)}T${time ? addMinutesToTime(time, 60) : '16:00'}`;
  return {
    id: Date.now(),
    title: titleText,
    start,
    end,
    allDay: !time,
    category: '私事',
    remind: '30',
    recurring: 'none',
    description: 'AI 自然語言新增事件。',
  };
}

function parseDateToken(text) {
  if (/今天/.test(text)) return new Date();
  if (/明天/.test(text)) return addDays(new Date(), 1);
  if (/後天/.test(text)) return addDays(new Date(), 2);
  const weekMap = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
  const matchWeek = text.match(/下(?:週|禮拜|星期|周)([一二三四五六日天])/);
  if (matchWeek) return getNextWeekday(weekMap[matchWeek[1]]);
  const matchDate = text.match(/([0-9]{1,2})月([0-9]{1,2})(?:日|號)?/);
  if (matchDate) {
    const year = new Date().getFullYear();
    return new Date(year, Number(matchDate[1]) - 1, Number(matchDate[2]));
  }
  const matchSlash = text.match(/([0-9]{1,2})[\/\-]([0-9]{1,2})/);
  if (matchSlash) {
    const year = new Date().getFullYear();
    return new Date(year, Number(matchSlash[1]) - 1, Number(matchSlash[2]));
  }
  return new Date();
}

function parseTimeToken(text) {
  const match = text.match(/(凌晨|早上|上午|中午|下午|晚上)?\s*([0-9]{1,2})(?:[:時點]?([0-9]{1,2}))?/);
  if (!match) return null;
  let [, period, hour, minute] = match;
  hour = Number(hour);
  minute = minute ? Number(minute) : 0;
  if (/下午|晚上/.test(period) && hour < 12) hour += 12;
  if (/中午/.test(period) && hour === 12) hour = 12;
  if (/凌晨/.test(period) && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getTaskBreakdown(text) {
  const titleMatch = text.match(/完成(.*)/);
  const title = titleMatch ? titleMatch[1].trim() : text;
  const tasks = title
    .split(/[,，、和與]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((task, index) => `${index + 1}. ${task}`);
  if (!tasks.length) return '已完成任務拆解：1. 需求分析 2. 系統設計 3. 開發 4. 測試。';
  return `已拆解任務：\n${tasks.join('\n')}\n建議將它們分配到本週空閒時段。`;
}

function getFreeTimeSummary() {
  const today = new Date();
  const windows = [];
  for (let dayOffset = 0; dayOffset < 4; dayOffset += 1) {
    const date = addDays(today, dayOffset);
    const events = getEventsInRange(date, date).sort((a, b) => parseISO(a.start) - parseISO(b.start));
    const blocks = [];
    let lastEnd = new Date(date);
    lastEnd.setHours(8, 0, 0, 0);
    events.forEach((event) => {
      const start = parseISO(event.start);
      if (start > lastEnd) {
        blocks.push(`${formatShortDate(date)} ${toTimeString(lastEnd.toISOString())} - ${toTimeString(event.start)}`);
      }
      lastEnd = parseISO(event.end);
    });
    const endOfDay = new Date(date);
    endOfDay.setHours(22, 0, 0, 0);
    if (lastEnd < endOfDay) {
      blocks.push(`${formatShortDate(date)} ${toTimeString(lastEnd.toISOString())} - 22:00`);
    }
    if (blocks.length) windows.push(...blocks.slice(0, 2));
  }
  return windows.length
    ? `本週可用時間：\n${windows.join('\n')}`
    : '本週時間已滿，建議調整或重新排程。';
}

function getConflict(event) {
  return state.events.find((item) => {
    if (item.id === event.id) return false;
    const startA = parseISO(item.start);
    const endA = parseISO(item.end);
    const startB = parseISO(event.start);
    const endB = parseISO(event.end);
    if (!isSameDate(startA, startB)) return false;
    return startA < endB && startB < endA;
  });
}

function getEventsInRange(rangeStart, rangeEnd) {
  return state.events.flatMap((event) => getOccurrences(event, rangeStart, rangeEnd));
}

function getOccurrences(event, rangeStart, rangeEnd) {
  const eventStart = parseISO(event.start);
  const eventEnd = parseISO(event.end);
  if (event.recurring === 'none') return [event];
  const occurrences = [];
  let currentStart = new Date(eventStart);
  let currentEnd = new Date(eventEnd);
  const limit = 30;
  const step = event.recurring === 'daily' ? 1 : event.recurring === 'weekly' ? 7 : 30;
  for (let i = 0; i < limit; i += 1) {
    if (currentEnd < rangeStart) {
      currentStart = addDays(currentStart, step);
      currentEnd = addDays(currentEnd, step);
      continue;
    }
    if (currentStart > rangeEnd) break;
    occurrences.push({ ...event, start: currentStart.toISOString().slice(0, 16), end: currentEnd.toISOString().slice(0, 16) });
    currentStart = addDays(currentStart, step);
    currentEnd = addDays(currentEnd, step);
  }
  return occurrences;
}

function getStartOfWeek(date) {
  const result = new Date(date);
  result.setDate(date.getDate() - date.getDay());
  return result;
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function parseISO(value) {
  return new Date(value);
}

function formatShortDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toTimeString(value) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function addMinutesToTime(time, minutes) {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute + minutes, 0, 0);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getNextWeekday(targetDay) {
  const today = new Date();
  const diff = (targetDay + 7 - today.getDay() + 7) % 7 || 7;
  return addDays(today, diff + 7);
}


// --------- Auto-fill demo functions (mock examples) ---------
async function demoAutoFillWeather() {
  dom.aiResponse.textContent = '呼叫天氣 API（模擬）…';
  // demo: fetch mock weather from mock-events.json or create a fake response
  const fake = { date: formatISODate(addDays(new Date(), 2)), weather: '雨天' };
  const note = `⚠ 預測有雨，建議攜帶雨具`;
  const ev = {
    id: Date.now(),
    title: `外出：天氣提醒 ${fake.weather}`,
    start: `${fake.date}T09:00`,
    end: `${fake.date}T18:00`,
    allDay: false,
    category: '橘色',
    remind: '60',
    recurring: 'none',
    description: note,
  };
  state.events.push(ev);
  dom.aiResponse.textContent = `已根據天氣建立事件：${fake.date} ${note}`;
  render();
}

async function demoAutoFillTimetable() {
  // 已移除：請在後端串接學校課表 API，或使用 Google Classroom / Google Calendar 直接同步。
  dom.aiResponse.textContent = '課表自動匯入已移除，請改為使用 Google Calendar 同步或後端 API。';
}

async function demoAutoFillGmail() {
  dom.aiResponse.textContent = '解析 Gmail 內容（模擬）…請自行在後端串接 Gmail API。';
  // example: create event from parsed email
  const date = formatISODate(addDays(new Date(), 20));
  const ev = { id: Date.now(), title: 'APCS 模擬考', start: `${date}T09:00`, end: `${date}T12:00`, allDay: false, category: '藍色', remind: '1440', recurring: 'none', description: '從 Gmail 解析來的活動。' };
  state.events.push(ev);
  dom.aiResponse.textContent = '已從 Gmail 範例創建事件：APCS 模擬考';
  render();
}

async function demoAutoFillTransport() {
  dom.aiResponse.textContent = '查詢交通時間（模擬）…';
  // demo: if user creates a destination event, compute travel and add reminder
  const date = formatISODate(addDays(new Date(), 5));
  const ev = { id: Date.now(), title: '面試 - 高雄醫學大學', start: `${date}T14:00`, end: `${date}T15:00`, allDay: false, category: '藍色', remind: '30', recurring: 'none', description: '面試地點：高雄醫學大學' };
  state.events.push(ev);
  // compute travel time mock
  const travelMinutes = 35;
  const leaveAt = new Date(`${date}T14:00`);
  leaveAt.setMinutes(leaveAt.getMinutes() - travelMinutes);
  const reminder = { id: Date.now()+1, title: `出發提醒：${ev.title}`, start: `${formatISODate(leaveAt)}T${String(leaveAt.getHours()).padStart(2,'0')}:${String(leaveAt.getMinutes()).padStart(2,'0')}`, end: `${formatISODate(leaveAt)}T${String(leaveAt.getHours()).padStart(2,'0')}:${String(leaveAt.getMinutes()).padStart(2,'0')}`, allDay: false, category: '橘色', remind: '0', recurring: 'none', description: `建議 ${travelMinutes} 分鐘出發` };
  state.events.push(reminder);
  dom.aiResponse.textContent = `已建立面試行程並新增出發提醒（建議 ${travelMinutes} 分鐘前出發）。`;
  render();
}

// ------------ Line Notify & Reminder scheduling (session demo) ------------
function scheduleReminderForEvent(event) {
  // schedule only for current session as demo
  try {
    if (!event.remind || Number(event.remind) === 0) return;
    const remindMinutes = Number(event.remind);
    const start = new Date(event.start);
    const remindAt = new Date(start.getTime() - remindMinutes * 60 * 1000);
    const now = new Date();
    const delay = remindAt - now;
    if (delay <= 0) return;
    setTimeout(() => {
      const msg = `提醒：${event.title} (${formatEventTime(event)})`;
      console.log('Reminder:', msg);
    }, delay);
  } catch (e) {
    console.warn('scheduleReminderForEvent error', e);
  }
}

// Call this after loading or creating events to schedule session reminders
function scheduleAllSessionReminders() {
  state.events.forEach((ev) => scheduleReminderForEvent(ev));
}

// ---------- Email send and Google sign-in helpers (lightweight, fallback) ----------
async function sendEmailNotification(toEmail, subject, body) {
  if (!toEmail) throw new Error('需要目標 Email');
  // Prefer backend via GAS if configured
  if (GAS_WEBHOOK_URL && !GAS_WEBHOOK_URL.includes('YOUR_DEPLOYMENT_ID')) {
    try {
      const res = await fetch(GAS_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sendEmail', to: toEmail, subject, body }) });
      const json = await res.json();
      if (json && json.status === 'ok') return true;
      throw new Error(json && json.message ? json.message : '後端寄信失敗');
    } catch (e) {
      // fallback to mailto
      window.open(`mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      return true;
    }
  }
  // client fallback
  window.open(`mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  return true;
}

function signInWithGoogle() {
  // lightweight UI-only simulation if Firebase not available
  if (typeof firebase === 'undefined' || !window.firebaseAuth) {
    if (dom.userInfo) dom.userInfo.textContent = '模擬登入：使用者已登入（本機）';
    if (dom.googleSignInBtn) dom.googleSignInBtn.classList.add('hidden');
    if (dom.googleSignOutBtn) dom.googleSignOutBtn.classList.remove('hidden');
    return;
  }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then((result) => {
      const user = result.user;
      if (dom.userInfo) dom.userInfo.textContent = `${user.displayName || user.email}（已登入）`;
      if (dom.googleSignInBtn) dom.googleSignInBtn.classList.add('hidden');
      if (dom.googleSignOutBtn) dom.googleSignOutBtn.classList.remove('hidden');
      if (dom.notifyEmail && user.email) dom.notifyEmail.value = user.email;
    }).catch((err) => {
      if (dom.userInfo) dom.userInfo.textContent = `登入失敗：${err.message}`;
    });
  } catch (e) {
    if (dom.userInfo) dom.userInfo.textContent = `登入例外：${e.message}`;
  }
}

function signOutGoogle() {
  if (typeof firebase === 'undefined' || !window.firebaseAuth) {
    if (dom.userInfo) dom.userInfo.textContent = '';
    if (dom.googleSignInBtn) dom.googleSignInBtn.classList.remove('hidden');
    if (dom.googleSignOutBtn) dom.googleSignOutBtn.classList.add('hidden');
    return;
  }
  try {
    firebase.auth().signOut().then(() => {
      if (dom.userInfo) dom.userInfo.textContent = '';
      if (dom.googleSignInBtn) dom.googleSignInBtn.classList.remove('hidden');
      if (dom.googleSignOutBtn) dom.googleSignOutBtn.classList.add('hidden');
    }).catch((e) => {
      if (dom.userInfo) dom.userInfo.textContent = `登出失敗：${e.message}`;
    });
  } catch (e) {
    console.warn('signOut error', e);
  }
}

// ------------ AI 智慧排程（簡單版） ------------
function aiScheduleTasks(text) {
  // new signature: aiScheduleTasks(text, { defaultDuration, defaultPriority, draftMode })
  const opts = arguments[1] || {};
  const defaultDuration = Number(opts.defaultDuration) || 60;
  const defaultPriority = opts.defaultPriority || '中';
  const draftMode = !!opts.draftMode;
  const payload = text.replace(/幫我排|排定|安排/g, '').trim();
  if (!payload) return '未偵測到要排程的任務。請輸入類似「幫我排 完成APCS還有數學考試」';
  const rawTasks = payload.split(/[,，、和與]/).map((s) => s.trim()).filter(Boolean);
  if (!rawTasks.length) return '未偵測到任務列表。';

  const created = [];
  const now = new Date();
  const horizonDays = 7;

  rawTasks.forEach((raw, idx) => {
    // parse inline duration like "APCS(90)" or "APCS 90m" and priority like "APCS:高"
    let title = raw;
    let dur = defaultDuration;
    let pr = defaultPriority;
    const mDur = raw.match(/\((\d+)\)|\b(\d+)m\b/);
    if (mDur) {
      dur = Number(mDur[1] || mDur[2]);
      title = title.replace(mDur[0], '').trim();
    }
    const mPr = raw.match(/[:：]\s*(高|中|低)/);
    if (mPr) {
      pr = mPr[1];
      title = title.replace(mPr[0], '').trim();
    }

    let scheduled = false;
    for (let d = 0; d < horizonDays && !scheduled; d += 1) {
      const date = addDays(now, d);
      const freeSlots = findFreeSlotsOnDate(date, 8, 22);
      for (const slot of freeSlots) {
        const slotMinutes = (slot.end - slot.start) / 60000;
        if (slotMinutes >= dur) {
          const startDate = new Date(slot.start);
          const endDate = new Date(startDate.getTime() + dur * 60 * 1000);
          const ev = {
            id: Date.now() + idx + d * 1000,
            title: title,
            start: `${formatISODate(startDate)}T${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
            end: `${formatISODate(endDate)}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`,
            allDay: false,
            category: '私事',
            remind: '30',
            recurring: 'none',
            description: `AI 自動排程 (優先:${pr}，預設時長:${dur}分)`,
            priority: pr,
            duration: dur,
          };
          if (!draftMode) {
            state.events.push(ev);
            scheduleReminderForEvent(ev);
          }
          created.push(ev);
          scheduled = true;
          break;
        }
      }
    }
  });
  render();
  if (!created.length) return '在未來 7 天內找不到合適的空檔。';
  return created;
}

// render editable schedule draft
function renderScheduleDraft(drafts) {
  state.draftSchedule = drafts.slice();
  dom.aiDraft.innerHTML = '';
  const list = document.createElement('div');
  list.style.display = 'grid';
  list.style.gap = '8px';
  drafts.forEach((d, i) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.alignItems = 'center';
    row.innerHTML = `
      <input data-idx="${i}" class="draft-title" value="${escapeHtml(d.title)}" style="flex:1;padding:6px;border-radius:8px;border:1px solid var(--border)" />
      <input data-idx="${i}" class="draft-duration" value="${d.duration || 60}" style="width:70px;padding:6px;border-radius:8px;border:1px solid var(--border)" />
      <select data-idx="${i}" class="draft-priority" style="width:80px">
        <option ${d.priority==='高'?'selected':''}>高</option>
        <option ${d.priority==='中'?'selected':''}>中</option>
        <option ${d.priority==='低'?'selected':''}>低</option>
      </select>
      <button data-idx="${i}" class="draft-apply" style="background:var(--primary);color:#fff;border:none;padding:6px 8px;border-radius:8px">套用</button>
      <button data-idx="${i}" class="draft-remove" style="background:#ccc;color:#111;border:none;padding:6px 8px;border-radius:8px">移除</button>
    `;
    list.appendChild(row);
  });
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.marginTop = '8px';
  const accept = document.createElement('button');
  accept.textContent = '接受並建立所有排程';
  accept.style.background = 'var(--success)';
  accept.style.color = '#fff';
  accept.style.border = 'none';
  accept.style.padding = '8px 12px';
  accept.style.borderRadius = '8px';
  accept.addEventListener('click', acceptDraft);
  const discard = document.createElement('button');
  discard.textContent = '放棄草案';
  discard.style.background = '#f3f4f6';
  discard.style.padding = '8px 12px';
  discard.style.borderRadius = '8px';
  discard.addEventListener('click', discardDraft);
  actions.appendChild(accept);
  actions.appendChild(discard);
  dom.aiDraft.appendChild(list);
  dom.aiDraft.appendChild(actions);

  // attach events for apply/remove
  dom.aiDraft.querySelectorAll('.draft-apply').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      const titleEl = dom.aiDraft.querySelector(`.draft-title[data-idx="${idx}"]`);
      const durEl = dom.aiDraft.querySelector(`.draft-duration[data-idx="${idx}"]`);
      const prEl = dom.aiDraft.querySelector(`.draft-priority[data-idx="${idx}"]`);
      const d = state.draftSchedule[idx];
      d.title = titleEl.value.trim() || d.title;
      d.duration = Number(durEl.value) || d.duration || 60;
      d.priority = prEl.value || d.priority || '中';
      // update description and preview
      d.description = `AI 自動排程 (優先:${d.priority}，預設時長:${d.duration}分)`;
      dom.aiResponse.textContent = `已更新草案 ${d.title}`;
    });
  });
  dom.aiDraft.querySelectorAll('.draft-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      state.draftSchedule.splice(idx, 1);
      renderScheduleDraft(state.draftSchedule);
    });
  });
}

function escapeHtml(str) {
  return (str+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function acceptDraft() {
  if (!state.draftSchedule || !state.draftSchedule.length) {
    dom.aiResponse.textContent = '目前沒有草案可接受。';
    return;
  }
  const created = [];
  state.draftSchedule.forEach((d) => {
    const ev = { ...d };
    ev.id = Date.now() + Math.floor(Math.random() * 10000);
    state.events.push(ev);
    scheduleReminderForEvent(ev);
    created.push(ev);
  });
  // send created events to GAS (Google Sheet)
  (async () => {
    try {
      if (!GAS_WEBHOOK_URL || GAS_WEBHOOK_URL.includes('YOUR_DEPLOYMENT_ID')) {
        dom.aiResponse.textContent = `✓ 已建立 ${created.length} 筆事件（尚未同步到 Google Sheet，請在 script.js 設定 GAS_WEBHOOK_URL）。`;
      } else {
        dom.aiResponse.textContent = '正在保存草案到 Google Sheet...';
        const resp = await fetch(GAS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'saveEvents', events: created }),
        });
        const json = await resp.json();
        if (json.status === 'ok') {
          const data = json.data || {};
          const rowInfo = data.rowRange ? ` (行 ${data.rowRange.from} - ${data.rowRange.to})` : '';
          dom.aiResponse.textContent = `✓ 已建立 ${data.saved || created.length} 筆事件，並保存至 Google Sheet${rowInfo}。`;
        } else {
          throw new Error(json.message);
        }
      }
    } catch (err) {
      dom.aiResponse.textContent = `✓ 已建立 ${created.length} 筆事件，但同步到 Google Sheet 失敗：${err.message}`;
    }
  })();
  state.draftSchedule = [];
  dom.aiDraft.innerHTML = '';
  render();
}

function discardDraft() {
  state.draftSchedule = [];
  dom.aiDraft.innerHTML = '';
  dom.aiResponse.textContent = '已放棄草案。';
}

function findFreeSlotsOnDate(date, fromHour = 8, toHour = 22) {
  const dayStart = new Date(date);
  dayStart.setHours(fromHour, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(toHour, 0, 0, 0);
  const events = getEventsInRange(date, date).map((e) => ({ start: parseISO(e.start), end: parseISO(e.end) })).sort((a, b) => a.start - b.start);
  const slots = [];
  let cursor = new Date(dayStart);
  for (const ev of events) {
    if (ev.start > cursor) slots.push({ start: new Date(cursor), end: new Date(ev.start) });
    if (ev.end > cursor) cursor = new Date(ev.end);
  }
  if (cursor < dayEnd) slots.push({ start: new Date(cursor), end: new Date(dayEnd) });
  return slots.filter((s) => s.end > s.start);
}

// ------------ 衝突建議 ------------
function suggestReschedule(event) {
  // try same day later slots, then next 3 days
  const evStart = parseISO(event.start);
  const duration = parseISO(event.end) - evStart;
  for (let d = 0; d < 4; d += 1) {
    const date = addDays(evStart, d);
    const slots = findFreeSlotsOnDate(date, 8, 22);
    for (const slot of slots) {
      const slotMinutes = (slot.end - slot.start);
      if (slotMinutes >= duration) {
        const candidateStart = new Date(slot.start);
        const candidateEnd = new Date(candidateStart.getTime() + duration);
        return { start: candidateStart, end: candidateEnd };
      }
    }
  }
  return null;
}
