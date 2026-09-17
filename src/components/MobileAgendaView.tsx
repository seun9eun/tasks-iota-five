import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, CheckSquare, Square, CalendarDays } from 'lucide-react';
import { GoogleCalendarEvent, GoogleTask, GoogleCalendarListEntry } from '../types';
import { getKoreaTodayYYYYMMDD, getKoreaThisWeekRange } from '../utils/dateUtils';

interface MobileAgendaViewProps {
  events: GoogleCalendarEvent[];
  tasks: GoogleTask[];
  calendars?: GoogleCalendarListEntry[];
  onToggleTaskComplete: (task: GoogleTask) => void;
  onEventClick: (event: GoogleCalendarEvent) => void;
  onEditTaskClick?: (task: GoogleTask) => void;
  onDateSelect: (startISO: string, endISO: string) => void;
}

interface AgendaItem {
  key: string;
  /** Epoch ms of the start; 0 for all-day and task rows so they sort first. */
  sortKey: number;
  timeLabel: string;
  title: string;
  color: string;
  task?: GoogleTask;
  event?: GoogleCalendarEvent;
}

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

/** Shift a YYYY-MM-DD string by n days (UTC noon avoids DST/timezone edges). */
function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function formatHm(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const MobileAgendaView: React.FC<MobileAgendaViewProps> = ({
  events,
  tasks,
  calendars = [],
  onToggleTaskComplete,
  onEventClick,
  onEditTaskClick,
  onDateSelect,
}) => {
  const todayYMD = getKoreaTodayYYYYMMDD();
  const [weekStart, setWeekStart] = useState(() => getKoreaThisWeekRange().startOfWeekYMD);
  const [selectedYMD, setSelectedYMD] = useState(todayYMD);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const calColor = useMemo(() => {
    const map = new Map<string, string>();
    calendars.forEach((c) => map.set(c.id, c.backgroundColor || '#3b82f6'));
    return map;
  }, [calendars]);

  /** YYYY-MM-DD -> items on that day, sorted (all-day first, then by start time). */
  const itemsByDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    const push = (ymd: string, item: AgendaItem) => {
      const list = map.get(ymd);
      if (list) list.push(item);
      else map.set(ymd, [item]);
    };

    const scheduledTaskIds = new Set(events.map((ev) => (ev as any).taskId).filter(Boolean));

    events.forEach((ev) => {
      const color = ev.backgroundColor || calColor.get(ev.calendarId || 'primary') || '#3b82f6';
      const linkedTaskId = (ev as any).taskId;
      const linkedTask = linkedTaskId ? tasks.find((t) => t.id === linkedTaskId) : undefined;

      if (ev.start.dateTime) {
        push(getKoreaTodayYYYYMMDD(ev.start.dateTime), {
          key: ev.id,
          sortKey: Date.parse(ev.start.dateTime),
          timeLabel: formatHm(ev.start.dateTime),
          title: ev.summary,
          color,
          task: linkedTask,
          event: ev,
        });
        return;
      }

      // All-day event: Google's end.date is exclusive, so repeat it across every covered day.
      const startYMD = ev.start.date || todayYMD;
      const endExclusive = ev.end?.date || addDays(startYMD, 1);
      let ymd = startYMD;
      for (let guard = 0; ymd < endExclusive && guard < 60; guard++) {
        push(ymd, {
          key: `${ev.id}-${ymd}`,
          sortKey: 0,
          timeLabel: '종일',
          title: ev.summary,
          color,
          task: linkedTask,
          event: ev,
        });
        ymd = addDays(ymd, 1);
      }
    });

    tasks
      .filter((t) => t.due && !scheduledTaskIds.has(t.id))
      .forEach((t) => {
        push(getKoreaTodayYYYYMMDD(t.due), {
          key: `task-${t.id}`,
          sortKey: 0,
          timeLabel: '할 일',
          title: t.title,
          color: t.status === 'completed' ? '#22c55e' : '#a855f7',
          task: t,
        });
      });

    map.forEach((list) => list.sort((a, b) => a.sortKey - b.sortKey));
    return map;
  }, [events, tasks, calColor, todayYMD]);

  const selectedItems = itemsByDay.get(selectedYMD) || [];
  const [selYear, selMonth, selDay] = selectedYMD.split('-').map(Number);
  const selWeekdayIndex = weekDays.indexOf(selectedYMD);
  const selWeekday = selWeekdayIndex >= 0 ? WEEKDAY_LABELS[selWeekdayIndex] : '';

  const goWeek = (delta: number) => {
    const next = addDays(weekStart, delta * 7);
    setWeekStart(next);
    setSelectedYMD(next);
  };

  const goToday = () => {
    setWeekStart(getKoreaThisWeekRange().startOfWeekYMD);
    setSelectedYMD(todayYMD);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-2 p-3 border-b border-slate-100">
        <button
          type="button"
          onClick={() => goWeek(-1)}
          className="p-1.5 rounded-xl border border-slate-200 text-slate-600 active:bg-slate-100"
          aria-label="이전 주"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-slate-800">
          {Number(weekStart.slice(5, 7))}월 {Number(weekStart.slice(8, 10))}일 ~{' '}
          {Number(weekDays[6].slice(5, 7))}월 {Number(weekDays[6].slice(8, 10))}일
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToday}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold active:bg-slate-200"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => goWeek(1)}
            className="p-1.5 rounded-xl border border-slate-200 text-slate-600 active:bg-slate-100"
            aria-label="다음 주"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day strip: dots indicate how many items that day holds */}
      <div className="grid grid-cols-7 gap-1 p-2 border-b border-slate-100">
        {weekDays.map((ymd, i) => {
          const count = (itemsByDay.get(ymd) || []).length;
          const isSelected = ymd === selectedYMD;
          const isToday = ymd === todayYMD;
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => setSelectedYMD(ymd)}
              className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : isToday
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 active:bg-slate-100'
              }`}
            >
              <span
                className={`text-[10px] font-semibold ${
                  isSelected
                    ? 'text-blue-100'
                    : i === 6
                    ? 'text-red-500'
                    : i === 5
                    ? 'text-blue-500'
                    : ''
                }`}
              >
                {WEEKDAY_LABELS[i]}
              </span>
              <span className="text-sm font-extrabold leading-none">{Number(ymd.slice(8, 10))}</span>
              <span className="flex items-center gap-0.5 h-1.5">
                {Array.from({ length: Math.min(count, 3) }).map((_, d) => (
                  <span
                    key={d}
                    className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`}
                  />
                ))}
                {count > 3 && (
                  <span
                    className={`text-[8px] font-bold leading-none ${
                      isSelected ? 'text-white' : 'text-blue-500'
                    }`}
                  >
                    +
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
            {selYear}년 {selMonth}월 {selDay}일{selWeekday && ` (${selWeekday})`}
          </span>
          <span className="text-[11px] font-semibold text-slate-500">{selectedItems.length}건</span>
        </div>

        {selectedItems.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-8">이 날짜에 일정이 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {selectedItems.map((item) => (
              <li key={item.key}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (item.task && onEditTaskClick) onEditTaskClick(item.task);
                    else if (item.event) onEventClick(item.event);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    if (item.task && onEditTaskClick) onEditTaskClick(item.task);
                    else if (item.event) onEventClick(item.event);
                  }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white text-left active:bg-slate-50 cursor-pointer"
                >
                  <span
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[11px] font-bold text-slate-500 w-11 shrink-0 tabular-nums">
                    {item.timeLabel}
                  </span>
                  <span
                    className={`flex-1 min-w-0 truncate text-xs font-semibold ${
                      item.task?.status === 'completed'
                        ? 'line-through text-slate-400'
                        : 'text-slate-800'
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.task && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTaskComplete(item.task!);
                      }}
                      className="shrink-0 p-1"
                      title={item.task.status === 'completed' ? '미완료로 변경' : '완료로 변경'}
                    >
                      {item.task.status === 'completed' ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => onDateSelect(`${selectedYMD}T09:00:00`, `${selectedYMD}T10:00:00`)}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-700 text-xs font-bold active:bg-blue-50"
        >
          <Plus className="w-3.5 h-3.5" />이 날짜에 일정 추가
        </button>
      </div>
    </div>
  );
};
