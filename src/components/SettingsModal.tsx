import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "../lib/tauri";
import type { AppSettings } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface DeepLUsage {
  character_count: number;
  character_limit: number;
}

/** Convert a key name to a display symbol (macOS style) */
function keyToSymbol(key: string): string {
  const map: Record<string, string> = {
    CmdOrCtrl: "\u2318",
    Cmd: "\u2318",
    Command: "\u2318",
    Meta: "\u2318",
    Ctrl: "\u2303",
    Control: "\u2303",
    Alt: "\u2325",
    Option: "\u2325",
    Shift: "\u21e7",
    Super: "\u2318",
  };
  return map[key] ?? key;
}

/** Convert a KeyboardEvent to a Tauri-compatible shortcut string */
function eventToShortcut(e: KeyboardEvent): string | null {
  const parts: string[] = [];

  if (e.metaKey) parts.push("Super");
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");

  const ignoredKeys = new Set([
    "Meta", "Control", "Alt", "Shift",
    "CapsLock", "NumLock", "ScrollLock",
  ]);
  if (ignoredKeys.has(e.key)) return null;
  if (parts.length === 0) return null;

  let key = e.key.length === 1 ? e.key.toUpperCase() : e.key;

  const keyMap: Record<string, string> = {
    " ": "Space",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Escape: "Escape",
    Enter: "Enter",
    Backspace: "Backspace",
    Delete: "Delete",
    Tab: "Tab",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
  };
  if (keyMap[e.key]) key = keyMap[e.key];
  if (/^F\d{1,2}$/.test(e.key)) key = e.key;

  parts.push(key);
  return parts.join("+");
}

function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

