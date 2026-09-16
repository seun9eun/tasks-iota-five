import { GoogleTask, GoogleCalendarEvent, GoogleTaskList, GoogleCalendarListEntry } from '../types';
import { getKoreaTodayYYYYMMDD } from '../utils/dateUtils';

export const INITIAL_DEMO_CALENDARS: GoogleCalendarListEntry[] = [
  {
    id: 'primary',
    summary: '기본 캘린더 (Primary)',
    primary: true,
    backgroundColor: '#3b82f6', // blue
    foregroundColor: '#ffffff',
    selected: true,
  },
  {
    id: 'demo-cal-work',
    summary: '업무 및 프로젝트',
    primary: false,
    backgroundColor: '#10b981', // emerald
    foregroundColor: '#ffffff',
    selected: true,
  },
  {
    id: 'demo-cal-personal',
    summary: '개인 / 일상 스케줄',
    primary: false,
    backgroundColor: '#8b5cf6', // purple
    foregroundColor: '#ffffff',
    selected: true,
  },
];

export const INITIAL_DEMO_TASK_LISTS: GoogleTaskList[] = [
  { id: 'demo-list-default', title: '기본 할 일 목록' },
  { id: 'demo-list-work', title: '업무 관련' },
];

export function getInitialDemoTasks(): GoogleTask[] {
  const todayStr = getKoreaTodayYYYYMMDD();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getKoreaTodayYYYYMMDD(tomorrowDate);

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getKoreaTodayYYYYMMDD(yesterdayDate);

  return [
    {
      id: 'demo-task-1',
      title: '주간 업무 보고서 작성',
      notes: '상반기 주요 성과 및 다음 주 핵심 목표 정리',
      status: 'needsAction',
      due: `${todayStr}T09:00:00.000Z`,
      durationMinutes: 60,
      tasklistId: 'demo-list-default',
    },
    {
      id: 'demo-task-2',
      title: '클라이언트 미팅 준비',
      notes: '발표 자료 슬라이드 및 시연 데모 링크 점검',
      status: 'needsAction',
      due: `${todayStr}T10:00:00.000Z`,
      durationMinutes: 120,
      tasklistId: 'demo-list-default',
    },
    {
      id: 'demo-task-overdue',
      title: '어제 미처 못 마친 데이터베이스 백업',
      notes: '기한이 지난 할 일입니다. (지난 미완료 항목)',
      status: 'needsAction',
      due: `${yesterdayStr}T17:00:00.000Z`,
      durationMinutes: 45,
      tasklistId: 'demo-list-default',
    },
    {
      id: 'demo-task-3',
      title: '디자인 시스템 업데이트',
      notes: '버튼 컴포넌트 변주 및 색상 토큰 표준화 작업',
      status: 'needsAction',
      due: `${todayStr}T14:00:00.000Z`,
      durationMinutes: 90,
      tasklistId: 'demo-list-default',
    },
    {
      id: 'demo-task-4',
      title: '분기 실적 분석 발표',
      notes: '지표 대시보드 그래프 작성',
      status: 'needsAction',
      due: `${tomorrowStr}T11:00:00.000Z`,
      durationMinutes: 60,
      tasklistId: 'demo-list-work',
    },
    {
      id: 'demo-task-5',
      title: '신규 기능 요구사항 정의서 검토',
      notes: '백엔드 API 규격 확정 (오늘 완료됨)',
      status: 'completed',
      due: `${todayStr}T16:00:00.000Z`,
      durationMinutes: 45,
      tasklistId: 'demo-list-default',
    },
    {
      id: 'demo-task-yesterday-done',
      title: '어제 완료된 기획안 최종 송부',
      notes: '어제 이미 다 마친 할 일 (오늘 목록에서 제외됨)',
      status: 'completed',
      due: `${yesterdayStr}T14:00:00.000Z`,
      durationMinutes: 30,
      tasklistId: 'demo-list-default',
    },
  ];
}

export const INITIAL_DEMO_TASKS = getInitialDemoTasks();

export function getInitialDemoEvents(): GoogleCalendarEvent[] {
  const getIsoForKst = (daysOffset: number, hour: number, min: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const ymd = getKoreaTodayYYYYMMDD(d);
    const hStr = String(hour).padStart(2, '0');
    const mStr = String(min).padStart(2, '0');
    return `${ymd}T${hStr}:${mStr}:00+09:00`;
  };

  return [
    {
      id: 'demo-event-1',
      summary: '주간 팀 동기화 회의',
      description: '팀별 진척 상황 공유 및 이슈 체크',
      location: '온라인 (Google Meet)',
      start: { dateTime: getIsoForKst(0, 10, 0) },
      end: { dateTime: getIsoForKst(0, 11, 30) },
      calendarId: 'primary',
      backgroundColor: '#3b82f6',
    },
    {
      id: 'demo-event-2',
      summary: '신규 프로젝트 킥오프',
      description: '프로젝트 범위 확정 및 담당자 지정',
      location: '대회의실 3층',
      start: { dateTime: getIsoForKst(1, 14, 0) },
      end: { dateTime: getIsoForKst(1, 15, 30) },
      calendarId: 'demo-cal-work',
      backgroundColor: '#10b981',
    },
    {
      id: 'demo-event-3',
      summary: '개인건강검진 및 운동 스케줄',
      description: '정기 검진 수령 및 헬스장',
      start: { dateTime: getIsoForKst(2, 11, 0) },
      end: { dateTime: getIsoForKst(2, 12, 0) },
      calendarId: 'demo-cal-personal',
      backgroundColor: '#8b5cf6',
    },
  ];
}
