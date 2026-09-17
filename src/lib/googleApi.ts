import { GoogleTask, GoogleTaskList, GoogleCalendarEvent, GoogleCalendarListEntry } from '../types';
import { getAccessToken, refreshAccessToken } from './auth';

// ==========================================
// Safe Fetch Helper with Timeout & CORS/Network Error Handling
// ==========================================

async function safeFetch(url: string, options?: RequestInit, isRetry = false): Promise<Response> {
  // Callers capture the token when the user signs in, so a silent refresh later
  // leaves them holding a stale one. Send the stored token instead, or every
  // request burns a 401 and a fresh GIS grant before it succeeds.
  if (!isRetry) {
    const currentToken = getAccessToken();
    const headers = new Headers(options?.headers);
    if (currentToken && headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${currentToken}`);
      options = { ...options, headers };
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError';
    const msg = isAbort
      ? 'Google API 요청 시간이 초과되었습니다.'
      : 'Google API 서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.';
    const customErr = new Error(msg);
    // A network failure is not an auth failure — keep the user signed in.
    (customErr as any).status = 0;
    (customErr as any).isNetworkError = true;
    throw customErr;
  } finally {
    clearTimeout(timer);
  }

  // The access token expired mid-session: mint a fresh one and retry once.
  // Every caller passes its token in the Authorization header, so swapping the
  // header here renews the request without touching a single call site.
  if (res.status === 401 && !isRetry) {
    const freshToken = await refreshAccessToken();
    if (freshToken) {
      const headers = new Headers(options?.headers);
      headers.set('Authorization', `Bearer ${freshToken}`);
      return safeFetch(url, { ...options, headers }, true);
    }
  }

  return res;
}

async function handleFetchError(res: Response, defaultMessage: string): Promise<never> {
  let message = defaultMessage;
  try {
    const errorData = await res.json();
    message = errorData.error?.message || defaultMessage;
  } catch {
    // ignore parse failure
  }
  const err = new Error(message);
  (err as any).status = res.status;
  throw err;
}

// ==========================================
// Google Tasks API Helper Functions
// ==========================================

export async function fetchTaskLists(token: string): Promise<GoogleTaskList[]> {
  const res = await safeFetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    await handleFetchError(res, '할 일 목록을 불러오지 못했습니다.');
  }
  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    updated: item.updated,
  }));
}

export async function fetchTasks(token: string, tasklistId: string = '@default'): Promise<GoogleTask[]> {
  let allItems: GoogleTask[] = [];
  let pageToken: string | undefined = undefined;
  let pageCount = 0;

  do {
    const params = new URLSearchParams({
      showCompleted: 'true',
      showHidden: 'true',
      maxResults: '100',
    });
    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(tasklistId)}/tasks?${params.toString()}`;
    const res = await safeFetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      await handleFetchError(res, '할 일 데이터를 불러오지 못했습니다.');
    }
    const data = await res.json();
    const items = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.title || '(제목 없음)',
      notes: item.notes || '',
      status: item.status as 'needsAction' | 'completed',
      due: item.due,
      completed: item.completed,
      position: item.position,
      updated: item.updated,
      tasklistId: tasklistId,
    }));

    allItems.push(...items);
    pageToken = data.nextPageToken;
    pageCount++;
  } while (pageToken && pageCount < 10);

  return allItems;
}

export async function fetchTasksForAllLists(token: string, lists: GoogleTaskList[]): Promise<GoogleTask[]> {
  const allTasks: GoogleTask[] = [];
  await Promise.all(
    lists.map(async (list) => {
      try {
        const tasks = await fetchTasks(token, list.id);
        allTasks.push(...tasks);
      } catch (err) {
        console.warn(`Failed to fetch tasks for list ${list.id}:`, err);
      }
    })
  );
  return allTasks;
}

