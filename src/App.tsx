import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthUser, GoogleTask, GoogleTaskList, GoogleCalendarEvent, GoogleCalendarListEntry, QuickShortcut } from './types';
import { DEFAULT_SHORTCUTS } from './components/QuickShortcuts';
import { initAuth, googleSignIn, logout, clearStoredAuth } from './lib/firebase';
import {
  fetchTaskLists,
  fetchTasks,
  fetchTasksForAllLists,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
  fetchCalendarList,
  fetchCalendarEvents,
  createCalendarEventApi,
  updateCalendarEventApi,
  deleteCalendarEventApi,
} from './lib/googleApi';
import {
  INITIAL_DEMO_TASKS,
  INITIAL_DEMO_TASK_LISTS,
  INITIAL_DEMO_CALENDARS,
  getInitialDemoEvents,
} from './data/mockData';

import { Header } from './components/Header';
import { TaskListPanel } from './components/TaskListPanel';
import { CalendarView } from './components/CalendarView';
import { CalendarSelector } from './components/CalendarSelector';
import { TaskModal } from './components/TaskModal';
import { EventModal } from './components/EventModal';
import { ConfirmModal } from './components/ConfirmModal';
import { PrefixManagerModal, DEFAULT_PREFIXES } from './components/PrefixManagerModal';
import { QuickAddCard } from './components/QuickAddCard';
import { isTaskToday, getKoreaISOString, getKoreaTodayYYYYMMDD } from './utils/dateUtils';
import { CheckCircle2, AlertCircle, Sparkles, CheckSquare, Calendar as CalendarIcon, PlusCircle, Target, Settings, Tag, Zap } from 'lucide-react';

