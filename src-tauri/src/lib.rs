mod commands;
mod deepl;
mod detect;
mod storage;

use commands::AppState;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, PhysicalPosition,
};
use tauri_plugin_global_shortcut::Shortcut;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Read shortcut from settings before building the app
    let tmp_storage = storage::Storage::new();
    let settings = tmp_storage.get_settings();
    let shortcut_str = settings.shortcut.clone();

    // Parse the shortcut string into a Shortcut struct
    let parsed_shortcut: Shortcut = shortcut_str
        .parse()
        .expect("Failed to parse shortcut string");

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin({
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            // Toggle: visible → hide, hidden → show
                            if window.is_visible().unwrap_or(false) {
                                window.hide().ok();
                            } else {
                                // Position at right edge of screen
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
                .with_shortcut(parsed_shortcut)
                .expect("Failed to register shortcut")
                .build()
        })
        .manage(AppState {
            storage: Mutex::new(storage::Storage::new()),
            deepl: deepl::DeepLClient::new(),
        })
        .setup(|app| {
            // ── Tray Icon ────────────────────────────────────────────────
            let show_item = MenuItem::with_id(app, "show", "表示", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "終了", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("ClipTranslate")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().ok();
                            window.set_focus().ok();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // Left click → toggle window
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                window.hide().ok();
                            } else {
                                // Position at right edge of screen
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
                            }
                        }
                    }
                    // Right click → menu is shown automatically by Tauri
                })
                .build(app)?;

            // ── Window behavior ──────────────────────────────────────────
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::CloseRequested { api, .. } => {
                            api.prevent_close();
                            window_clone.hide().ok();
                        }
                        tauri::WindowEvent::Focused(false) => {
                            // Hide when user clicks outside (like a dialog)
                            window_clone.hide().ok();
                        }
                        _ => {}
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::detect_language,
            commands::translate_text,
            commands::get_history,
            commands::clear_history,
            commands::delete_history_entry,
            commands::get_settings,
            commands::save_settings,
            commands::get_deepl_usage,
            commands::hide_window,
            commands::copy_to_clipboard,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ClipTranslate");
}
