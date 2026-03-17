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

            let tray_icon_bytes = include_bytes!("../icons/tray-icon@2x.png");
            let decoder = png::Decoder::new(std::io::Cursor::new(tray_icon_bytes));
            let mut reader = decoder.read_info().expect("Failed to decode tray icon PNG");
            let mut buf = vec![0; reader.output_buffer_size()];
            let info = reader.next_frame(&mut buf).expect("Failed to read tray icon frame");
            buf.truncate(info.buffer_size());
            let tray_icon_image = tauri::image::Image::new_owned(buf, info.width, info.height);

            let _tray = TrayIconBuilder::new()
                .icon(tray_icon_image)
                .icon_as_template(false)
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
