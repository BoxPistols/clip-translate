use crate::deepl::{DeepLClient, DeepLUsage};
use crate::detect;
use crate::storage::{AppSettings, Storage, TranslationEntry};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

// ─── App State ───────────────────────────────────────────────────────────────

pub struct AppState {
    pub storage: Mutex<Storage>,
    pub deepl: DeepLClient,
}

// ─── Commands ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn detect_language(text: &str) -> String {
    detect::detect_language(text)
}

#[tauri::command]
pub async fn translate_text(
    text: String,
    source_lang: String,
    target_lang: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let api_key = {
        let storage = state.storage.lock().map_err(|e| e.to_string())?;
        storage.get_settings().deepl_api_key
    };

    if api_key.is_empty() {
        return Err("APIキーが設定されていません。設定画面からDeepL APIキーを入力してください。".to_string());
    }

    // Map short codes to DeepL codes
    let deepl_target = match target_lang.as_str() {
        "en" => "EN",
        "ja" => "JA",
        other => other,
    };

    let deepl_source = match source_lang.as_str() {
        "en" => Some("EN"),
        "ja" => Some("JA"),
        _ => None,
    };

    let result = state
        .deepl
        .translate(&api_key, &text, deepl_source, deepl_target)
        .await
        .map_err(|e| e.to_string())?;

    // Save to history
    {
        let storage = state.storage.lock().map_err(|e| e.to_string())?;
        storage
            .add_history(
                text,
                result.clone(),
                source_lang,
                target_lang,
            )
            .ok();
    }

    Ok(result)
}

#[tauri::command]
pub fn get_history(state: State<'_, AppState>) -> Result<Vec<TranslationEntry>, String> {
    let storage = state.storage.lock().map_err(|e| e.to_string())?;
    Ok(storage.get_history())
}

#[tauri::command]
pub fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    let storage = state.storage.lock().map_err(|e| e.to_string())?;
    storage.clear_history()
}

#[tauri::command]
pub fn delete_history_entry(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let storage = state.storage.lock().map_err(|e| e.to_string())?;
    storage.delete_history_entry(&id)
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let storage = state.storage.lock().map_err(|e| e.to_string())?;
    Ok(storage.get_settings())
}

#[tauri::command]
pub fn save_settings(
    settings: AppSettings,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    // Check if shortcut changed
    let old_shortcut = {
        let storage = state.storage.lock().map_err(|e| e.to_string())?;
        storage.get_settings().shortcut
    };
    let shortcut_changed = old_shortcut != settings.shortcut;
    let new_shortcut_str = settings.shortcut.clone();

    // Save settings
    {
        let storage = state.storage.lock().map_err(|e| e.to_string())?;
        storage.save_settings(settings)?;
    }

    // Re-register shortcut if changed
    if shortcut_changed {
        let gs = app.global_shortcut();

        // Unregister old shortcut
        if let Ok(old_parsed) = old_shortcut.parse::<Shortcut>() {
            gs.unregister(old_parsed).ok();
        }

        // Register new shortcut
        let new_parsed: Shortcut = new_shortcut_str
            .parse()
            .map_err(|e| format!("無効なショートカット: {}", e))?;

        gs.on_shortcut(new_parsed, move |app, _shortcut, event| {
            if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                if let Some(window) = app.get_webview_window("main") {
                    use tauri::{Emitter, PhysicalPosition};
                    // Toggle: visible → hide, hidden → show
                    if window.is_visible().unwrap_or(false) {
                        window.hide().ok();
                    } else {
                        if let Ok(Some(monitor)) = window.primary_monitor() {
                            let screen = monitor.size();
                            let scale = monitor.scale_factor();
                            let win_w = (440.0 * scale) as i32;
                            let win_h = (420.0 * scale) as i32;
                            let x = screen.width as i32 - win_w - (24.0 * scale) as i32;
                            let y = (screen.height as i32 - win_h) / 2;
                            window.set_position(PhysicalPosition::new(x, y)).ok();
                        }
                        window.show().ok();
                        window.set_focus().ok();
                        window.emit("shortcut-activated", ()).ok();
                    }
                }
            }
        })
        .map_err(|e| format!("ショートカット登録に失敗: {}", e))?;
    }

    Ok(())
}

/// Fetch DeepL API usage (character count & limit)
#[tauri::command]
pub async fn get_deepl_usage(state: State<'_, AppState>) -> Result<DeepLUsage, String> {
    let api_key = {
        let storage = state.storage.lock().map_err(|e| e.to_string())?;
        storage.get_settings().deepl_api_key
    };
    state
        .deepl
        .usage(&api_key)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hide_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Write text to macOS system clipboard via arboard (bypasses webview plugin issues)
#[tauri::command]
pub fn copy_to_clipboard(text: String) -> Result<(), String> {
    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| format!("クリップボード初期化失敗: {}", e))?;
    clipboard
        .set_text(text)
        .map_err(|e| format!("クリップボード書き込み失敗: {}", e))?;
    Ok(())
}
