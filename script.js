const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
const CATEGORY_CLASSES = { 學校: 'school', APCS: 'apcs', 社團: 'club', 私事: 'personal' };

const state = {
  view: 'month',
  currentDate: new Date(),
  events: [],
  editingEventId: null,
  apiEndpoint: 'mock-events.json'
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
  dom.eventRemind = document.getElementById('event-remind');
  dom.eventRecurring = document.getElementById('event-recurring');
  dom.eventDesc = document.getElementById('event-desc');
  dom.eventMessage = document.getElementById('event-message');
  dom.saveEventBtn = document.getElementById('save-event-btn');
  dom.deleteEventBtn = document.getElementById('delete-event-btn');

  document.getElementById('prev-btn').addEventListener('click', goPrevious);
  document.getElementById('next-btn').addEventListener('click', goNext);
  document.getElementById('open-event-btn').addEventListener('click', () => openEventModal());
  document.getElementById('api-load-btn').addEventListener('click', loadEventsFromApi);
  document.getElementById('sync-sheet-btn').addEventListener('click', syncAllEventsToSheet);
  document.getElementById('close-modal-btn').addEventListener('click', closeEventModal);
  dom.saveEventBtn.addEventListener('click', saveEventFromForm);
  dom.deleteEventBtn.addEventListener('click', deleteEventFromForm);
  document.getElementById('ai-action-btn').addEventListener('click', handleAiCommand);
  document.querySelectorAll('.view-btn').forEach((btn) => btn.addEventListener('click', switchView));
  dom.eventAllDay.addEventListener('change', toggleAllDay);

  // Line Notify UI handlers
  dom.lineTokenInput = document.getElementById('line-token');
  dom.lineSaveBtn = document.getElementById('line-save-btn');
  dom.lineSendBtn = document.getElementById('line-send-btn');
  dom.lineResponse = document.getElementById('line-response');
  // load saved token
  const savedToken = localStorage.getItem('line_notify_token');
  if (savedToken) dom.lineTokenInput.value = savedToken;
  dom.lineSaveBtn.addEventListener('click', () => {
    const t = dom.lineTokenInput.value.trim();
    if (!t) {
      dom.lineResponse.textContent = '請輸入 token 後再儲存。';
      return;
    }
    localStorage.setItem('line_notify_token', t);
    dom.lineResponse.textContent = '已儲存 token（僅存在本機瀏覽器）。';
  });
  dom.lineSendBtn.addEventListener('click', async () => {
    const token = dom.lineTokenInput.value.trim() || localStorage.getItem('line_notify_token');
    if (!token) {
      dom.lineResponse.textContent = '請先輸入或儲存 Line Notify 權杖。';
      return;
    }
    dom.lineResponse.textContent = '傳送中…';
    try {
      const res = await sendLineNotify(token, '測試通知：這是來自 AI 行事曆的測試訊息。');
      dom.lineResponse.textContent = res;
    } catch (err) {
      dom.lineResponse.textContent = `傳送失敗：${err.message}`;
    }
  });

  state.events = getInitialEvents();
  render();
  scheduleAllSessionReminders();
});

