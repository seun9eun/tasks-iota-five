// Korea Standard Time (Asia/Seoul) utility functions

export const KOREA_TZ = 'Asia/Seoul';

// Pre-create singleton formatter to avoid expensive object creation on every call
const koreaDateFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: KOREA_TZ });

let cachedTodayYMD = '';
let lastCacheTime = 0;

/**
 * Get YYYY-MM-DD in Korea Standard Time (Asia/Seoul)
 */
export function getKoreaTodayYYYYMMDD(dateInput?: Date | string | null): string {
  if (!dateInput) {
    const now = Date.now();
    // Cache today's date for 10 seconds to avoid formatting on thousands of rapid calls
    if (cachedTodayYMD && now - lastCacheTime < 10000) {
      return cachedTodayYMD;
    }
    cachedTodayYMD = koreaDateFormatter.format(new Date(now));
    lastCacheTime = now;
    return cachedTodayYMD;
  }

  if (typeof dateInput === 'string') {
    // Fast path for YYYY-MM-DD strings
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    // Fast path for standard ISO strings like 2026-08-06T...
    if (dateInput.length >= 10 && /^\d{4}-\d{2}-\d{2}T/.test(dateInput)) {
      // Check if it's already local/KST ISO string
      const targetDate = new Date(dateInput);
      if (!isNaN(targetDate.getTime())) {
        return koreaDateFormatter.format(targetDate);
      }
    }
    const targetDate = new Date(dateInput);
    if (!isNaN(targetDate.getTime())) {
      return koreaDateFormatter.format(targetDate);
    }
    return getKoreaTodayYYYYMMDD();
  }

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return koreaDateFormatter.format(dateInput);
  }

  return getKoreaTodayYYYYMMDD();
}

export function getLocalYYYYMMDD(dateInput?: Date | string): string {
  return getKoreaTodayYYYYMMDD(dateInput);
}

/**
 * Get Korea Standard Time Date object or ISO string formatted for KST
 */
export function getKoreaISOString(dateInput?: Date | string): string {
  const ymd = getKoreaTodayYYYYMMDD(dateInput);
  return `${ymd}T09:00:00.000Z`;
}

export function isTaskScheduledOnDate(
  taskId: string,
  targetDateStr: string,
  calendarEvents?: any[],
  scheduledDateSet?: Set<string>
): boolean {
  if (!taskId) return false;
  if (scheduledDateSet) {
    return scheduledDateSet.has(`${taskId}:${targetDateStr}`);
  }
  if (!calendarEvents || calendarEvents.length === 0) return false;

  return calendarEvents.some((ev) => {
    const linkedTaskId = (ev as any).taskId || (ev as any)?.extendedProps?.taskId;
    if (linkedTaskId !== taskId) return false;
    const evStart = ev?.start?.dateTime || ev?.start?.date || ev?.start;
    if (!evStart) return false;
    return getKoreaTodayYYYYMMDD(evStart) === targetDateStr;
  });
}

/**
 * Build a quick lookup map of taskId -> Set of scheduled YYYY-MM-DD dates
 */
export function buildTaskScheduleLookup(calendarEvents?: any[]): {
  taskScheduledDateSet: Set<string>;
  taskScheduledTasksSet: Set<string>;
} {
  const taskScheduledDateSet = new Set<string>();
  const taskScheduledTasksSet = new Set<string>();

  if (!calendarEvents || calendarEvents.length === 0) {
    return { taskScheduledDateSet, taskScheduledTasksSet };
  }

  for (let i = 0; i < calendarEvents.length; i++) {
    const ev = calendarEvents[i];
    const linkedTaskId = ev?.taskId || ev?.extendedProps?.taskId;
    if (linkedTaskId) {
      const evStart = ev?.start?.dateTime || ev?.start?.date || ev?.start;
      if (evStart) {
        const ymd = getKoreaTodayYYYYMMDD(evStart);
        taskScheduledDateSet.add(`${linkedTaskId}:${ymd}`);
        taskScheduledTasksSet.add(linkedTaskId);
      }
    }
  }

  return { taskScheduledDateSet, taskScheduledTasksSet };
}

/**
 * Get current week's start (Monday) and end (Sunday) YYYY-MM-DD in Korea Standard Time
 */
export function getKoreaThisWeekRange(dateInput?: Date | string | null): {
  startOfWeekYMD: string;
  endOfWeekYMD: string;
  formattedRange: string;
} {
  const todayYMD = getKoreaTodayYYYYMMDD(dateInput);
  const [year, month, day] = todayYMD.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // getUTCDay(): 0 is Sun, 1 is Mon, 2 is Tue, ..., 6 is Sat
  const dayOfWeek = d.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const startOfWeekYMD = monday.toISOString().slice(0, 10);
  const endOfWeekYMD = sunday.toISOString().slice(0, 10);

  const mMonth = monday.getUTCMonth() + 1;
  const mDay = monday.getUTCDate();
  const sMonth = sunday.getUTCMonth() + 1;
  const sDay = sunday.getUTCDate();

  const formattedRange = `${mMonth}월 ${mDay}일(월) ~ ${sMonth}월 ${sDay}일(일)`;

  return {
    startOfWeekYMD,
    endOfWeekYMD,
    formattedRange,
  };
}