export default function SettingsModal({ isOpen, onClose }: Props) {
  const [settings, setSettings] = useState<AppSettings>({
    deepl_api_key: "",
    auto_copy: true,
    shortcut: "Shift+Alt+T",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const recordRef = useRef<boolean>(false);

  // API usage state
  const [usage, setUsage] = useState<DeepLUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const s = await invoke<AppSettings>("get_settings");
      setSettings(s);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }, []);

  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    setUsageError(null);
    try {
      const u = await invoke<DeepLUsage>("get_deepl_usage");
      setUsage(u);
    } catch (err) {
      setUsageError(typeof err === "string" ? err : "取得に失敗しました");
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setMessage(null);
      setShowKey(false);
      setIsRecording(false);
      setUsage(null);
      setUsageError(null);
      // Auto-load usage if API key is already set (after settings load)
    }
  }, [isOpen, loadSettings]);

  // Load usage when settings load and API key exists
  useEffect(() => {
    if (isOpen && settings.deepl_api_key) {
      loadUsage();
    }
  }, [isOpen, settings.deepl_api_key, loadUsage]);

  useEffect(() => {
    recordRef.current = isRecording;
    if (!isRecording) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setIsRecording(false);
        return;
      }

      const shortcut = eventToShortcut(e);
      if (shortcut) {
        setSettings((prev) => ({ ...prev, shortcut }));
        setIsRecording(false);
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isRecording]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      await invoke("save_settings", { settings });
      setMessage({ type: "success", text: "設定を保存しました" });
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const usagePercent = usage
    ? Math.min((usage.character_count / usage.character_limit) * 100, 100)
    : 0;
  const remaining = usage
    ? usage.character_limit - usage.character_count
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-[#2a2a2a] rounded-xl shadow-xl
        dark:shadow-2xl dark:shadow-black/40 w-[400px] animate-slide-up overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5
          border-b border-gray-100 dark:border-white/[0.06]">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">設定</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md
              text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* DeepL API Key */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              DeepL API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={settings.deepl_api_key}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, deepl_api_key: e.target.value }))
                }
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx"
                className="w-full rounded-lg border border-gray-200 dark:border-white/[0.1]
                  bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-800 dark:text-gray-200 pr-16
                  placeholder-gray-400 dark:placeholder-gray-600
                  focus:border-blue-400 dark:focus:border-blue-500/50
                  focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20
                  transition-all duration-150"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2
                  text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300
                  px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                {showKey ? "隠す" : "表示"}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">
              <a href="https://www.deepl.com/ja/your-account/keys" target="_blank" rel="noopener"
                className="text-blue-500 hover:underline">DeepL</a>
              でAPIキーを取得できます（Free: 月50万文字）
            </p>
          </div>

          {/* API Usage */}
          {settings.deepl_api_key && (
            <div className="rounded-lg border border-gray-100 dark:border-white/[0.06]
              bg-gray-50/50 dark:bg-white/[0.02] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  API 使用量
                </label>
                <button
                  onClick={loadUsage}
                  disabled={usageLoading}
                  className="text-[10px] text-blue-500 hover:text-blue-600 dark:hover:text-blue-400
                    disabled:opacity-50 transition-colors"
                >
                  {usageLoading ? "取得中..." : "更新"}
                </button>
              </div>

              {usageError ? (
                <p className="text-[10px] text-red-500 dark:text-red-400">{usageError}</p>
              ) : usage ? (
                <>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-gray-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        usagePercent > 90
                          ? "bg-red-500"
                          : usagePercent > 70
                            ? "bg-yellow-500"
                            : "bg-blue-500"
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-500 dark:text-gray-500">
                      使用: {formatNumber(usage.character_count)} 文字
                    </span>
                    <span className="text-gray-500 dark:text-gray-500">
                      上限: {formatNumber(usage.character_limit)} 文字
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                      残り {formatNumber(remaining)} 文字
                    </span>
                    <span className={`text-[11px] font-bold ${
                      usagePercent > 90
                        ? "text-red-500"
                        : usagePercent > 70
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-blue-500"
                    }`}>
                      {usagePercent.toFixed(1)}%
                    </span>
                  </div>
                </>
              ) : usageLoading ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 border-[1.5px] border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-[10px] text-gray-400">使用量を取得中...</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Auto-copy toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">翻訳結果を自動コピー</label>
            <button
              onClick={() => setSettings((prev) => ({ ...prev, auto_copy: !prev.auto_copy }))}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                settings.auto_copy ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow
                transition-transform duration-200 ${settings.auto_copy ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>

          {/* Shortcut key recorder */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              ショートカットキー
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRecording(true)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border
                  text-sm transition-all duration-150 min-w-[140px] justify-center
                  ${isRecording
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-500/10 ring-2 ring-blue-100 dark:ring-blue-500/20"
                    : "border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/[0.15] hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                  }`}
              >
                {isRecording ? (
                  <span className="text-xs text-blue-500 animate-pulse">
                    キーを押してください...
                  </span>
                ) : (
                  <span className="flex gap-1">
                    {settings.shortcut.split("+").map((key, i) => (
                      <kbd
                        key={i}
                        className="px-1.5 py-0.5 text-[11px] font-mono
                          bg-white dark:bg-white/[0.08]
                          border border-gray-200 dark:border-white/[0.1]
                          rounded text-gray-700 dark:text-gray-300 shadow-sm"
                      >
                        {keyToSymbol(key)}
                      </kbd>
                    ))}
                  </span>
                )}
              </button>
              {!isRecording && (
                <span className="text-[10px] text-gray-400 dark:text-gray-600">クリックして変更</span>
              )}
              {isRecording && (
                <button
                  onClick={() => setIsRecording(false)}
                  className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  キャンセル
                </button>
              )}
            </div>
          </div>

          {message && (
            <p className={`text-xs animate-fade-in ${
              message.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            }`}>{message.text}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3
          border-t border-gray-100 dark:border-white/[0.06]
          bg-gray-50/50 dark:bg-white/[0.02]">
          <button onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium
              text-gray-600 dark:text-gray-400 bg-white dark:bg-white/[0.06]
              border border-gray-200 dark:border-white/[0.1]
              rounded-md hover:bg-gray-50 dark:hover:bg-white/10 transition-colors duration-100">
            キャンセル
          </button>
          <button onClick={handleSave} disabled={isSaving}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-500
              rounded-md hover:bg-blue-600 active:bg-blue-700
              disabled:opacity-50 transition-colors duration-100">
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
