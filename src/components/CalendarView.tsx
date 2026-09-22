import React, { useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { GoogleCalendarEvent, GoogleTask, GoogleCalendarListEntry, TASK_EVENT_ID_PREFIX } from '../types';
import { getKoreaTodayYYYYMMDD } from '../utils/dateUtils';
import { CheckSquare, Square, CheckCircle2 } from 'lucide-react';

interface CalendarViewProps {
  events: GoogleCalendarEvent[];
  tasks: GoogleTask[];
  calendars?: GoogleCalendarListEntry[];
  onToggleTaskComplete: (task: GoogleTask) => void;
  onEventReceiveFromTask: (title: string, startISO: string, endISO: string, taskId?: string) => void;
  onEventChangeTime: (eventId: string, newStartISO: string, newEndISO: string) => void;
  onEventClick: (event: GoogleCalendarEvent) => void;
  onDateSelect: (startISO: string, endISO: string) => void;
  onEditTaskClick?: (task: GoogleTask) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  tasks,
  calendars = [],
  onToggleTaskComplete,
  onEventReceiveFromTask,
  onEventChangeTime,
  onEventClick,
  onDateSelect,
  onEditTaskClick,
}) => {
  const calendarRef = useRef<any>(null);

  // Helper map for calendar colors
  const calMap = new Map<string, GoogleCalendarListEntry>();
  calendars.forEach((c) => calMap.set(c.id, c));

  // Track task IDs already present in events
  const scheduledTaskIds = new Set(
    events
      .map((ev) => (ev as any).taskId)
      .filter(Boolean)
  );

  // 1. Format regular Calendar Events (and those linked to Tasks)
  const formattedCalendarEvents = events.map((ev) => {
    const startStr = ev.start.dateTime || ev.start.date || new Date().toISOString();
    const endStr =
      ev.end.dateTime || ev.end.date || new Date(new Date(startStr).getTime() + 3600000).toISOString();
    const isAllDay = !ev.start.dateTime && !!ev.start.date;

    const linkedTaskId = (ev as any).taskId;
    const linkedTask = linkedTaskId ? tasks.find((t) => t.id === linkedTaskId) : null;

    const isTask = !!linkedTask;
    const isCompleted = linkedTask?.status === 'completed';

    // Determine calendar color
    const calId = ev.calendarId || 'primary';
    const calInfo = calMap.get(calId);
    const eventColor = ev.backgroundColor || calInfo?.backgroundColor || '#3b82f6';

    return {
      id: ev.id,
      title: ev.summary,
      start: startStr,
      end: endStr,
      allDay: isAllDay,
      backgroundColor: isTask
        ? isCompleted
          ? '#ecfdf5' // emerald-50
          : '#f0f9ff' // blue-50
        : eventColor,
      borderColor: isTask
        ? isCompleted
          ? '#10b981'
          : '#3b82f6'
        : eventColor,
      textColor: isTask
        ? isCompleted
          ? '#047857'
          : '#1d4ed8'
        : '#ffffff',
      extendedProps: {
        rawGoogleEvent: ev,
        isTask,
        rawTask: linkedTask,
        description: ev.description,
        location: ev.location,
        calendarSummary: calInfo?.summary,
      },
    };
  });

  // 2. Format Tasks with due dates that are NOT yet scheduled on calendar slots
  const unlinkedTaskEvents = tasks
    .filter((task) => task.due && !scheduledTaskIds.has(task.id))
    .map((task) => {
      const isCompleted = task.status === 'completed';
      // Normalize due date to YYYY-MM-DD string to ensure exact day matching regardless of browser timezone
      const dueDayStr = getKoreaTodayYYYYMMDD(task.due);

      return {
        id: `${TASK_EVENT_ID_PREFIX}${task.id}`,
        title: task.title,
        start: dueDayStr,
        allDay: true,
        backgroundColor: isCompleted ? '#f0fdf4' : '#faf5ff',
        borderColor: isCompleted ? '#22c55e' : '#a855f7',
        textColor: isCompleted ? '#15803d' : '#7e22ce',
        extendedProps: {
          isTask: true,
          rawTask: task,
          description: task.notes,
        },
      };
    });

  const allFormattedEvents = [...formattedCalendarEvents, ...unlinkedTaskEvents];

  return (
    <div className="flex-1 bg-white p-3.5 md:p-4 rounded-2xl shadow-2xs border border-slate-200 overflow-hidden flex flex-col h-full">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        buttonText={{
          today: '오늘',
          month: '월간',
          week: '주간',
          day: '일간',
        }}
        locale="ko"
        timeZone="local"
        editable={true}
        droppable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        height="100%"
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        events={allFormattedEvents}
        eventContent={(eventInfo) => {
          const isTask = eventInfo.event.extendedProps?.isTask;
          const rawTask = eventInfo.event.extendedProps?.rawTask as GoogleTask | undefined;
          const isCompleted = rawTask?.status === 'completed';

          if (isTask && rawTask) {
            return (
              <div className="flex items-center gap-1.5 px-1 py-0.5 overflow-hidden w-full text-xs font-semibold leading-tight">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTaskComplete(rawTask);
                  }}
                  className="shrink-0 p-0.5 hover:scale-110 transition cursor-pointer"
                  title={isCompleted ? '미완료로 변경' : '완료로 변경'}
                >
                  {isCompleted ? (
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-500 hover:text-blue-600" />
                  )}
                </button>
                <span
                  className={`truncate ${
                    isCompleted ? 'line-through opacity-60 text-emerald-800' : ''
                  }`}
                >
                  [할일] {eventInfo.event.title}
                </span>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1 px-1 py-0.5 truncate text-xs font-medium">
              <span className="truncate">{eventInfo.event.title}</span>
            </div>
          );
        }}
        eventReceive={(info) => {
          const title = info.event.title;
          const startISO = info.event.startStr;
          let endISO = info.event.endStr;

          if (!endISO && info.event.start) {
            endISO = new Date(info.event.start.getTime() + 60 * 60 * 1000).toISOString();
          }

          const taskId = info.event.extendedProps?.taskId;
          info.event.remove();
          onEventReceiveFromTask(title, startISO, endISO, taskId);
        }}
        eventDrop={(info) => {
          const eventId = info.event.id;
          const startISO = info.event.startStr;
          let endISO = info.event.endStr;
          if (!endISO && info.event.start) {
            endISO = new Date(info.event.start.getTime() + 60 * 60 * 1000).toISOString();
          }
          onEventChangeTime(eventId, startISO, endISO);
        }}
        eventResize={(info) => {
          const eventId = info.event.id;
          const startISO = info.event.startStr;
          let endISO = info.event.endStr;
          if (!endISO && info.event.start) {
            endISO = new Date(info.event.start.getTime() + 60 * 60 * 1000).toISOString();
          }
          onEventChangeTime(eventId, startISO, endISO);
        }}
        eventClick={(info) => {
          const isTask = info.event.extendedProps?.isTask;
          const rawTask = info.event.extendedProps?.rawTask as GoogleTask | undefined;

          if (isTask && rawTask && onEditTaskClick) {
            onEditTaskClick(rawTask);
            return;
          }

          const raw = info.event.extendedProps?.rawGoogleEvent as GoogleCalendarEvent;
          if (raw) {
            onEventClick(raw);
          } else {
            onEventClick({
              id: info.event.id,
              summary: info.event.title,
              start: { dateTime: info.event.startStr },
              end: { dateTime: info.event.endStr },
              description: info.event.extendedProps?.description,
              location: info.event.extendedProps?.location,
            });
          }
        }}
        select={(info) => {
          onDateSelect(info.startStr, info.endStr);
        }}
      />
    </div>
  );
};