export async function createTaskApi(
  token: string,
  tasklistId: string = '@default',
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTask> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(tasklistId)}/tasks`;
  const body: any = {
    title: task.title,
  };
  if (task.notes) body.notes = task.notes;
  if (task.due) body.due = task.due;

  const res = await safeFetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await handleFetchError(res, '새 할 일을 생성하지 못했습니다.');
  }
  const item = await res.json();
  return {
    id: item.id,
    title: item.title,
    notes: item.notes || '',
    status: item.status,
    due: item.due,
    completed: item.completed,
    updated: item.updated,
    tasklistId: tasklistId,
  };
}

export async function updateTaskApi(
  token: string,
  tasklistId: string = '@default',
  taskId: string,
  updates: Partial<GoogleTask>
): Promise<GoogleTask> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`;
  const body: any = {};
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.notes !== undefined) body.notes = updates.notes;
  if (updates.status !== undefined) body.status = updates.status;
  if (updates.due !== undefined) body.due = updates.due;

  const res = await safeFetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await handleFetchError(res, '할 일을 수정하지 못했습니다.');
  }
  const item = await res.json();
  return {
    id: item.id,
    title: item.title,
    notes: item.notes || '',
    status: item.status,
    due: item.due,
    completed: item.completed,
    updated: item.updated,
    tasklistId: tasklistId,
  };
}

export async function deleteTaskApi(
  token: string,
  tasklistId: string = '@default',
  taskId: string
): Promise<void> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`;
  const res = await safeFetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    await handleFetchError(res, '할 일을 삭제하지 못했습니다.');
  }
}

// ==========================================
// Google Calendar API Helper Functions
// ==========================================

export async function fetchCalendarList(token: string): Promise<GoogleCalendarListEntry[]> {
  const url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
  const res = await safeFetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    await handleFetchError(res, '캘린더 목록을 불러오지 못했습니다.');
  }
  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || '기본 캘린더',
    description: item.description,
    primary: !!item.primary,
    accessRole: item.accessRole,
    backgroundColor: item.backgroundColor || '#3b82f6',
    foregroundColor: item.foregroundColor || '#ffffff',
    selected: item.selected !== false,
  }));
}

export async function fetchCalendarEvents(
  token: string,
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  if (timeMin) params.append('timeMin', timeMin);
  if (timeMax) params.append('timeMax', timeMax);

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;
  const res = await safeFetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleFetchError(res, '캘린더 일정을 불러오지 못했습니다.');
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || '(제목 없음)',
    description: item.description || '',
    start: item.start || {},
    end: item.end || {},
    location: item.location || '',
    colorId: item.colorId,
    status: item.status,
    htmlLink: item.htmlLink,
    calendarId: calendarId,
  }));
}

export async function createCalendarEventApi(
  token: string,
  calendarId: string = 'primary',
  event: {
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
    location?: string;
  }
): Promise<GoogleCalendarEvent> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';

  const body: any = {
    summary: event.summary,
    description: event.description || '',
    location: event.location || '',
    start: event.start.dateTime
      ? { dateTime: event.start.dateTime, timeZone }
      : { date: event.start.date },
    end: event.end.dateTime
      ? { dateTime: event.end.dateTime, timeZone }
      : { date: event.end.date },
  };

  const res = await safeFetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await handleFetchError(res, '캘린더에 일정을 등록하지 못했습니다.');
  }

  const item = await res.json();
  return {
    id: item.id,
    summary: item.summary,
    description: item.description,
    start: item.start,
    end: item.end,
    location: item.location,
    status: item.status,
    htmlLink: item.htmlLink,
  };
}

export async function updateCalendarEventApi(
  token: string,
  calendarId: string = 'primary',
  eventId: string,
  updates: {
    summary?: string;
    description?: string;
    start?: { dateTime?: string; date?: string; timeZone?: string };
    end?: { dateTime?: string; date?: string; timeZone?: string };
    location?: string;
  }
): Promise<GoogleCalendarEvent> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';

  const body: any = {};
  if (updates.summary !== undefined) body.summary = updates.summary;
  if (updates.description !== undefined) body.description = updates.description;
  if (updates.location !== undefined) body.location = updates.location;
  if (updates.start) {
    body.start = updates.start.dateTime
      ? { dateTime: updates.start.dateTime, timeZone }
      : { date: updates.start.date };
  }
  if (updates.end) {
    body.end = updates.end.dateTime
      ? { dateTime: updates.end.dateTime, timeZone }
      : { date: updates.end.date };
  }

  const res = await safeFetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await handleFetchError(res, '일정 수정에 실패했습니다.');
  }

  const item = await res.json();
  return {
    id: item.id,
    summary: item.summary,
    description: item.description,
    start: item.start,
    end: item.end,
    location: item.location,
    status: item.status,
    htmlLink: item.htmlLink,
  };
}

export async function deleteCalendarEventApi(
  token: string,
  calendarId: string = 'primary',
  eventId: string
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  const res = await safeFetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204) {
    await handleFetchError(res, '일정 삭제에 실패했습니다.');
  }
}
