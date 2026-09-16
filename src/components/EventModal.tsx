import React, { useState, useEffect } from 'react';
import { GoogleCalendarEvent, GoogleCalendarListEntry } from '../types';
import { X, Calendar, Clock, MapPin, Trash2, ExternalLink, Layers } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  event: GoogleCalendarEvent | null; // null for new event
  initialStartISO?: string;
  initialEndISO?: string;
  calendars?: GoogleCalendarListEntry[];
  onClose: () => void;
  onSave: (eventData: {
    summary: string;
    description?: string;
    start: { dateTime: string };
    end: { dateTime: string };
    location?: string;
    calendarId?: string;
  }) => void;
  onDelete?: (eventId: string, calendarId?: string) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  event,
  initialStartISO,
  initialEndISO,
  calendars = [],
  onClose,
  onSave,
  onDelete,
}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [selectedCalId, setSelectedCalId] = useState('primary');

  // Helper to format ISO to datetime-local input string (YYYY-MM-DDTHH:mm)
  const formatIsoForInput = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      // Local ISO string adjustment
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localIso = new Date(d.getTime() - tzOffset).toISOString();
      return localIso.slice(0, 16);
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (event) {
      setSummary(event.summary || '');
      setDescription(event.description || '');
      setLocation(event.location || '');
      setStartDateTime(formatIsoForInput(event.start?.dateTime || event.start?.date));
      setEndDateTime(formatIsoForInput(event.end?.dateTime || event.end?.date));
      setSelectedCalId(event.calendarId || 'primary');
    } else {
      setSummary('');
      setDescription('');
      setLocation('');
      setStartDateTime(formatIsoForInput(initialStartISO || new Date().toISOString()));
      
      const defaultEnd = initialEndISO || new Date(Date.now() + 3600000).toISOString();
      setEndDateTime(formatIsoForInput(defaultEnd));
      setSelectedCalId(calendars.length > 0 ? calendars[0].id : 'primary');
    }
  }, [event, initialStartISO, initialEndISO, isOpen, calendars]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !startDateTime || !endDateTime) return;

    onSave({
      summary: summary.trim(),
      description: description.trim() || undefined,
      start: { dateTime: new Date(startDateTime).toISOString() },
      end: { dateTime: new Date(endDateTime).toISOString() },
      location: location.trim() || undefined,
      calendarId: selectedCalId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {event ? '일정 상세 및 수정' : '새 일정 추가'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                일정 제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="예: 팀 주간 회의"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* Calendar Selector Dropdown */}
            {calendars.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-500" /> 등록할 캘린더 선택
                </label>
                <select
                  value={selectedCalId}
                  onChange={(e) => setSelectedCalId(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.summary} {cal.primary ? '(기본 캘린더)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> 시작 시간
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> 종료 시간
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" /> 장소 (선택)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="예: 회의실 B 또는 Google Meet"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                상세 설명 (선택)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="일정 관련 참고사항..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
              />
            </div>

            {event?.htmlLink && (
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                구글 캘린더 웹에서 보기
              </a>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
            {event && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                일정 삭제
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer"
              >
                {event ? '수정 저장' : '등록하기'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
