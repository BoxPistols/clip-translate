import { useState, useEffect, useCallback } from "react";
import { listen, clipboardReadText, invoke } from "./lib/tauri";

import SettingsModal from "./components/SettingsModal";
import HistoryPanel from "./components/HistoryPanel";
import { useTranslation } from "./hooks/useTranslation";
import { useHistory } from "./hooks/useHistory";
import type { TranslationEntry } from "./types";

const LANG_LABELS: Record<string, string> = {
  en: "English",
  ja: "日本語",
};

export default function App() {
  const {
    state,
    autoCopied,
    translate,
    translateDebounced,
    copyTarget,
    reverseTranslate,
    clear,
    setTargetText,
  } = useTranslation();

  const history = useHistory();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("clip-translate-theme") === "dark";
    } catch {
      return false;
    }
  });
  const [copyFlash, setCopyFlash] = useState(false);

  // Apply dark class to root
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    try {
      localStorage.setItem("clip-translate-theme", darkMode ? "dark" : "light");
    } catch { /* ignore */ }
  }, [darkMode]);

  // Listen for shortcut activation
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    (async () => {
      try {
        unlisten = await listen("shortcut-activated", async () => {
          clear();
          setSlideIn(true);

          try {
            const clipboardText = await clipboardReadText();
            if (clipboardText && clipboardText.trim()) {
              translate(clipboardText);
            }
          } catch (err) {
            console.error("Failed to read clipboard:", err);
          }
        });
      } catch {
        console.info("Tauri event API not available");
      }
    })();

    return () => { unlisten?.(); };
  }, [translate, clear]);

  const handleDismiss = useCallback(async () => {
    try {
      await invoke("hide_window");
    } catch { /* ignore */ }
  }, []);

  const handleCopy = useCallback(async () => {
    await copyTarget();
    setCopyFlash(true);
    setTimeout(() => setCopyFlash(false), 400);
  }, [copyTarget]);

  const handleHistorySelect = useCallback((entry: TranslationEntry) => {
    translate(entry.source_text, false);
    history.toggle();
  }, [translate, history]);

  const handleSourceEdit = useCallback((text: string) => {
    translateDebounced(text);
  }, [translateDebounced]);

  const animClass = slideIn ? "animate-slide-in" : "";

  return (
    <div className="panel-container w-full h-full">
      <div className={`floating-panel flex h-full ${animClass}`}>
        {/* Main translation panel */}
        <div className="flex flex-col flex-1 min-w-0 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-xl">
          {/* Header — draggable */}
          <div
            className="flex items-center justify-between px-3 py-2
              border-b border-gray-100/80 dark:border-white/[0.06] cursor-grab active:cursor-grabbing"
            data-tauri-drag-region
          >
            <div className="flex items-center gap-1.5" data-tauri-drag-region>
              <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-blue-600
                flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M1 3H11M1 6H7M1 9H9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400" data-tauri-drag-region>
                ClipTranslate
              </span>
            </div>

            <div className="flex items-center gap-0.5">
              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode((d) => !d)}
                className="w-6 h-6 flex items-center justify-center rounded-md
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title={darkMode ? "ライトモード" : "ダークモード"}
              >
                {darkMode ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
              {/* History button */}
              <button
                onClick={() => history.toggle()}
                className={`w-6 h-6 flex items-center justify-center rounded-md
                  transition-colors
                  ${history.isOpen
                    ? "text-blue-500 bg-blue-50 dark:bg-blue-500/20"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                  }`}
                title="履歴"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v4l3 3" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </button>
              {/* Settings */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="w-6 h-6 flex items-center justify-center rounded-md
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title="設定"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              {/* Close */}
              <button
                onClick={handleDismiss}
                className="w-6 h-6 flex items-center justify-center rounded-md
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title="閉じる"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Translation content */}
          <div className="flex-1 flex flex-col min-h-0 px-3 py-2.5 gap-2">
            {/* Source (editable) */}
            <div className="flex flex-col gap-1 flex-1 min-h-0">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {LANG_LABELS[state.sourceLang]}
              </span>
              <textarea
                value={state.sourceText}
                onChange={(e) => handleSourceEdit(e.target.value)}
                placeholder="テキストを入力、またはクリップボードから..."
                className="flex-1 rounded-md bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06]
                  px-2.5 py-2 text-[13px] leading-relaxed text-gray-700 dark:text-gray-200
                  resize-none min-h-[60px] placeholder-gray-400 dark:placeholder-gray-600
                  focus:outline-none focus:border-blue-300 dark:focus:border-blue-500/50
                  focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-500/20
                  transition-colors"
              />
            </div>

            {/* Reverse translate button */}
            <div className="flex items-center justify-center shrink-0">
              <button
                onClick={reverseTranslate}
                disabled={!state.targetText || state.isLoading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full
                  text-gray-400 dark:text-gray-500
                  hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10
                  disabled:opacity-30 disabled:cursor-not-allowed
                  active:bg-blue-100 dark:active:bg-blue-500/20 transition-all duration-100"
                title="逆方向に再翻訳"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6L2 8L4 10M12 6L14 8L12 10M2 8H14"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[9px] font-medium">再翻訳</span>
              </button>
            </div>

            {/* Target (editable) */}
            <div className="flex flex-col gap-1 flex-1 min-h-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {LANG_LABELS[state.targetLang]}
                </span>
                {state.isLoading && (
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[9px] text-blue-500">翻訳中...</span>
                  </div>
                )}
              </div>
              {state.error ? (
                <div className="flex-1 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20
                  px-2.5 py-2 min-h-[60px]">
                  <p className="text-red-500 dark:text-red-400 text-[11px]">{state.error}</p>
                </div>
              ) : state.isLoading ? (
                <div className="flex-1 rounded-md bg-blue-50/50 dark:bg-blue-500/5
                  border border-blue-100/60 dark:border-blue-500/10
                  px-2.5 py-2 min-h-[60px] flex items-center gap-1.5">
                  <div className="w-3 h-3 border-[1.5px] border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">DeepL API...</span>
                </div>
              ) : (
                <textarea
                  value={state.targetText}
                  onChange={(e) => setTargetText(e.target.value)}
                  placeholder="翻訳結果"
                  className="flex-1 rounded-md bg-blue-50/50 dark:bg-blue-500/5
                    border border-blue-100/60 dark:border-blue-500/10
                    px-2.5 py-2 text-[13px] leading-relaxed text-gray-800 dark:text-gray-100
                    resize-none min-h-[60px] select-text
                    placeholder-gray-400 dark:placeholder-gray-600
                    focus:outline-none focus:border-blue-300 dark:focus:border-blue-500/50
                    focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-500/20
                    transition-colors"
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-1.5 shrink-0
            border-t border-gray-100/80 dark:border-white/[0.06]
            bg-gray-50/30 dark:bg-white/[0.02]">
            <div className="flex items-center gap-1">
              {autoCopied && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-fade-in">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
                    className="animate-check-pop">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  コピー済み
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                disabled={!state.targetText || state.isLoading}
                className={`px-2 py-1 text-[10px] font-medium rounded transition-all duration-150
                  disabled:opacity-30 disabled:cursor-not-allowed
                  ${copyFlash
                    ? "bg-emerald-500 text-white border border-emerald-500 btn-copy-flash"
                    : "text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
              >
                {copyFlash ? "✓" : "コピー"}
              </button>
              <button
                onClick={handleDismiss}
                className="px-2 py-1 text-[10px] font-medium text-gray-400 dark:text-gray-500
                  rounded hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>

        {/* History side panel */}
        <HistoryPanel
          entries={history.entries}
          isOpen={history.isOpen}
          onClose={history.toggle}
          onSelect={handleHistorySelect}
          onDelete={history.deleteEntry}
          onClearAll={history.clearAll}
        />
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
