export interface TranslationEntry {
  id: string;
  source_text: string;
  target_text: string;
  source_lang: "en" | "ja";
  target_lang: "en" | "ja";
  timestamp: string;
}

export interface AppSettings {
  deepl_api_key: string;
  auto_copy: boolean;
  shortcut: string;
}

export interface TranslationState {
  sourceText: string;
  targetText: string;
  sourceLang: "en" | "ja";
  targetLang: "en" | "ja";
  isLoading: boolean;
  error: string | null;
}
