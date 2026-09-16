import React, { useState } from 'react';
import { QuickShortcut } from '../types';
import { ExternalLink, Settings, Plus, Trash2, RotateCcw, X, Globe } from 'lucide-react';

export const DEFAULT_SHORTCUTS: QuickShortcut[] = [
  { id: 'sc-1', title: 'Gmail', url: 'https://mail.google.com' },
  { id: 'sc-2', title: '캘린더', url: 'https://calendar.google.com' },
  { id: 'sc-3', title: '노션', url: 'https://www.notion.so' },
];

interface QuickShortcutsProps {
  shortcuts: QuickShortcut[];
  onUpdateShortcuts: (shortcuts: QuickShortcut[]) => void;
}

export const QuickShortcuts: React.FC<QuickShortcutsProps> = ({
  shortcuts,
  onUpdateShortcuts,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editList, setEditList] = useState<QuickShortcut[]>([]);

  const handleOpenEdit = () => {
    setEditList([...shortcuts]);
    setIsEditModalOpen(true);
  };

  const handleSave = () => {
    // URL auto-prefix http:// or https:// if missing
    const formatted = editList.map((sc) => {
      let u = sc.url.trim();
      if (u && !u.startsWith('http://') && !u.startsWith('https://')) {
        u = 'https://' + u;
      }
      return { ...sc, url: u };
    });
    onUpdateShortcuts(formatted);
    setIsEditModalOpen(false);
  };

  const handleReset = () => {
    setEditList([...DEFAULT_SHORTCUTS]);
  };

  const handleAddShortcut = () => {
    if (editList.length >= 8) return;
    setEditList([
      ...editList,
      {
        id: 'sc-' + Date.now(),
        title: '새 바로가기',
        url: 'https://',
      },
    ]);
  };

  const handleRemoveShortcut = (id: string) => {
    setEditList(editList.filter((sc) => sc.id !== id));
  };

  const handleFieldChange = (id: string, field: 'title' | 'url', value: string) => {
    setEditList(
      editList.map((sc) => (sc.id === id ? { ...sc, [field]: value } : sc))
    );
  };

  const getDomain = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname;
    } catch {
      return '';
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Shortcut Buttons List */}
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-[280px] sm:max-w-none scrollbar-none py-0.5">
        {shortcuts.map((sc) => {
          const domain = getDomain(sc.url);
          const faviconUrl = domain
            ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
            : null;

          return (
            <a
              key={sc.id}
              href={sc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/80 hover:border-blue-200 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 active:scale-95 group"
              title={`${sc.title} (${sc.url})`}
            >
              {faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt=""
                  className="w-3.5 h-3.5 rounded-xs object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
              )}
              <span className="truncate max-w-[80px] sm:max-w-[100px]">{sc.title}</span>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-500 opacity-60 group-hover:opacity-100 transition" />
            </a>
          );
        })}
      </div>

      {/* Edit Shortcuts Button */}
      <button
        type="button"
        onClick={handleOpenEdit}
        className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition cursor-pointer shrink-0"
        title="바로가기 버튼 수정/관리"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">바로가기 버튼 설정</h3>
                  <p className="text-[11px] text-slate-500">
                    자주 가는 사이트 링크를 내 맘대로 수정하세요
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {editList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  등록된 바로가기가 없습니다. 아래 버튼으로 추가해주세요.
                </div>
              ) : (
                editList.map((sc, idx) => (
                  <div
                    key={sc.id}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80"
                  >
                    <span className="text-xs font-bold text-slate-400 w-4 text-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        placeholder="버튼 이름 (예: Gmail)"
                        value={sc.title}
                        onChange={(e) => handleFieldChange(sc.id, 'title', e.target.value)}
                        className="w-full px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="URL (예: https://mail.google.com)"
                        value={sc.url}
                        onChange={(e) => handleFieldChange(sc.id, 'url', e.target.value)}
                        className="w-full px-2.5 py-1 text-xs font-mono text-slate-600 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveShortcut(sc.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}

              {/* Add & Reset Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleAddShortcut}
                  disabled={editList.length >= 8}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  바로가기 추가 ({editList.length}/8)
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 hover:underline transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  기본값으로 복원
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
