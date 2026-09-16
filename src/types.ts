export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string; // ISO string
  completed?: string; // ISO string
  position?: string;
  updated?: string;
  durationMinutes?: number; // default duration when scheduling on calendar (e.g., 60 mins)
  tasklistId?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleEventTime {
  dateTime?: string; // e.g. "2026-07-27T10:00:00+09:00"
  date?: string; // "2026-07-27" for all-day events
  timeZone?: string;
}

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: GoogleEventTime;
  end: GoogleEventTime;
  location?: string;
  colorId?: string;
  status?: string;
  htmlLink?: string;
  calendarId?: string;
  calendarSummary?: string;
  backgroundColor?: string;
}

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface CalendarViewEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    description?: string;
    location?: string;
    rawGoogleEvent?: GoogleCalendarEvent;
    taskId?: string;
  };
}

export interface QuickShortcut {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

