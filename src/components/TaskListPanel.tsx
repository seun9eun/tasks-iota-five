import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleTask, GoogleTaskList, GoogleCalendarEvent } from '../types';
import { Draggable } from '@fullcalendar/interaction';
import {
  isTaskDueToday,
  isTaskDueThisWeek,
  isTaskOverdue,
  isTaskUpcoming,
  formatTaskDueDate,
  getKoreaThisWeekRange,
  buildTaskScheduleLookup,
} from '../utils/dateUtils';
import {
  CheckSquare,
  Square,
  Plus,
  GripVertical,
  Clock,
  Trash2,
  Edit2,
  Search,
  Calendar as CalendarIcon,
  Sparkles,
  Info,
  AlertCircle,
  CalendarDays,
  Tag,
  CalendarRange,
  ListTodo,
} from 'lucide-react';

interface TaskListPanelProps {
  tasks: GoogleTask[];
  taskLists: GoogleTaskList[];
  selectedListId: string;
  prefixes: string[];
  calendarEvents?: GoogleCalendarEvent[];
  onSelectListId: (id: string) => void;
  onToggleComplete: (task: GoogleTask) => void;
  onAddTaskClick: () => void;
  onEditTaskClick: (task: GoogleTask) => void;
  onDeleteTaskClick: (task: GoogleTask) => void;
  onTaskDurationChange: (taskId: string, minutes: number) => void;
  onScheduleTaskQuickly?: (task: GoogleTask) => void;
}