export default function App() {
  const [activeMobileTab, setActiveMobileTab] = useState<'tasks' | 'calendar'>('tasks');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // ponytail: this holds the token from sign-in only. After a silent refresh it
  // goes stale, but safeFetch swaps in the current token on 401, so requests
  // still succeed. Lift the token into a context if more call sites need it.
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Data states
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>(INITIAL_DEMO_TASK_LISTS);
  const [selectedListId, setSelectedListId] = useState<string>('demo-list-default');
  const [tasks, setTasks] = useState<GoogleTask[]>(() => {
    const saved = localStorage.getItem('app_local_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local tasks:', e);
      }
    }
    return INITIAL_DEMO_TASKS;
  });
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>(() => {
    const saved = localStorage.getItem('app_local_events');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local events:', e);
      }
    }
    return getInitialDemoEvents();
  });

  // Calendars list state
  const [calendars, setCalendars] = useState<GoogleCalendarListEntry[]>(() => {
    const saved = localStorage.getItem('app_local_calendars');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local calendars:', e);
      }
    }
    return INITIAL_DEMO_CALENDARS;
  });

  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(() => {
    return calendars.map((c) => c.id);
  });

  const handleToggleCalendar = (calId: string) => {
    setSelectedCalendarIds((prev) =>
      prev.includes(calId) ? prev.filter((id) => id !== calId) : [...prev, calId]
    );
  };

  const handleSelectAllCalendars = () => {
    setSelectedCalendarIds(calendars.map((c) => c.id));
  };

  const handleDeselectAllCalendars = () => {
    setSelectedCalendarIds([]);
  };

  // Quick Shortcuts state
  const [shortcuts, setShortcuts] = useState<QuickShortcut[]>(() => {
    const saved = localStorage.getItem('app_quick_shortcuts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse quick shortcuts:', e);
      }
    }
    return DEFAULT_SHORTCUTS;
  });

  const handleUpdateShortcuts = (updatedShortcuts: QuickShortcut[]) => {
    setShortcuts(updatedShortcuts);
    localStorage.setItem('app_quick_shortcuts', JSON.stringify(updatedShortcuts));
  };

  // Task Prefixes (어두) State
  const [prefixes, setPrefixes] = useState<string[]>(() => {
    const saved = localStorage.getItem('app_task_prefixes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse prefixes:', e);
      }
    }
    return DEFAULT_PREFIXES;
  });

  const [prefixModalOpen, setPrefixModalOpen] = useState(false);

  const handleSavePrefixes = (newPrefixes: string[]) => {
    setPrefixes(newPrefixes);
    localStorage.setItem('app_task_prefixes', JSON.stringify(newPrefixes));
    showToast('어두(접두어) 목록이 저장되었습니다.', 'success');
  };

  // Auto-save local data to localStorage when in offline/demo mode
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('app_local_tasks', JSON.stringify(tasks));
    }
  }, [tasks, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('app_local_events', JSON.stringify(calendarEvents));
    }
  }, [calendarEvents, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('app_local_calendars', JSON.stringify(calendars));
    }
  }, [calendars, isAuthenticated]);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GoogleTask | null>(null);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<GoogleCalendarEvent | null>(null);
  const [newEventStart, setNewEventStart] = useState<string>('');
  const [newEventEnd, setNewEventEnd] = useState<string>('');

  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Load data from Google APIs
  const loadGoogleData = useCallback(async (token: string) => {
    setIsSyncing(true);
    try {
      // 1. Fetch Task Lists
      const lists = await fetchTaskLists(token);
      setTaskLists(lists);

      const defaultListId = lists.length > 0 ? lists[0].id : '@default';
      setSelectedListId(defaultListId);

      // 2. Fetch Tasks
      const userTasks = await fetchTasks(token, defaultListId);
      setTasks(userTasks);

      // 3. Fetch User's Calendar List
      const calList = await fetchCalendarList(token);
      setCalendars(calList);
      const initialSelected = calList.filter((c) => c.selected !== false).map((c) => c.id);
      setSelectedCalendarIds(initialSelected.length > 0 ? initialSelected : calList.map((c) => c.id));

      // 4. Fetch Calendar Events for all user calendars
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

      const allEvents: GoogleCalendarEvent[] = [];
      await Promise.all(
        calList.map(async (cal) => {
          try {
            const evs = await fetchCalendarEvents(token, cal.id, timeMin, timeMax);
            const tagged = evs.map((e) => ({
              ...e,
              calendarId: cal.id,
              calendarSummary: cal.summary,
              backgroundColor: cal.backgroundColor,
            }));
            allEvents.push(...tagged);
          } catch (e) {
            console.warn(`Failed to fetch events for calendar ${cal.id}:`, e);
          }
        })
      );
      setCalendarEvents(allEvents);

      showToast('구글 태스크 및 다중 캘린더 데이터를 성공적으로 불러왔습니다.', 'success');
    } catch (err: any) {
      console.warn('Google data loading warning / session expired:', err);
      const errMsg = err?.message || '';
      // Only a real credential rejection ends the session. A dropped connection
      // or a timeout must not sign the user out.
      const isAuthError =
        !err?.isNetworkError &&
        (err?.status === 401 ||
          err?.status === 403 ||
          errMsg.includes('invalid authentication credentials') ||
          errMsg.includes('Invalid Credentials') ||
          errMsg.includes('OAuth 2 access token') ||
          errMsg.includes('Unauthenticated'));

      if (isAuthError) {
        clearStoredAuth();
        setUser(null);
        setIsAuthenticated(false);
        setAccessToken(null);
        setTaskLists(INITIAL_DEMO_TASK_LISTS);
        setSelectedListId('demo-list-default');
        setTasks(INITIAL_DEMO_TASKS);
        setCalendarEvents(getInitialDemoEvents());
        setCalendars(INITIAL_DEMO_CALENDARS);

        showToast('Google 계정 연동 세션이 만료되어 체험 모드로 전환되었습니다. 다시 로그인해 주세요.', 'info');
      } else {
        showToast(errMsg || '구글 연동 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, token) => {
        setUser(authUser);
        setIsAuthenticated(true);
        setAccessToken(token);
        loadGoogleData(token);
      },
      () => {
        setUser(null);
        setIsAuthenticated(false);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, [loadGoogleData]);

  // Auth Actions
  const handleSignIn = async () => {
    try {
      setIsSyncing(true);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setIsAuthenticated(true);
        setAccessToken(res.accessToken);
        await loadGoogleData(res.accessToken);
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      showToast('구글 계정 연동에 실패했습니다.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setIsAuthenticated(false);
      setAccessToken(null);
      // Revert to demo mode
      setTaskLists(INITIAL_DEMO_TASK_LISTS);
      setSelectedListId('demo-list-default');
      setTasks(INITIAL_DEMO_TASKS);
      setCalendarEvents(getInitialDemoEvents());
      showToast('구글 계정 연동이 해제되었습니다. 체험 모드로 전환됩니다.', 'info');
    } catch (err: any) {
      console.error('Sign out failed:', err);
    }
  };

  const handleRefresh = () => {
    if (isAuthenticated && accessToken) {
      loadGoogleData(accessToken);
    } else {
      showToast('새로고침이 완료되었습니다.', 'info');
    }
  };

  // Task List Switch
  const handleSelectListId = async (listId: string) => {
    setSelectedListId(listId);
    if (isAuthenticated && accessToken) {
      setIsSyncing(true);
      try {
        if (listId === 'all-lists') {
          const fetchedTasks = await fetchTasksForAllLists(accessToken, taskLists);
          setTasks(fetchedTasks);
        } else {
          const fetchedTasks = await fetchTasks(accessToken, listId);
          setTasks(fetchedTasks);
        }
      } catch (err: any) {
        showToast('할 일 목록을 가져오지 못했습니다.', 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Task Toggle Completion
  const handleToggleTaskComplete = async (task: GoogleTask) => {
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    if (isAuthenticated && accessToken) {
      try {
        const targetListId = task.tasklistId || (selectedListId === 'all-lists' ? (taskLists[0]?.id || '@default') : selectedListId);
        await updateTaskApi(accessToken, targetListId, task.id, {
          status: newStatus,
        });
      } catch (err: any) {
        showToast('할 일 상태 업데이트에 실패했습니다.', 'error');
        // Revert on error
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
        );
      }
    }
  };

  // Task Duration Update
  const handleTaskDurationChange = (taskId: string, minutes: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, durationMinutes: minutes } : t))
    );
  };

  // Save Task (Create or Edit)
  const handleSaveTask = async (taskData: { title: string; notes?: string; due?: string }) => {
    const targetListId = selectedListId === 'all-lists' ? (taskLists[0]?.id || '@default') : selectedListId;

    if (editingTask) {
      // Edit Task
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id ? { ...t, ...taskData } : t
        )
      );

      if (isAuthenticated && accessToken) {
        try {
          await updateTaskApi(
            accessToken,
            editingTask.tasklistId || targetListId,
            editingTask.id,
            taskData
          );
          showToast(`'${taskData.title}' 할 일이 수정되었습니다.`, 'success');
        } catch (err: any) {
          showToast('할 일 수정 중 오류가 발생했습니다.', 'error');
        }
      } else {
        showToast(`'${taskData.title}' 할 일이 수정되었습니다.`, 'success');
      }
    } else {
      // Create Task
      const tempId = 'task-' + Date.now();
      const newTask: GoogleTask = {
        id: tempId,
        title: taskData.title,
        notes: taskData.notes,
        due: taskData.due,
        status: 'needsAction',
        durationMinutes: 60,
        tasklistId: targetListId,
      };

      setTasks((prev) => [newTask, ...prev]);

      if (isAuthenticated && accessToken) {
        try {
          const created = await createTaskApi(accessToken, targetListId, taskData);
          setTasks((prev) =>
            prev.map((t) => (t.id === tempId ? { ...t, id: created.id } : t))
          );
          showToast(`'${taskData.title}' 새 할 일이 등록되었습니다.`, 'success');
        } catch (err: any) {
          showToast('새 할 일 생성에 실패했습니다.', 'error');
        }
      } else {
        showToast(`'${taskData.title}' 새 할 일이 등록되었습니다.`, 'success');
      }
    }
  };

  // Delete Task with Confirmation
  const handleDeleteTaskClick = (task: GoogleTask) => {
    setConfirmModalConfig({
      isOpen: true,
      title: '할 일 삭제 확인',
      message: `'${task.title}' 항목을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.`,
      onConfirm: async () => {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));

        if (isAuthenticated && accessToken) {
          try {
            await deleteTaskApi(accessToken, task.tasklistId || selectedListId, task.id);
            showToast('할 일이 삭제되었습니다.', 'info');
          } catch (err: any) {
            showToast('할 일 삭제 실패.', 'error');
          }
        } else {
          showToast('할 일이 삭제되었습니다.', 'info');
        }
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Calendar Event: Receive dropped task from sidebar
  const handleEventReceiveFromTask = async (
    title: string,
    startISO: string,
    endISO: string,
    taskId?: string
  ) => {
    const tempId = 'event-' + Date.now();
    const newEvent: GoogleCalendarEvent = {
      id: tempId,
      summary: title,
      start: { dateTime: startISO },
      end: { dateTime: endISO },
    };
    if (taskId) {
      (newEvent as any).taskId = taskId;
    }

    setCalendarEvents((prev) => [...prev, newEvent]);

    if (isAuthenticated && accessToken) {
      try {
        const created = await createCalendarEventApi(accessToken, 'primary', {
          summary: title,
          start: { dateTime: startISO },
          end: { dateTime: endISO },
        });
        setCalendarEvents((prev) =>
          prev.map((ev) => (ev.id === tempId ? created : ev))
        );
        showToast(`'${title}' 일정이 구글 캘린더에 생성되었습니다!`, 'success');
      } catch (err: any) {
        console.warn('Google calendar event creation error:', err);
        showToast('구글 캘린더 일정 생성 실패.', 'error');
      }
    } else {
      showToast(`'${title}' 일정이 캘린더에 추가되었습니다.`, 'success');
    }
  };

  // Calendar Event: Drag / Resize Time change
  const handleEventChangeTime = async (
    eventId: string,
    newStartISO: string,
    newEndISO: string
  ) => {
    const targetEv = calendarEvents.find((e) => e.id === eventId);
    const targetCalId = targetEv?.calendarId || 'primary';

    setCalendarEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              start: { ...ev.start, dateTime: newStartISO },
              end: { ...ev.end, dateTime: newEndISO },
            }
          : ev
      )
    );

    if (isAuthenticated && accessToken) {
      try {
        await updateCalendarEventApi(accessToken, targetCalId, eventId, {
          start: { dateTime: newStartISO },
          end: { dateTime: newEndISO },
        });
        showToast('일정 시간이 변경되었습니다.', 'success');
      } catch (err: any) {
        showToast('구글 캘린더 일정 수정에 실패했습니다.', 'error');
      }
    } else {
      showToast('일정 시간이 변경되었습니다.', 'info');
    }
  };

  // Save Event from Modal (Create or Edit)
  const handleSaveEvent = async (eventData: {
    summary: string;
    description?: string;
    start: { dateTime: string };
    end: { dateTime: string };
    location?: string;
    calendarId?: string;
  }) => {
    const targetCalId = eventData.calendarId || editingEvent?.calendarId || 'primary';
    const targetCalInfo = calendars.find((c) => c.id === targetCalId);

    if (editingEvent) {
      // Edit
      setCalendarEvents((prev) =>
        prev.map((ev) =>
          ev.id === editingEvent.id
            ? {
                ...ev,
                ...eventData,
                calendarId: targetCalId,
                backgroundColor: targetCalInfo?.backgroundColor || ev.backgroundColor,
              }
            : ev
        )
      );

      if (isAuthenticated && accessToken) {
        try {
          await updateCalendarEventApi(accessToken, targetCalId, editingEvent.id, eventData);
          showToast(`'${eventData.summary}' 일정이 수정되었습니다.`, 'success');
        } catch (err: any) {
          showToast('일정 수정에 실패했습니다.', 'error');
        }
      } else {
        showToast(`'${eventData.summary}' 일정이 수정되었습니다.`, 'success');
      }
    } else {
      // Create
      const tempId = 'event-' + Date.now();
      const newEv: GoogleCalendarEvent = {
        id: tempId,
        ...eventData,
        calendarId: targetCalId,
        backgroundColor: targetCalInfo?.backgroundColor || '#3b82f6',
      };

      setCalendarEvents((prev) => [...prev, newEv]);

      if (isAuthenticated && accessToken) {
        try {
          const created = await createCalendarEventApi(accessToken, targetCalId, eventData);
          setCalendarEvents((prev) =>
            prev.map((ev) =>
              ev.id === tempId
                ? { ...created, calendarId: targetCalId, backgroundColor: targetCalInfo?.backgroundColor }
                : ev
            )
          );
          showToast(`'${eventData.summary}' 일정이 등록되었습니다.`, 'success');
        } catch (err: any) {
          showToast('일정 등록에 실패했습니다.', 'error');
        }
      } else {
        showToast(`'${eventData.summary}' 일정이 등록되었습니다.`, 'success');
      }
    }
  };

  // Delete Calendar Event with Confirmation
  const handleDeleteEventClick = (eventId: string, calId?: string) => {
    const targetEv = calendarEvents.find((e) => e.id === eventId);
    const title = targetEv?.summary || '해당 일정';
    const targetCalId = calId || targetEv?.calendarId || 'primary';

    setConfirmModalConfig({
      isOpen: true,
      title: '일정 삭제 확인',
      message: `'${title}' 일정을 구글 캘린더에서 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.`,
      onConfirm: async () => {
        setCalendarEvents((prev) => prev.filter((e) => e.id !== eventId));
        setEventModalOpen(false);

        if (isAuthenticated && accessToken) {
          try {
            await deleteCalendarEventApi(accessToken, targetCalId, eventId);
            showToast('일정이 삭제되었습니다.', 'info');
          } catch (err: any) {
            showToast('일정 삭제에 실패했습니다.', 'error');
          }
        } else {
          showToast('일정이 삭제되었습니다.', 'info');
        }
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Quick capture task handler with object data
  const handleQuickAddTaskData = async (taskData: { title: string; notes?: string; due?: string }) => {
    const title = taskData.title.trim();
    if (!title) return;

    const todayIso = taskData.due || getKoreaISOString();
    const tempId = 'task-' + Date.now();
    const newTask: GoogleTask = {
      id: tempId,
      title,
      notes: taskData.notes,
      due: todayIso,
      status: 'needsAction',
      durationMinutes: 60,
      tasklistId: selectedListId,
    };

    setTasks((prev) => [newTask, ...prev]);

    if (isAuthenticated && accessToken) {
      try {
        const created = await createTaskApi(accessToken, selectedListId, {
          title,
          notes: taskData.notes,
          due: todayIso,
        });
        setTasks((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, id: created.id, due: created.due || todayIso } : t))
        );
        showToast(`'${title}' 항목이 할 일 목록에 등록되었습니다!`, 'success');
      } catch (err: any) {
        showToast('빠른 할 일 등록 실패.', 'error');
      }
    } else {
      showToast(`'${title}' 항목이 할 일 목록에 등록되었습니다.`, 'success');
    }
  };

  const handleScheduleTaskQuickly = useCallback((task: GoogleTask) => {
    const durationMins = task.durationMinutes || 60;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
    const end = new Date(start.getTime() + durationMins * 60 * 1000);

    handleEventReceiveFromTask(task.title, start.toISOString(), end.toISOString(), task.id);
  }, [calendarEvents, isAuthenticated, accessToken]);

  // Calculations for Bento Stats (Memoized)
  const { totalTodayTaskCount, completedTodayTaskCount, todayCompletionPercentage } = useMemo(() => {
    const today = tasks.filter((t) => isTaskToday(t, calendarEvents));
    const total = today.length;
    const completed = today.filter((t) => t.status === 'completed').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      totalTodayTaskCount: total,
      completedTodayTaskCount: completed,
      todayCompletionPercentage: percent,
    };
  }, [tasks, calendarEvents]);

  // Monthly stats calculation (Memoized)
  const { totalMonthlyTaskCount, completedMonthlyTaskCount, monthlyCompletionPercentage } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const isTaskThisMonth = (t: GoogleTask) => {
      if (t.due) {
        const d = new Date(t.due);
        if (!isNaN(d.getTime())) {
          return d.getFullYear() === year && d.getMonth() === month;
        }
      }
      if (t.completed) {
        const c = new Date(t.completed);
        if (!isNaN(c.getTime())) {
          return c.getFullYear() === year && c.getMonth() === month;
        }
      }
      return true;
    };

    const monthlyTasks = tasks.filter((t) => isTaskThisMonth(t));
    const total = monthlyTasks.length;
    const completed = monthlyTasks.filter((t) => t.status === 'completed').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      totalMonthlyTaskCount: total,
      completedMonthlyTaskCount: completed,
      monthlyCompletionPercentage: percent,
    };
  }, [tasks]);

  // Filter events based on selected multi-calendar IDs (Memoized)
  const visibleCalendarEvents = useMemo(() => {
    return calendarEvents.filter((ev) => {
      const cId = ev.calendarId || 'primary';
      return selectedCalendarIds.includes(cId);
    });
  }, [calendarEvents, selectedCalendarIds]);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#F8FAFC] overflow-hidden font-sans select-none text-slate-900">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-900/90 text-white border-emerald-700/50 backdrop-blur-md'
                : toast.type === 'error'
                ? 'bg-red-900/90 text-white border-red-700/50 backdrop-blur-md'
                : 'bg-slate-900/90 text-white border-slate-700/50 backdrop-blur-md'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Navigation Header */}
      <Header
        user={user}
        isAuthenticated={isAuthenticated}
        isSyncing={isSyncing}
        shortcuts={shortcuts}
        onUpdateShortcuts={handleUpdateShortcuts}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onRefresh={handleRefresh}
      />

      {/* Bento Grid Main Container */}
      <div className="flex-1 p-2.5 sm:p-4 overflow-hidden flex flex-col gap-2.5 sm:gap-4">
        {/* Mobile View Navigation Tab Switcher (Shown only on < md screens) */}
        <div className="flex md:hidden items-center justify-between bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveMobileTab('tasks')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
              activeMobileTab === 'tasks'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 bg-transparent'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>오늘의 할 일 ({totalTodayTaskCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('calendar')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
              activeMobileTab === 'calendar'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 bg-transparent'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>캘린더 ({calendarEvents.length})</span>
          </button>
        </div>

        {/* Bento Top Metrics Bar: Quick Capture | Daily Goal | Monthly Goal */}
        <div className="flex sm:grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 shrink-0 overflow-x-auto snap-x snap-mandatory pb-1 sm:pb-0 scrollbar-none">
          {/* Bento Metric Card 1: Quick Capture Input (Isolated component for smooth keystroke input) */}
          <QuickAddCard
            prefixes={prefixes}
            onQuickAdd={handleQuickAddTaskData}
            onOpenPrefixManager={() => setPrefixModalOpen(true)}
          />

          {/* Bento Metric Card 2: Daily Goal Completion */}
          <div className="min-w-[260px] sm:min-w-0 snap-center shrink-0 sm:shrink bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 sm:p-4 flex flex-col justify-between hover:shadow-xs transition">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                일간목표 달성률
              </span>
              <span className="text-[10px] sm:text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {completedTodayTaskCount}/{totalTodayTaskCount} 완료
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 sm:mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                {todayCompletionPercentage}%
                {todayCompletionPercentage === 100 && totalTodayTaskCount > 0 && (
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-bounce">
                    🎉 완수!
                  </span>
                )}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${todayCompletionPercentage}%` }}
              />
            </div>
          </div>

          {/* Bento Metric Card 3: Monthly Goal Completion */}
          <div className="min-w-[260px] sm:min-w-0 snap-center shrink-0 sm:shrink bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 sm:p-4 flex flex-col justify-between hover:shadow-xs transition">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                월간목표 달성률 ({new Date().getMonth() + 1}월)
              </span>
              <span className="text-[10px] sm:text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                {completedMonthlyTaskCount}/{totalMonthlyTaskCount} 완료
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 sm:mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                {monthlyCompletionPercentage}%
                {monthlyCompletionPercentage === 100 && totalMonthlyTaskCount > 0 && (
                  <span className="text-[10px] sm:text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full animate-bounce">
                    🌟 완벽!
                  </span>
                )}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${monthlyCompletionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bento Dashboard Layout: Task List Panel + Calendar View */}
        <div className="flex flex-1 gap-3 md:gap-4 overflow-hidden relative">
          {/* Left Sidebar: Google Tasks */}
          <div className={`h-full w-full md:w-auto ${activeMobileTab === 'tasks' ? 'block' : 'hidden md:block'}`}>
            <TaskListPanel
              tasks={tasks}
              taskLists={taskLists}
              selectedListId={selectedListId}
              prefixes={prefixes}
              calendarEvents={calendarEvents}
              onSelectListId={handleSelectListId}
              onToggleComplete={handleToggleTaskComplete}
              onAddTaskClick={() => {
                setEditingTask(null);
                setTaskModalOpen(true);
              }}
              onQuickAddTask={handleQuickAddTaskData}
              onEditTaskClick={(task) => {
                setEditingTask(task);
                setTaskModalOpen(true);
              }}
              onDeleteTaskClick={handleDeleteTaskClick}
              onTaskDurationChange={handleTaskDurationChange}
              onScheduleTaskQuickly={handleScheduleTaskQuickly}
              onOpenPrefixManager={() => setPrefixModalOpen(true)}
            />
          </div>

          {/* Right Area: Google Calendar */}
          <div className={`flex-1 h-full w-full flex flex-col gap-2.5 sm:gap-3 min-w-0 ${activeMobileTab === 'calendar' ? 'flex' : 'hidden md:flex'}`}>
            <CalendarSelector
              calendars={calendars}
              selectedCalendarIds={selectedCalendarIds}
              events={calendarEvents}
              onToggleCalendar={handleToggleCalendar}
              onSelectAll={handleSelectAllCalendars}
              onDeselectAll={handleDeselectAllCalendars}
            />
            <div className="flex-1 min-h-0">
              <CalendarView
                events={visibleCalendarEvents}
                tasks={tasks}
                calendars={calendars}
                onToggleTaskComplete={handleToggleTaskComplete}
                onEventReceiveFromTask={handleEventReceiveFromTask}
                onEventChangeTime={handleEventChangeTime}
                onEventClick={(ev) => {
                  setEditingEvent(ev);
                  setEventModalOpen(true);
                }}
                onEditTaskClick={(task) => {
                  setEditingTask(task);
                  setTaskModalOpen(true);
                }}
                onDateSelect={(startStr, endStr) => {
                  setEditingEvent(null);
                  setNewEventStart(startStr);
                  setNewEventEnd(endStr);
                  setEventModalOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={taskModalOpen}
        task={editingTask}
        prefixes={prefixes}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        onOpenPrefixManager={() => setPrefixModalOpen(true)}
      />

      <PrefixManagerModal
        isOpen={prefixModalOpen}
        prefixes={prefixes}
        onClose={() => setPrefixModalOpen(false)}
        onSave={handleSavePrefixes}
      />

      <EventModal
        isOpen={eventModalOpen}
        event={editingEvent}
        initialStartISO={newEventStart}
        initialEndISO={newEventEnd}
        calendars={calendars}
        onClose={() => setEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEventClick}
      />

      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
