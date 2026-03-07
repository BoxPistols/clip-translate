import { useState, useMemo, useRef, useEffect } from "react";
import type { TranslationEntry } from "../types";

interface Props {
  entries: TranslationEntry[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (entry: TranslationEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;

  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

/** Highlight matching substring with <mark> */
function highlightMatch(text: string, query: string, maxLen: number): React.ReactNode {
  const truncated = truncate(text, maxLen);
  if (!query) return truncated;

  const lower = truncated.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return truncated;

  return (
    <>
      {truncated.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-500/30 text-inherit rounded-sm px-[1px]">
        {truncated.slice(idx, idx + query.length)}
      </mark>
      {truncated.slice(idx + query.length)}
    </>
  );
}

const LANG_FLAGS: Record<string, string> = {
  en: "EN",
  ja: "JA",
};

export default function HistoryPanel({
  entries,
  isOpen,
  onClose,
  onSelect,
  onDelete,
  onClearAll,
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset search when panel closes
  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  // Filter entries by keyword (source or target text)
  const filtered = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(
      (e) =>
        e.source_text.toLowerCase().includes(q) ||
        e.target_text.toLowerCase().includes(q)
    );
  }, [entries, query]);

  if (!isOpen) return null;

  return (
    <div className="w-56 border-l border-gray-200 dark:border-white/[0.06]
      bg-white/95 dark:bg-[#1e1e1e]/95 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5
        border-b border-gray-100 dark:border-white/[0.06]">
        <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
          履歴
        </h2>
        <div className="flex items-center gap-1">
          {entries.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400
                px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              全削除
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded
              text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 2L10 10M10 2L2 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      {entries.length > 0 && (
        <div className="px-2.5 py-2 border-b border-gray-100 dark:border-white/[0.06]">
          <div className="relative">
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="検索..."
              className="w-full pl-7 pr-6 py-1.5 text-[11px] rounded-md
                bg-gray-50 dark:bg-white/[0.04]
                border border-gray-100 dark:border-white/[0.06]
                text-gray-700 dark:text-gray-200
                placeholder-gray-400 dark:placeholder-gray-600
                focus:outline-none focus:border-blue-300 dark:focus:border-blue-500/50
                focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-500/20
                transition-colors"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2
                  w-4 h-4 flex items-center justify-center rounded-full
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                  hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-400 dark:text-gray-600">履歴がありません</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1 px-4">
            <p className="text-[11px] text-gray-400 dark:text-gray-600">
              「{truncate(query, 12)}」に一致する履歴なし
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                onClick={() => onSelect(entry)}
                className="group px-3 py-2.5 cursor-pointer
                  hover:bg-gray-50 dark:hover:bg-white/[0.04]
                  transition-colors duration-75 relative"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500
                    bg-gray-100 dark:bg-white/[0.06] px-1 py-0.5 rounded">
                    {LANG_FLAGS[entry.source_lang]} → {LANG_FLAGS[entry.target_lang]}
                  </span>
                  <span className="text-[9px] text-gray-400 dark:text-gray-600">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-snug">
                  {highlightMatch(entry.source_text, query, 40)}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-500 leading-snug mt-0.5">
                  {highlightMatch(entry.target_text, query, 40)}
                </p>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(entry.id);
                  }}
                  className="absolute top-2 right-2 w-5 h-5 items-center justify-center
                    rounded text-gray-300 dark:text-gray-600
                    hover:text-red-500 dark:hover:text-red-400
                    hover:bg-red-50 dark:hover:bg-red-500/10
                    hidden group-hover:flex transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 2L8 8M8 2L2 8"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
