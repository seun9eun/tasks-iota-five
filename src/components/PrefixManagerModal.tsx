import React, { useState, useEffect } from 'react';
import { X, Tag, Plus, Trash2, RotateCcw, Settings } from 'lucide-react';

export const DEFAULT_PREFIXES = [
  '운영',
  '서비스언어',
  '퐁당광고',
  '퐁당업로드',
  '드림온브릿지',
  '힐링보이스',
];

interface PrefixManagerModalProps {
  isOpen: boolean;
  prefixes: string[];
  onClose: () => void;
  onSave: (newPrefixes: string[]) => void;
}

export const PrefixManagerModal: React.FC<PrefixManagerModalProps> = ({
  isOpen,
  prefixes,
  onClose,
  onSave,
}) => {
  const [list, setList] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    setList([...prefixes]);
    setNewItem('');
  }, [prefixes, isOpen]);

  if (!isOpen) return null;

  const handleAdd = () => {
    const trimmed = newItem.trim().replace(/^\[|\]$/g, ''); // [ ] 괄호 자동 제거
    if (!trimmed) return;
    if (list.includes(trimmed)) {
      alert('이미 존재하 항목입니다.');
      return;
    }
    setList([...list, trimmed]);
    setNewItem('');
  };

  const handleRemove = (index: number) => {
    setList(list.filter((_, idx) => idx !== index));
  };

  const handleChange = (index: number, val: string) => {
    const updated = [...list];
    updated[index] = val;
    setList(updated);
  };

  const handleReset = () => {
    setList([...DEFAULT_PREFIXES]);
  };

  const handleSaveList = () => {
    // 빈 항목 제외 및 정제
    const cleaned = list
      .map((item) => item.trim().replace(/^\[|\]$/g, ''))
      .filter((item) => item.length > 0);

    // 중복 제거
    const unique = Array.from(new Set(cleaned));
    onSave(unique);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">어두 (접두어) 관리</h3>
              <p className="text-[11px] text-slate-500">
                빠른 등록 및 할 일 작성 시 사용할 어두 태그 목록을 설정하세요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
          {/* Add New Prefix */}
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">[</span>
              <input
                type="text"
                placeholder="새 어두 입력 (예: 마케팅)"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                className="w-full pl-6 pr-6 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">]</span>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              추가
            </button>
          </div>

          {/* Current List */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              등록된 어두 목록 ({list.length}개)
            </label>
            {list.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                등록된 어두가 없습니다. 상단에서 추가해 보세요.
              </div>
            ) : (
              list.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200/80 group hover:border-blue-200 transition"
                >
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg shrink-0">
                    [{item}]
                  </span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    className="flex-1 px-2 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Reset button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 hover:underline transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              기본 어두 목록으로 복원
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSaveList}
            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
};
