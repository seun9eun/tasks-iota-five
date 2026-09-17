import React, { useState, useEffect } from 'react';
import { PlusCircle, Settings } from 'lucide-react';

interface QuickAddCardProps {
  prefixes: string[];
  onQuickAdd: (taskData: { title: string; due?: string }) => void;
  onOpenPrefixManager: () => void;
}

export const QuickAddCard: React.FC<QuickAddCardProps> = ({
  prefixes,
  onQuickAdd,
  onOpenPrefixManager,
}) => {
  const [title, setTitle] = useState('');
  const [prefix, setPrefix] = useState(prefixes[0] || '');

  // Keep prefix in sync if prefixes list changes
  useEffect(() => {
    if (prefixes.length > 0 && (!prefix || !prefixes.includes(prefix))) {
      setPrefix(prefixes[0]);
    }
  }, [prefixes, prefix]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const trimmedBody = title.trim();
    const finalTitle = prefix ? `[${prefix}] ${trimmedBody}` : trimmedBody;

    onQuickAdd({
      title: finalTitle,
    });

    setTitle('');
  };

  // On a phone this is one input line on the page ground; from sm: up it becomes
  // the blue tile that anchors the top row of the dashboard.
  return (
    <div className="col-span-2 sm:col-span-1 sm:bg-blue-600 sm:rounded-2xl sm:p-4 sm:text-white sm:shadow-md sm:shadow-blue-600/15 sm:hover:shadow-lg flex flex-col justify-between transition">
      <div className="hidden sm:flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
          <PlusCircle className="w-3.5 h-3.5 text-blue-200" />
          빠른 등록
        </span>
        <button
          type="button"
          onClick={onOpenPrefixManager}
          className="text-[10px] bg-white/20 hover:bg-white/30 text-white font-medium px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1"
          title="어두 설정"
        >
          <Settings className="w-3 h-3" />
          어두 설정
        </button>
      </div>

      <form onSubmit={handleSubmit} className="sm:mt-1.5 flex items-center gap-1.5">
        <select
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          className="text-xs font-extrabold rounded-xl px-2 py-2 sm:py-1.5 focus:outline-none cursor-pointer shrink-0 max-w-[92px] sm:max-w-[100px] truncate bg-white border border-slate-200 text-blue-800 sm:bg-blue-700/90 sm:text-white sm:border-blue-400/50 sm:focus:bg-blue-800"
          aria-label="어두 선택"
        >
          <option value="" className="text-slate-800 font-semibold bg-white">
            선택 안함
          </option>
          {prefixes.map((p) => (
            <option key={p} value={p} className="text-slate-800 font-semibold bg-white">
              [{p}]
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="새 할 일 입력... (Enter)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 min-w-0 rounded-xl px-2.5 py-2 sm:py-1.5 text-xs font-medium transition bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 sm:bg-blue-700/60 sm:border-blue-400/40 sm:text-white sm:placeholder-blue-200/80 sm:focus:bg-blue-700 sm:focus:border-white sm:shadow-inner"
        />
        <button
          type="button"
          onClick={onOpenPrefixManager}
          className="sm:hidden shrink-0 p-2 rounded-xl bg-white border border-slate-200 text-slate-500 active:bg-slate-100 transition"
          title="어두 설정"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </form>

      <div className="hidden sm:flex text-[10px] text-blue-200/80 mt-1 items-center justify-between">
        <span>오늘 마감 할 일로 빠르게 추가됩니다</span>
      </div>
    </div>
  );
};
