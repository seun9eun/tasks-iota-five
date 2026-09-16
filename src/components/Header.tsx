import React from 'react';
import { AuthUser, QuickShortcut } from '../types';
import { QuickShortcuts } from './QuickShortcuts';
import { Calendar, CheckSquare, RefreshCw, LogOut, Sparkles, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isSyncing: boolean;
  shortcuts: QuickShortcut[];
  onUpdateShortcuts: (shortcuts: QuickShortcut[]) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isAuthenticated,
  isSyncing,
  shortcuts,
  onUpdateShortcuts,
  onSignIn,
  onSignOut,
  onRefresh,
}) => {
  return (
    <header className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-2.5 sm:py-3.5 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-xs z-20">
      {/* Title & Logo */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0">
          <div className="relative">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            <CheckSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3 absolute -bottom-1 -right-1 text-blue-200 bg-blue-700 rounded-xs" />
          </div>
        </div>
        <div>
          <h1 className="text-sm sm:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-1.5 sm:gap-2">
            구글 태스크 & 캘린더
            {isAuthenticated ? (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 sm:px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                연동됨
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60 px-2 sm:px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-amber-600" />
                체험 모드
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 hidden md:block">
            할 일을 드래그하여 캘린더 일정으로 등록하고 실시간 관리하세요
          </p>
        </div>
      </div>

      {/* Middle/Right Quick Shortcuts Bar & Account Actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Quick Shortcuts */}
        <div className="border-r border-slate-200/80 pr-2 sm:pr-3 my-0.5">
          <QuickShortcuts shortcuts={shortcuts} onUpdateShortcuts={onUpdateShortcuts} />
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isSyncing}
          title="데이터 새로고침"
          className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || '사용자'}
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {user.displayName ? user.displayName[0] : 'G'}
                </div>
              )}
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {user.displayName || '구글 사용자'}
                </div>
                <div className="text-[11px] text-slate-500 max-w-[150px] truncate">
                  {user.email}
                </div>
              </div>
            </div>

            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">연동 해제</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs hover:shadow-xs px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-98"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            구글 계정 연동
          </button>
        )}
      </div>
    </header>
  );
};