function getInitialEvents() {
  return [
    { id: 1, title: 'APCS 練習', start: '2026-07-20T10:00', end: '2026-07-20T11:30', allDay: false, category: 'APCS', remind: '30', recurring: 'weekly', description: '每週二課後練習。' },
    { id: 2, title: '社團 meeting', start: '2026-07-21T18:30', end: '2026-07-21T20:00', allDay: false, category: '社團', remind: '1440', recurring: 'none', description: '討論專題進度。' },
    { id: 3, title: '期中考準備', start: '2026-07-22T00:00', end: '2026-07-22T23:59', allDay: true, category: '學校', remind: '1440', recurring: 'none', description: '全天讀書計畫。' }
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
      chip.className = `event-chip ${CATEGORY_CLASSES[event.category] || ''}`;
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

function renderSummary() {
  const date = state.currentDate;
  const todayEvents = getEventsInRange(date, date).sort((a, b) => parseISO(a.start) - parseISO(b.start));
  if (!todayEvents.length) {
    dom.summaryPanel.textContent = '今天沒有事件。你可以添加一個新的事件或從 API 匯入。';
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

function loadEventsFromApi() {
  dom.aiResponse.textContent = '正在從 API 讀取事件…';
  fetch(state.apiEndpoint)
    .then((response) => response.json())
    .then((data) => {
      if (!Array.isArray(data)) throw new Error('API 回傳格式錯誤');
      const imported = data.map((item, index) => ({
        id: Date.now() + index,
        title: item.title,
        start: item.start,
        end: item.end,
        allDay: !!item.allDay,
        category: item.category || '私事',
        remind: item.remind || '30',
        recurring: item.recurring || 'none',
        description: item.description || '',
      }));
      state.events = [...state.events, ...imported];
      dom.aiResponse.textContent = `已成功匯入 ${imported.length} 筆事件。`;
      render();
      scheduleAllSessionReminders();
    })
    .catch((error) => {
      dom.aiResponse.textContent = `API 匯入失敗：${error.message}`;
    });
}

function syncAllEventsToSheet() {
  dom.aiResponse.textContent = '正在同步事件到 Google Sheet…';
  fetch(GAS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: state.events }),
  })
    .then((response) => response.json())
    .then(() => {
      dom.aiResponse.textContent = `已同步 ${state.events.length} 筆事件至 Google Sheet。`;
    })
    .catch((error) => {
      dom.aiResponse.textContent = `同步失敗：請確認 GAS 網址與部署設定。(${error.message})`;
    });
}

function handleAiCommand() {
  const text = dom.aiInput.value.trim();
  if (!text) {
    dom.aiResponse.textContent = '請輸入自然語言指令，例如「下週三下午三點跟老師討論專題」。';
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

// ------------ Line Notify & Reminder scheduling (session demo) ------------
async function sendLineNotify(token, message) {
  // Attempts to call LINE Notify directly from browser. If CORS blocked, use GAS/proxy.
  const params = new URLSearchParams();
  params.append('message', message);
  const res = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE API ${res.status} ${text}`);
  }
  return 'Line Notify 傳送成功。';
}

function scheduleReminderForEvent(event) {
  // schedule only for current session as demo
  try {
    const token = localStorage.getItem('line_notify_token');
    if (!token) return;
    if (!event.remind || Number(event.remind) === 0) return;
    const remindMinutes = Number(event.remind);
    const start = new Date(event.start);
    const remindAt = new Date(start.getTime() - remindMinutes * 60 * 1000);
    const now = new Date();
    const delay = remindAt - now;
    if (delay <= 0) return; // pass if already past
    setTimeout(() => {
      const msg = `提醒：${event.title} (${formatEventTime(event)})`;
      sendLineNotify(token, msg).catch((e) => console.warn('LineNotify failed', e));
    }, delay);
  } catch (e) {
    console.warn('scheduleReminderForEvent error', e);
  }
}

// Call this after loading or creating events to schedule session reminders
function scheduleAllSessionReminders() {
  state.events.forEach((ev) => scheduleReminderForEvent(ev));
}

// ------------ AI 智慧排程（簡單版） ------------
function aiScheduleTasks(text) {
  // Expect commands like: "幫我排 完成APCS、數學考試" or "排定 APCS 與 數學"
  const payload = text.replace(/幫我排|排定|安排/g, '').trim();
  if (!payload) return '未偵測到要排程的任務。請輸入類似「幫我排 完成APCS還有數學考試」';
  const tasks = payload.split(/[,，、和與]/).map((s) => s.trim()).filter(Boolean);
  if (!tasks.length) return '未偵測到任務列表。';

  const created = [];
  const now = new Date();
  // search next 7 days for free slots
  const horizonDays = 7;
  const defaultDurationMin = 60;
  tasks.forEach((task, idx) => {
    let scheduled = false;
    for (let d = 0; d < horizonDays && !scheduled; d += 1) {
      const date = addDays(now, d);
      const freeSlots = findFreeSlotsOnDate(date, 8, 22); // from 08:00 to 22:00
      for (const slot of freeSlots) {
        const slotMinutes = (slot.end - slot.start) / 60000;
        if (slotMinutes >= defaultDurationMin) {
          const startDate = new Date(slot.start);
          const endDate = new Date(startDate.getTime() + defaultDurationMin * 60 * 1000);
          const ev = {
            id: Date.now() + idx + d * 1000,
            title: task,
            start: `${formatISODate(startDate)}T${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
            end: `${formatISODate(endDate)}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`,
            allDay: false,
            category: '私事',
            remind: '30',
            recurring: 'none',
            description: 'AI 自動排程',
          };
          state.events.push(ev);
          scheduleReminderForEvent(ev);
          created.push(ev);
          scheduled = true;
          break;
        }
      }
    }
  });
  render();
  if (!created.length) return '在未來 7 天內找不到合適的空檔。';
  return `已排定 ${created.length} 個任務：\n${created.map((c) => `${c.title} ${formatShortDate(parseISO(c.start))} ${toTimeString(c.start)}`).join('\n')}`;
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
