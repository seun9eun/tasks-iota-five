import React, { useState, useEffect } from 'react';
import { GoogleTask } from '../types';
import { getKoreaTodayYYYYMMDD, getKoreaISOString } from '../utils/dateUtils';
import { X, CheckSquare, Tag, Settings } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  task: GoogleTask | null; // null for new task
  prefixes: string[];
  onClose: () => void;
  onSave: (taskData: { title: string; notes?: string; due?: string }) => void;
  onOpenPrefixManager: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  task,
  prefixes,
  onClose,
  onSave,
  onOpenPrefixManager,
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [due, setDue] = useState('');
  const [selectedPrefix, setSelectedPrefix] = useState<string>('');

  // Extract prefix from title if exists e.g., "[운영] 할일 내용"
  const parsePrefixAndTitle = (fullTitle: string) => {
    const match = fullTitle.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (match) {
      return { prefix: match[1], body: match[2] };
    }
    return { prefix: '', body: fullTitle };
  };

  useEffect(() => {
    if (task) {
      const { prefix, body } = parsePrefixAndTitle(task.title || '');
      setSelectedPrefix(prefixes.includes(prefix) ? prefix : prefix ? prefix : '');
      setTitle(task.title || '');
      setNotes(task.notes || '');
      setDue(task.due ? getKoreaTodayYYYYMMDD(task.due) : getKoreaTodayYYYYMMDD());
    } else {
      setSelectedPrefix(prefixes.length > 0 ? prefixes[0] : '');
      setTitle('');
      setNotes('');
      setDue(getKoreaTodayYYYYMMDD());
    }
  }, [task, isOpen, prefixes]);

  if (!isOpen) return null;

  // Handle prefix change from dropdown
  const handlePrefixChange = (newPrefix: string) => {
    setSelectedPrefix(newPrefix);
    const { body } = parsePrefixAndTitle(title);
    if (newPrefix) {
      setTitle(`[${newPrefix}] ${body}`);
    } else {
      setTitle(body);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalTitle = title.trim();
    // If selected prefix exists and not already in title, prepend it
    if (selectedPrefix && !finalTitle.startsWith(`[${selectedPrefix}]`)) {
      const { body } = parsePrefixAndTitle(finalTitle);
      finalTitle = `[${selectedPrefix}] ${body}`;
    }

    onSave({
      title: finalTitle,
      notes: notes.trim() || undefined,
      due: due ? getKoreaISOString(due) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {task ? '할 일 수정' : '새 할 일 추가'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Prefix Selector Row */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  어두 (접두어) 카테고리
                </label>
                <button
                  type="button"
                  onClick={onOpenPrefixManager}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  어두 수정/관리
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 text-slate-500 rounded-xl">
                  <Tag className="w-4 h-4" />
                </div>
                <select
                  value={selectedPrefix}
                  onChange={(e) => handlePrefixChange(e.target.value)}
                  className="flex-1 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="">선택 안함</option>
                  {prefixes.map((p) => (
                    <option key={p} value={p}>
                      [{p}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Task Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                할 일 제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: [운영] 주간 업무 보고서 작성"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                상세 메모
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="구체적인 진행 내용이나 준비물 메모..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                마감 기한 (선택)
              </label>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
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
              {task ? '수정 완료' : '추가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