export function isTaskDueToday(
  task: { due?: string; id?: string },
  calendarEvents?: any[],
  scheduledDateSet?: Set<string>
): boolean {
  const todayStr = getKoreaTodayYYYYMMDD();
  
  // 1. Due date is specifically today
  if (task.due) {
    const taskDueStr = getKoreaTodayYYYYMMDD(task.due);
    if (taskDueStr === todayStr) return true;
  }

  // 2. Or scheduled on today's calendar
  if (task.id) {
    if (scheduledDateSet) {
      if (scheduledDateSet.has(`${task.id}:${todayStr}`)) return true;
    } else if (calendarEvents && calendarEvents.length > 0) {
      if (isTaskScheduledOnDate(task.id, todayStr, calendarEvents)) {
        return true;
      }
    }
  }

  return false;
}

export function isTaskDueThisWeek(
  task: { due?: string; id?: string },
  calendarEvents?: any[],
  scheduledDateSet?: Set<string>
): boolean {
  const { startOfWeekYMD, endOfWeekYMD } = getKoreaThisWeekRange();

  // 1. Due date is in this week (Monday ~ Sunday)
  if (task.due) {
    const taskDueStr = getKoreaTodayYYYYMMDD(task.due);
    if (taskDueStr >= startOfWeekYMD && taskDueStr <= endOfWeekYMD) {
      return true;
    }
  }

  // 2. Or scheduled on calendar in this week
  if (task.id) {
    if (calendarEvents && calendarEvents.length > 0) {
      const isScheduledThisWeek = calendarEvents.some((ev) => {
        const linkedTaskId = (ev as any).taskId || (ev as any)?.extendedProps?.taskId;
        if (linkedTaskId !== task.id) return false;
        const evStart = ev?.start?.dateTime || ev?.start?.date || ev?.start;
        if (!evStart) return false;
        const evYMD = getKoreaTodayYYYYMMDD(evStart);
        return evYMD >= startOfWeekYMD && evYMD <= endOfWeekYMD;
      });
      if (isScheduledThisWeek) return true;
    }
  }

  return false;
}

export function isTaskOverdue(task: { due?: string; status?: string }): boolean {
  if (!task.due) return false;
  const todayStr = getKoreaTodayYYYYMMDD();
  const taskDueStr = getKoreaTodayYYYYMMDD(task.due);
  return taskDueStr < todayStr && task.status === 'needsAction';
}

export function isTaskUpcoming(task: { due?: string }): boolean {
  if (!task.due) return false;
  const todayStr = getKoreaTodayYYYYMMDD();
  const taskDueStr = getKoreaTodayYYYYMMDD(task.due);
  return taskDueStr > todayStr;
}

export function formatTaskDueDate(due?: string): { text: string; type: 'today' | 'tomorrow' | 'overdue' | 'future' | 'none' } {
  if (!due) return { text: '이번 주', type: 'today' };
  const todayStr = getKoreaTodayYYYYMMDD();
  const taskDueStr = getKoreaTodayYYYYMMDD(due);

  if (taskDueStr === todayStr) {
    return { text: '오늘', type: 'today' };
  }

  // Calculate day difference
  const today = new Date(`${todayStr}T00:00:00+09:00`);
  const dueDay = new Date(`${taskDueStr}T00:00:00+09:00`);
  const diffTime = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    const formatted = dueDay.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
    return { text: `내일 (${formatted})`, type: 'tomorrow' };
  } else if (diffDays > 1) {
    const formatted = dueDay.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
    return { text: `${formatted} (${diffDays}일 후)`, type: 'future' };
  } else {
    const daysAgo = Math.abs(diffDays);
    return { text: `${daysAgo}일 지남`, type: 'overdue' };
  }
}

export function isTaskToday(task: { due?: string; id?: string; status?: string }, calendarEvents?: any[]): boolean {
  const todayStr = getKoreaTodayYYYYMMDD();

  // 1. Task has due date
  if (task.due) {
    const taskDueStr = getKoreaTodayYYYYMMDD(task.due);
    if (taskDueStr === todayStr) return true;
    // Overdue uncompleted task included in today focus
    if (taskDueStr < todayStr && task.status === 'needsAction') {
      return true;
    }
  }

  // 2. Scheduled on today's calendar
  if (task.id && calendarEvents && calendarEvents.length > 0) {
    if (isTaskScheduledOnDate(task.id, todayStr, calendarEvents)) {
      return true;
    }
  }

  return false;
}

