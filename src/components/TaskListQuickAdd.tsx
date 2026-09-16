import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { getKoreaTodayYYYYMMDD } from '../utils/dateUtils';

interface TaskListQuickAddProps {
  prefixes: string[];
  onQuickAddTask: (taskData: { title: string; notes?: string; due?: string }) => void;
}

export const TaskListQuickAdd: React.FC<TaskListQuickAddProps> = ({
  prefixes,
  onQuickAddTask,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPrefix, setQuickPrefix] = useState(prefixes[0] || '');

  useEffect(() => {
    if (prefixes.length > 0 && (!quickPrefix || !prefixes.includes(quickPrefix))) {
      setQuickPrefix(prefixes[0]);
    }
  }, [prefixes, quickPrefix]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const trimmedBody = quickTitle.trim();
    const finalTitle = quickPrefix ? `[${quickPrefix}] ${trimmedBody}` : trimmedBody;

    const todayYYYYMMDD = getKoreaTodayYYYYMMDD();
    onQuickAddTask({
      title: finalTitle,
      due: `${todayYYYYMMDD}T00:00:00.000Z`,
    });

    setQuickTitle('');
  };

  return (
    <form onSubmit={handleQuickSubmit} className="mb-2">
      <div className="flex items-center gap-1.5 p-1.5 bg-blue-50/70 border border-blue-200/90 rounded-2xl">
        {/* Prefix Selector in Panel */}
        <div className="relative shrink-0">
          <select
            value={quickPrefix}
            onChange={(e) => setQuickPrefix(e.target.value)}
            className="text-[11px] font-extrabold bg-white border border-blue-200 rounded-xl px-2 py-1.5 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer max-w-[85px] truncate"
            title="어두(접두어) 선택"
          >
            <option value="">(어두없음)</option>
            {prefixes.map((p) => (
              <option key={p} value={p}>
                [{p}]
              </option>
            ))}
          </select>
        </div>

        {/* Task Title Input */}
        <input
          type="text"
          placeholder="이번 주 할 일 입력... (Enter)"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          className="flex-1 min-w-0 text-xs px-2.5 py-1.5 bg-white border border-blue-200/90 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
        />
        <button
          type="submit"
          className="p-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition cursor-pointer shrink-0 shadow-2xs"
          title="빠른 등록"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