export const TaskListPanel: React.FC<TaskListPanelProps> = ({
  tasks,
  taskLists,
  selectedListId,
  prefixes,
  calendarEvents = [],
  onSelectListId,
  onToggleComplete,
  onAddTaskClick,
  onEditTaskClick,
  onDeleteTaskClick,
  onTaskDurationChange,
  onScheduleTaskQuickly,
}) => {
  const [filter, setFilter] = useState<'today' | 'active' | 'week'>('today');
  const [searchQuery, setSearchQuery] = useState('');

  const draggableContainerRef = useRef<HTMLDivElement>(null);

  // Build O(1) schedule lookup cache from calendar events
  const { taskScheduledDateSet } = useMemo(() => {
    return buildTaskScheduleLookup(calendarEvents);
  }, [calendarEvents]);

  // Today's Date String formatted for UI (KST)
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  }, []);

  const { formattedRange: weekRangeFormatted } = useMemo(() => {
    return getKoreaThisWeekRange();
  }, []);

  // Initialize FullCalendar Draggable
  useEffect(() => {
    if (!draggableContainerRef.current) return;

    const draggable = new Draggable(draggableContainerRef.current, {
      itemSelector: '.fc-event-item',
      eventData: (eventEl) => {
        const title = eventEl.getAttribute('data-title') || '할 일';
        const durationMins = parseInt(eventEl.getAttribute('data-duration') || '60', 10);
        const taskId = eventEl.getAttribute('data-id') || '';

        const hours = Math.floor(durationMins / 60);
        const mins = durationMins % 60;
        const durationStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

        return {
          title,
          duration: durationStr,
          create: true,
          extendedProps: {
            taskId: taskId,
          },
        };
      },
    });

    return () => {
      draggable.destroy();
    };
  }, [tasks]);

  // 1. Today's Tasks (Memoized)
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => isTaskDueToday(t, calendarEvents, taskScheduledDateSet));
  }, [tasks, calendarEvents, taskScheduledDateSet]);

  const todayActiveCount = useMemo(() => todayTasks.filter((t) => t.status === 'needsAction').length, [todayTasks]);
  const todayCompletedCount = useMemo(() => todayTasks.filter((t) => t.status === 'completed').length, [todayTasks]);
  const todayTotalCount = todayTasks.length;
  const todayPercent = todayTotalCount > 0 ? Math.round((todayCompletedCount / todayTotalCount) * 100) : 0;

  // 2. This Week's Tasks (Monday ~ Sunday) (Memoized)
  const thisWeekTasks = useMemo(() => {
    return tasks.filter((t) => isTaskDueThisWeek(t, calendarEvents, taskScheduledDateSet));
  }, [tasks, calendarEvents, taskScheduledDateSet]);

  const thisWeekActiveCount = useMemo(() => thisWeekTasks.filter((t) => t.status === 'needsAction').length, [thisWeekTasks]);
  const thisWeekCompletedCount = useMemo(() => thisWeekTasks.filter((t) => t.status === 'completed').length, [thisWeekTasks]);
  const thisWeekTotalCount = thisWeekTasks.length;
  const thisWeekPercent = thisWeekTotalCount > 0 ? Math.round((thisWeekCompletedCount / thisWeekTotalCount) * 100) : 0;

  // 3. Overdue uncompleted tasks (Memoized)
  const overdueTasks = useMemo(() => {
    return tasks.filter((t) => isTaskOverdue(t));
  }, [tasks]);

  // 4. Filtered lists with search query (Memoized)
  const { filteredTodayTasks, filteredOverdueTasks, filteredThisWeekTasks, activeTasks } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = (task: GoogleTask) => {
      if (!query) return true;
      return (
        task.title.toLowerCase().includes(query) ||
        (task.notes && task.notes.toLowerCase().includes(query))
      );
    };

    const today = todayTasks.filter(matchesSearch).sort((a, b) => {
      const aDone = a.status === 'completed' ? 1 : 0;
      const bDone = b.status === 'completed' ? 1 : 0;
      return aDone - bDone;
    });

    const overdue = overdueTasks.filter(matchesSearch);

    const thisWeek = thisWeekTasks.filter(matchesSearch).sort((a, b) => {
      const aDone = a.status === 'completed' ? 1 : 0;
      const bDone = b.status === 'completed' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const aDue = a.due || '9999-99-99';
      const bDue = b.due || '9999-99-99';
      return aDue.localeCompare(bDue);
    });

    const active = tasks
      .filter((t) => t.status === 'needsAction' && (isTaskDueThisWeek(t, calendarEvents, taskScheduledDateSet) || isTaskOverdue(t)))
      .filter(matchesSearch)
      .sort((a, b) => {
        const aDue = a.due || '9999-99-99';
        const bDue = b.due || '9999-99-99';
        return aDue.localeCompare(bDue);
      });

    return {
      filteredTodayTasks: today,
      filteredOverdueTasks: overdue,
      filteredThisWeekTasks: thisWeek,
      activeTasks: active,
    };
  }, [tasks, todayTasks, overdueTasks, thisWeekTasks, searchQuery, calendarEvents, taskScheduledDateSet]);

  // Helper to render task title with custom prefix badge if present
  const renderTaskTitle = (title: string, isCompleted: boolean) => {
    const match = title.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (match) {
      const prefix = match[1];
      const rest = match[2];
      return (
        <span className="flex items-center gap-1 flex-wrap">
          <span className="inline-flex items-center text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
            [{prefix}]
          </span>
          <span className={isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}>
            {rest}
          </span>
        </span>
      );
    }
    return (
      <span className={isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}>
        {title}
      </span>
    );
  };

  const renderDueDateBadge = (task: GoogleTask, isOverdueSection: boolean = false) => {
    if (task.status === 'completed') {
      return (
        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.2 rounded-md shrink-0">
          완료됨
        </span>
      );
    }

    if (isOverdueSection) {
      const dueInfo = formatTaskDueDate(task.due);
      return (
        <span className="text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200/80 px-1.5 py-0.2 rounded-md flex items-center gap-0.5 shrink-0">
          <AlertCircle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
          지난 미완료 ({dueInfo.text})
        </span>
      );
    }

    const isToday = isTaskDueToday(task, calendarEvents, taskScheduledDateSet);
    if (isToday) {
      return (
        <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-md shrink-0">
          오늘
        </span>
      );
    }

    const dueInfo = formatTaskDueDate(task.due);
    if (dueInfo.type === 'tomorrow') {
      return (
        <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200/60 px-1.5 py-0.2 rounded-md shrink-0">
          {dueInfo.text}
        </span>
      );
    } else if (dueInfo.type === 'future') {
      return (
        <span className="text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200/60 px-1.5 py-0.2 rounded-md shrink-0">
          {dueInfo.text}
        </span>
      );
    } else if (dueInfo.type === 'overdue') {
      return (
        <span className="text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200/80 px-1.5 py-0.2 rounded-md flex items-center gap-0.5 shrink-0">
          <AlertCircle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
          {dueInfo.text}
        </span>
      );
    } else {
      return (
        <span className="text-[9px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded-md shrink-0">
          이번 주
        </span>
      );
    }
  };

  const renderTaskCard = (task: GoogleTask, isOverdueSection: boolean = false) => {
    const isCompleted = task.status === 'completed';
    const durationMins = task.durationMinutes || 60;
    const isToday = isTaskDueToday(task, calendarEvents, taskScheduledDateSet);
    const isUpcoming = isTaskUpcoming(task);

    return (
      <div
        key={task.id}
        data-id={task.id}
        data-title={task.title}
        data-duration={durationMins}
        className={`fc-event-item group relative bg-white hover:bg-slate-50/80 border rounded-2xl p-3 transition shadow-2xs hover:shadow-xs flex flex-col gap-2 ${
          isCompleted
            ? 'border-slate-200 opacity-60 bg-slate-50/50'
            : isOverdueSection
            ? 'border-amber-200 bg-amber-50/30 hover:border-amber-400'
            : isToday
            ? 'border-blue-200 hover:border-blue-400'
            : isUpcoming
            ? 'border-purple-200/70 hover:border-purple-400'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Top Row: Drag Handle, Completion Checkbox, Title */}
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          {!isCompleted ? (
            <div
              title="캘린더로 드래그하여 시간 배치"
              className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-blue-600 rounded-md hover:bg-blue-50 shrink-0 mt-0.5 transition"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-5 shrink-0" />
          )}

          {/* Completion Toggle Button */}
          <button
            onClick={() => onToggleComplete(task)}
            className="shrink-0 mt-0.5 text-slate-400 hover:text-blue-600 transition cursor-pointer"
            title={isCompleted ? '미완료로 변경' : '완료로 표시'}
          >
            {isCompleted ? (
              <CheckSquare className="w-4 h-4 text-emerald-600 fill-emerald-50" />
            ) : (
              <Square className="w-4 h-4 text-slate-400 hover:text-blue-600" />
            )}
          </button>

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs font-bold leading-snug break-words">
                {renderTaskTitle(task.title, isCompleted)}
              </h3>
              {renderDueDateBadge(task, isOverdueSection)}
            </div>
            {task.notes && (
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                {task.notes}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Row: Duration selector & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          {/* Scheduled Duration dropdown */}
          <div className="flex items-center gap-1 bg-slate-100/80 px-2 py-0.5 rounded-lg">
            <Clock className="w-3 h-3 text-slate-400" />
            <select
              value={durationMins}
              onChange={(e) => onTaskDurationChange(task.id, parseInt(e.target.value, 10))}
              className="bg-transparent text-[10px] font-semibold text-slate-700 border-none focus:outline-none cursor-pointer"
            >
              <option value={30}>30분</option>
              <option value={60}>1시간</option>
              <option value={90}>1.5시간</option>
              <option value={120}>2시간</option>
            </select>
          </div>

          {/* Quick Schedule, Edit & Delete Buttons */}
          <div className="flex items-center gap-1.5">
            {onScheduleTaskQuickly && !isCompleted && (
              <button
                type="button"
                onClick={() => onScheduleTaskQuickly(task)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition cursor-pointer active:scale-95 shrink-0"
                title="날짜·시간을 정해 캘린더에 등록"
              >
                <CalendarIcon className="w-3 h-3 text-blue-600" />
                <span>캘린더 등록</span>
              </button>
            )}

            <button
              onClick={() => onEditTaskClick(task)}
              className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition cursor-pointer"
              title="수정"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteTaskClick(task)}
              className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
              title="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col shrink-0 md:h-full md:overflow-hidden">
      {/* Header & List Selector */}
      <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50/60 md:shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 text-white rounded-xl shadow-2xs">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base leading-tight">이번 주 할 일</h2>
              <span className="text-[11px] font-semibold text-blue-600">{weekRangeFormatted}</span>
            </div>
          </div>
          <button
            onClick={onAddTaskClick}
            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
            title="상세 할 일 등록 모달 열기"
          >
            <Plus className="w-3.5 h-3.5" />
            상세 등록
          </button>
        </div>

        {/* Task Lists dropdown if multiple lists exist */}
        {taskLists.length > 0 && (
          <div className="my-2">
            <select
              value={selectedListId}
              onChange={(e) => onSelectListId(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {taskLists.length > 1 && (
                <option value="all-lists">
                  📚 모든 할 일 목록 통합 ({thisWeekTotalCount}개)
                </option>
              )}
              {taskLists.map((list) => (
                <option key={list.id} value={list.id}>
                  📁 {list.title}
                </option>
              ))}
            </select>
          </div>
        )}


        {/* Progress Banner */}
        {filter === 'today' ? (
          <div className="hidden md:block p-3 bg-blue-50/60 border border-blue-100 rounded-xl mb-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-1">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />오늘 달성 현황
              </span>
              <span className="text-blue-700 font-extrabold">{todayPercent}%</span>
            </div>
            <div className="text-[11px] text-blue-700 mb-2 font-medium">
              오늘 할 일 <strong className="font-bold text-blue-900">{todayActiveCount}개 남음</strong> / 총 {todayTotalCount}개
            </div>
            <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${todayPercent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="hidden md:block p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl mb-2">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900 mb-1">
              <span className="flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />이번 주 달성 현황
              </span>
              <span className="text-indigo-700 font-extrabold">{thisWeekPercent}%</span>
            </div>
            <div className="text-[11px] text-indigo-700 mb-2 font-medium">
              이번 주 할 일 <strong className="font-bold text-indigo-900">{thisWeekActiveCount}개 남음</strong> / 총 {thisWeekTotalCount}개
            </div>
            <div className="w-full bg-indigo-200/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${thisWeekPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="relative mb-2.5">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="이번 주 할 일 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Filter Tabs (Today / Active / This Week) */}
        <div className="grid grid-cols-3 p-0.5 bg-slate-200/70 rounded-xl text-[11px] font-medium gap-0.5">
          <button
            onClick={() => setFilter('today')}
            className={`py-1.5 text-center rounded-lg transition cursor-pointer font-bold truncate px-1 ${
              filter === 'today'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="오늘의 할 일"
          >
            오늘 ({todayTotalCount})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`py-1.5 text-center rounded-lg transition cursor-pointer font-bold truncate px-1 ${
              filter === 'active'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="미완료 할 일"
          >
            미완료 ({activeTasks.length})
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`py-1.5 text-center rounded-lg transition cursor-pointer font-bold truncate px-1 ${
              filter === 'week'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="이번 주 전체 할 일"
          >
            이번 주 ({thisWeekTotalCount})
          </button>
        </div>
      </div>

      {/* Guide Banner */}
      <div className="hidden md:flex bg-slate-50 border-b border-slate-100 px-3.5 py-2 items-center justify-between text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-slate-600">드래그하여 오른쪽 캘린더에 일정 배치</span>
        </span>
        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
          Drag & Drop
        </span>
      </div>

      {/* Task Item List Container */}
      <div
        ref={draggableContainerRef}
        className="flex-1 md:overflow-y-auto p-3 md:p-3.5 space-y-3"
      >
        {filter === 'today' ? (
          filteredTodayTasks.length === 0 && filteredOverdueTasks.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
              <p className="text-slate-500 font-medium text-xs">오늘 예정되었거나 미완료된 할 일이 없습니다!</p>
              <p className="text-slate-400 text-[11px] mt-1">'이번 주' 탭에서 주간 할 일을 확인하거나 상단에서 추가해 보세요.</p>
            </div>
          ) : (
            <>
              {/* Section 1 - Today's Tasks */}
              {filteredTodayTasks.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                      오늘의 할 일 ({filteredTodayTasks.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {filteredTodayTasks.map((t) => renderTaskCard(t, false))}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-blue-50/40 border border-blue-100 rounded-xl text-center">
                  <p className="text-xs text-blue-800 font-semibold">오늘 마감인 할 일이 없습니다.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">'이번 주' 탭에서 이번 주 할 일을 캘린더로 드래그해 보세요.</p>
                </div>
              )}

              {/* Section 2 - Past Uncompleted Tasks (Overdue) */}
              {filteredOverdueTasks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-amber-200/60 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      지난 미완료 ({filteredOverdueTasks.length})
                    </span>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      기한 지남
                    </span>
                  </div>
                  <div className="space-y-2">
                    {filteredOverdueTasks.map((t) => renderTaskCard(t, true))}
                  </div>
                </div>
              )}
            </>
          )
        ) : filter === 'active' ? (
          activeTasks.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
              <p className="text-slate-500 font-medium text-xs">미완료된 할 일이 없습니다!</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                  <ListTodo className="w-3.5 h-3.5 text-blue-600" />
                  미완료 할 일 ({activeTasks.length})
                </span>
              </div>
              <div className="space-y-2">
                {activeTasks.map((t) => renderTaskCard(t, isTaskOverdue(t)))}
              </div>
            </div>
          )
        ) : (
          filteredThisWeekTasks.length === 0 && filteredOverdueTasks.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CalendarRange className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
              <p className="text-slate-500 font-medium text-xs">이번 주({weekRangeFormatted})에 예정된 할 일이 없습니다!</p>
              <p className="text-slate-400 text-[11px] mt-1">상단의 빠른 등록으로 이번 주 할 일을 등록해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* This Week Section */}
              {filteredThisWeekTasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                      <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
                      이번 주 할 일 ({filteredThisWeekTasks.length})
                    </span>
                    <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {weekRangeFormatted}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {filteredThisWeekTasks.map((t) => renderTaskCard(t, false))}
                  </div>
                </div>
              )}

              {/* Overdue Section */}
              {filteredOverdueTasks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-amber-200/60 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      지난 미완료 ({filteredOverdueTasks.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {filteredOverdueTasks.map((t) => renderTaskCard(t, true))}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </aside>
  );
};

