import { useRef, useEffect } from "react";

interface Props {
  sourceText: string;
  targetText: string;
  sourceLang: "en" | "ja";
  targetLang: "en" | "ja";
  isLoading: boolean;
  error: string | null;
  autoCopied: boolean;
  onSourceChange: (text: string) => void;
  onCopy: () => void;
  onClear: () => void;
  onSwap: () => void;
  onPaste: () => void;
}

const LANG_LABELS: Record<string, string> = {
  en: "English",
  ja: "日本語",
};

export default function TranslationView({
  sourceText,
  targetText,
  sourceLang,
  targetLang,
  isLoading,
  error,
  autoCopied,
  onSourceChange,
  onCopy,
  onClear,
  onSwap,
  onPaste,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Source Panel */}
      <div className="flex-1 flex flex-col p-4 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {LANG_LABELS[sourceLang]}
          </span>
          <span className="text-[10px] text-gray-400">
            {sourceText.length > 0 && `${sourceText.length} chars`}
          </span>
        </div>

        <textarea
          ref={textareaRef}
          value={sourceText}
          onChange={(e) => onSourceChange(e.target.value)}
          placeholder="翻訳するテキストを入力..."
          className="flex-1 w-full resize-none rounded-lg border border-gray-200 bg-white
                     px-3 py-2.5 text-sm leading-relaxed text-gray-800
                     placeholder:text-gray-400
                     focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100
                     transition-all duration-150"
          spellCheck={false}
        />

        <div className="flex gap-2 mt-2">
          <button
            onClick={onPaste}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100
                       rounded-md hover:bg-gray-200 active:bg-gray-300
                       transition-colors duration-100"
          >
            Paste
          </button>
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100
                       rounded-md hover:bg-gray-200 active:bg-gray-300
                       transition-colors duration-100"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Divider + Swap */}
      <div className="flex flex-col items-center justify-center px-1">
        <button
          onClick={onSwap}
          className="w-8 h-8 flex items-center justify-center rounded-full
                     text-gray-400 hover:text-blue-500 hover:bg-blue-50
                     active:bg-blue-100 transition-all duration-100"
          title="言語を入れ替え"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6L2 8L4 10M12 6L14 8L12 10M2 8H14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="w-px flex-1 bg-gray-200" />
      </div>

      {/* Target Panel */}
      <div className="flex-1 flex flex-col p-4 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {LANG_LABELS[targetLang]}
          </span>
          {isLoading && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] text-blue-500">翻訳中...</span>
            </div>
          )}
        </div>

        <div
          className="flex-1 w-full rounded-lg border border-gray-200 bg-gray-50
                      px-3 py-2.5 text-sm leading-relaxed text-gray-800
                      overflow-y-auto select-text"
        >
          {error ? (
            <p className="text-red-500 text-xs">{error}</p>
          ) : isLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-xs">DeepL APIに問い合わせ中...</span>
            </div>
          ) : targetText ? (
            <p className="whitespace-pre-wrap">{targetText}</p>
          ) : (
            <p className="text-gray-400">翻訳結果がここに表示されます</p>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={onCopy}
            disabled={!targetText}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500
                       rounded-md hover:bg-blue-600 active:bg-blue-700
                       disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-colors duration-100"
          >
            Copy
          </button>
          {autoCopied && (
            <span className="text-[10px] text-emerald-600 font-medium animate-fade-in">
              Copied!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
