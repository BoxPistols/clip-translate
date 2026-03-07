import { useState, useCallback, useRef } from "react";
import { invoke } from "../lib/tauri";
import type { TranslationState } from "../types";

const DEBOUNCE_MS = 400;

export function useTranslation() {
  const [state, setState] = useState<TranslationState>({
    sourceText: "",
    targetText: "",
    sourceLang: "en",
    targetLang: "ja",
    isLoading: false,
    error: null,
  });
  const [autoCopied, setAutoCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Copy text using Rust-side arboard (direct macOS clipboard access) */
  const copyViaRust = useCallback(async (text: string): Promise<boolean> => {
    try {
      await invoke("copy_to_clipboard", { text });
      return true;
    } catch (err) {
      console.error("[ClipTranslate] Rust clipboard write failed:", err);
      return false;
    }
  }, []);

  const translate = useCallback(async (text: string, autoCopy = true) => {
    if (!text.trim()) {
      setState((prev) => ({
        ...prev,
        sourceText: text,
        targetText: "",
        error: null,
      }));
      return;
    }

    setState((prev) => ({ ...prev, sourceText: text, isLoading: true, error: null }));
    setAutoCopied(false);

    try {
      const detectedLang = await invoke<string>("detect_language", { text });
      const sourceLang = detectedLang as "en" | "ja";
      const targetLang = sourceLang === "en" ? "ja" : "en";

      setState((prev) => ({ ...prev, sourceLang, targetLang }));

      const result = await invoke<string>("translate_text", {
        text,
        sourceLang,
        targetLang,
      });

      setState((prev) => ({
        ...prev,
        targetText: result,
        isLoading: false,
      }));

      // Auto-copy via Rust (direct macOS clipboard)
      if (autoCopy && result) {
        const ok = await copyViaRust(result);
        if (ok) {
          setAutoCopied(true);
        } else {
          setState((prev) => ({
            ...prev,
            error: "翻訳完了。クリップボードコピーに失敗しました。",
          }));
        }
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [copyViaRust]);

  const translateDebounced = useCallback(
    (text: string) => {
      setState((prev) => ({ ...prev, sourceText: text }));

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        translate(text, false);
      }, DEBOUNCE_MS);
    },
    [translate]
  );

  /** Manual copy button */
  const copyTarget = useCallback(async () => {
    if (state.targetText) {
      const ok = await copyViaRust(state.targetText);
      if (ok) {
        setAutoCopied(true);
        setTimeout(() => setAutoCopied(false), 2000);
      }
    }
  }, [state.targetText, copyViaRust]);

  /** Reverse translate: swap source↔target and translate again */
  const reverseTranslate = useCallback(async () => {
    if (!state.targetText) return;

    const newSource = state.targetText;

    setState((prev) => ({
      ...prev,
      sourceText: newSource,
      targetText: "",
      sourceLang: prev.targetLang,
      targetLang: prev.sourceLang,
      isLoading: true,
      error: null,
    }));
    setAutoCopied(false);

    try {
      const result = await invoke<string>("translate_text", {
        text: newSource,
        sourceLang: state.targetLang,
        targetLang: state.sourceLang,
      });

      setState((prev) => ({
        ...prev,
        targetText: result,
        isLoading: false,
      }));

      // Auto-copy the reverse translation
      if (result) {
        const ok = await copyViaRust(result);
        if (ok) setAutoCopied(true);
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [state.targetText, state.sourceLang, state.targetLang, copyViaRust]);

  const clear = useCallback(() => {
    setState({
      sourceText: "",
      targetText: "",
      sourceLang: "en",
      targetLang: "ja",
      isLoading: false,
      error: null,
    });
    setAutoCopied(false);
  }, []);

  /** Allow direct editing of target text (for tweaking translations) */
  const setTargetText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, targetText: text }));
  }, []);

  return {
    state,
    autoCopied,
    translate,
    translateDebounced,
    copyTarget,
    reverseTranslate,
    clear,
    setTargetText,
  };
}
