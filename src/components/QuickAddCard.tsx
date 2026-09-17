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

  return (
    <div className="col-span-2 sm:col-span-1 bg-blue-600 rounded-2xl p-3 sm:p-4 text-white flex flex-col justify-between shadow-md shadow-blue-600/15 hover:shadow-lg transition">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] sm:text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
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

      <form onSubmit={handleSubmit} className="mt-1 sm:mt-1.5 flex items-center gap-1.5">
        <select
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          className="text-xs font-extrabold bg-blue-700/90 text-white border border-blue-400/50 rounded-xl px-2 py-1.5 focus:outline-none focus:bg-blue-800 cursor-pointer shrink-0 max-w-[100px] truncate"
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
          placeholder="새 할 일 빠르게 입력... (Enter)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 min-w-0 bg-blue-700/60 border border-blue-400/40 rounded-xl px-2.5 py-1.5 text-xs font-medium text-white placeholder-blue-200/80 focus:outline-none focus:bg-blue-700 focus:border-white transition shadow-inner"
        />
      </form>

      <div className="text-[10px] text-blue-200/80 mt-1 flex items-center justify-between">
        <span>오늘 마감 할 일로 빠르게 추가됩니다</span>
      </div>
    </div>
  );
};
