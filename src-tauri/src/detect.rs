/// Detects whether a given text is primarily Japanese or English.
///
/// Uses Unicode range heuristics:
/// - Hiragana:  U+3040..U+309F
/// - Katakana:  U+30A0..U+30FF
/// - CJK Kanji: U+4E00..U+9FFF
/// - Halfwidth Katakana: U+FF65..U+FF9F
///
/// If the ratio of Japanese characters exceeds 10% of all alphabetic/kana/kanji chars,
/// the text is considered Japanese.
pub fn detect_language(text: &str) -> String {
    let mut jp_count: usize = 0;
    let mut total_meaningful: usize = 0;

    for ch in text.chars() {
        if ch.is_whitespace() || ch.is_ascii_punctuation() {
            continue;
        }

        let code = ch as u32;
        let is_japanese = matches!(code,
            0x3040..=0x309F   // Hiragana
            | 0x30A0..=0x30FF // Katakana
            | 0x4E00..=0x9FFF // CJK Unified Ideographs
            | 0xFF65..=0xFF9F // Halfwidth Katakana
            | 0x3000..=0x303F // CJK Symbols and Punctuation
        );

        if is_japanese {
            jp_count += 1;
        }

        total_meaningful += 1;
    }

    if total_meaningful == 0 {
        return "en".to_string();
    }

    let jp_ratio = jp_count as f64 / total_meaningful as f64;

    if jp_ratio > 0.1 {
        "ja".to_string()
    } else {
        "en".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_english_text() {
        assert_eq!(detect_language("Hello, how are you?"), "en");
    }

    #[test]
    fn test_japanese_text() {
        assert_eq!(detect_language("こんにちは、元気ですか？"), "ja");
    }

    #[test]
    fn test_katakana_text() {
        assert_eq!(detect_language("コンピューター"), "ja");
    }

    #[test]
    fn test_kanji_text() {
        assert_eq!(detect_language("翻訳アプリケーション"), "ja");
    }

    #[test]
    fn test_mixed_mostly_english() {
        assert_eq!(detect_language("The meeting is at 3pm tomorrow"), "en");
    }

    #[test]
    fn test_empty_string() {
        assert_eq!(detect_language(""), "en");
    }
}
