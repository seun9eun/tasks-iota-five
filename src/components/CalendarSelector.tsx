import React, { useState } from 'react';
import { GoogleCalendarListEntry, GoogleCalendarEvent } from '../types';
import { Calendar, Check, Layers, ChevronDown, ChevronUp } from 'lucide-react';

interface CalendarSelectorProps {
  calendars: GoogleCalendarListEntry[];
  selectedCalendarIds: string[];
  events?: GoogleCalendarEvent[];
  onToggleCalendar: (calendarId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const CalendarSelector: React.FC<CalendarSelectorProps> = ({
  calendars,
  selectedCalendarIds,
  events = [],
  onToggleCalendar,
  onSelectAll,
  onDeselectAll,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (calendars.length === 0) return null;

  const allSelected = calendars.every((c) => selectedCalendarIds.includes(c.id));

  return (
    <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 mb-3 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              내 캘린더 목록 ({selectedCalendarIds.length}/{calendars.length} 선택)
            </h3>
            <p className="text-[11px] text-slate-500">
              체크한 캘린더의 일정이 화면에 함께 표시됩니다
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50 transition cursor-pointer"
          >
            {allSelected ? '전체 해제' : '전체 선택'}
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
            title={isExpanded ? '접기' : '펼치기'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
          {calendars.map((cal) => {
            const isChecked = selectedCalendarIds.includes(cal.id);
            const calColor = cal.backgroundColor || '#3b82f6';
            const count = events.filter((e) => (e.calendarId || 'primary') === cal.id).length;

            return (
              <button
                type="button"
                key={cal.id}
                onClick={() => onToggleCalendar(cal.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer select-none active:scale-95 ${
                  isChecked
                    ? 'bg-white border-slate-300 text-slate-800 shadow-2xs hover:border-slate-400'
                    : 'bg-slate-100/70 border-slate-200 text-slate-400 line-through hover:bg-slate-100'
                }`}
              >
                {/* Color Dot with Check icon */}
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-white transition"
                  style={{ backgroundColor: isChecked ? calColor : '#cbd5e1' }}
                >
                  {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>

                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                  {cal.summary} {cal.primary && <span className="text-[10px] text-blue-600 font-bold ml-0.5">(기본)</span>}
                </span>

                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isChecked ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/60 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
