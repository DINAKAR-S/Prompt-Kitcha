mod clipboard;
mod config;
mod credentials;
mod cursor;
mod foreground;
mod hotkey;
mod keystroke;
mod optimizer;
mod providers;
mod tray;
mod watcher;

use std::sync::Arc;
use std::sync::atomic::AtomicBool;

use parking_lot::RwLock;
use tauri::{Manager, WindowEvent};

use crate::config::AppConfig;

pub struct AppState {
  pub config: RwLock<AppConfig>,
  pub saved_clipboard: RwLock<Option<String>>,
  pub last_self_write: RwLock<Option<String>>,
  pub active_app: RwLock<Option<crate::foreground::AppHint>>,
  pub hotkey_busy: AtomicBool,
}

pub type SharedState = Arc<AppState>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tracing_subscriber::fmt()
    .with_env_filter(
      tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "info,promptwriter_lib=debug".into()),
    )
    .init();

  let config = AppConfig::load().unwrap_or_default();
  let state: SharedState = Arc::new(AppState {
    config: RwLock::new(config),
    saved_clipboard: RwLock::new(None),
    last_self_write: RwLock::new(None),
    active_app: RwLock::new(None),
    hotkey_busy: AtomicBool::new(false),
  });

  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .manage(state.clone())
    .invoke_handler(tauri::generate_handler![
      optimizer::optimize_text,
      optimizer::cancel_optimize,
      optimizer::generate_image_prompt,
      keystroke::capture_selection,
      keystroke::replace_selection,
      clipboard::save_clipboard,
      clipboard::restore_clipboard,
      clipboard::read_clipboard,
      clipboard::write_clipboard,
      cursor::get_cursor_position,
      cursor::get_popup_anchor,
      credentials::set_api_key,
      credentials::get_api_key,
      credentials::delete_api_key,
      credentials::has_api_key,
      config::get_config,
      config::update_config,
      hotkey::register_hotkey,
      hotkey::validate_hotkey,
      hotkey::unregister_hotkey,
      providers::list_providers,
      providers::test_connection,
  show_window,
  hide_window,
  show_settings,
  show_popup_at_cursor,
  show_image_prompt,
  quit_app,
    ])
    .on_window_event(|window, event| {
      if let WindowEvent::CloseRequested { api, .. } = event {
        if window.label() == "popup" || window.label() == "pill" {
          api.prevent_close();
          let _ = window.hide();
        }
      }
    })
    .setup({
      let state = state.clone();
      move |app| {
        tray::install(app.handle())?;
        hotkey::install_default(app.handle(), &state)?;
        watcher::spawn(app.handle().clone(), state.clone());

        if let Some(win) = app.get_webview_window("settings") { let _ = win.hide(); }
        if let Some(win) = app.get_webview_window("popup") { let _ = win.hide(); }

        if let Some(pill) = app.get_webview_window("pill") {
          let _ = pill.hide();
          if let Ok(pos) = park_pill_position(&pill) {
            let _ = pill.set_position(tauri::PhysicalPosition::new(pos.0, pos.1));
          }
          let _ = pill.show();
        }

        if !state.config.read().onboarded {
          if let Some(win) = app.get_webview_window("settings") {
            let _ = win.show();
            let _ = win.set_focus();
          }
        }

        Ok(())
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running PromptKitcha");
}

#[tauri::command]
fn show_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
  let win = app
    .get_webview_window(&label)
    .ok_or_else(|| format!("window not found: {label}"))?;
  win.show().map_err(|e| e.to_string())?;
  win.set_focus().map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
fn hide_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
  if let Some(win) = app.get_webview_window(&label) {
    win.hide().map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn show_settings(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(win) = app.get_webview_window("settings") {
    win.show().map_err(|e| e.to_string())?;
    win.unminimize().ok();
    win.set_focus().map_err(|e| e.to_string())?;
  } else {
    // Create settings window if it doesn't exist
    let win = tauri::WebviewWindowBuilder::new(
      &app,
      "settings",
      tauri::WebviewUrl::App("settings.html".into())
    )
    .title("PromptKitcha Settings")
    .inner_size(860.0, 620.0)
    .min_inner_size(720.0, 520.0)
    .center()
    .build()
    .map_err(|e| e.to_string())?;
    
    win.show().map_err(|e| e.to_string())?;
    win.set_focus().map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn show_popup_at_cursor(app: tauri::AppHandle) -> Result<(), String> {
  let state = app.state::<SharedState>();
  let fresh = foreground::capture();
  if !foreground::is_our_process(&fresh) {
    *state.active_app.write() = Some(fresh);
  }

  let win = app
    .get_webview_window("popup")
    .ok_or("popup window missing")?;
  let anchor = cursor::get_popup_anchor(560, 360);
  if let Ok(pos) = anchor {
    let _ = win.set_position(tauri::PhysicalPosition::new(pos.x, pos.y));
  }
  win.show().map_err(|e| e.to_string())?;
  win.set_focus().map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
fn show_image_prompt(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(win) = app.get_webview_window("image-prompt") {
    win.show().map_err(|e| e.to_string())?;
    win.unminimize().ok();
    win.set_focus().map_err(|e| e.to_string())?;
  } else {
    // Create image-prompt window if it doesn't exist
    let win = tauri::WebviewWindowBuilder::new(
      &app,
      "image-prompt",
      tauri::WebviewUrl::App("image-prompt.html".into())
    )
    .title("PromptKitcha · Image prompt")
    .inner_size(640.0, 520.0)
    .min_inner_size(480.0, 400.0)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    win.show().map_err(|e| e.to_string())?;
    win.set_focus().map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
  app.exit(0);
}

fn park_pill_position(win: &tauri::WebviewWindow) -> Result<(i32, i32), String> {
  let monitor = win
    .current_monitor()
    .map_err(|e| e.to_string())?
    .or_else(|| win.primary_monitor().ok().flatten())
    .ok_or("no monitor")?;
  let size = monitor.size();
  let pos = monitor.position();
  let pill_w = 180i32;
  let pill_h = 52i32;
  let margin = 24i32;
  let x = pos.x + size.width as i32 - pill_w - margin;
  let y = pos.y + size.height as i32 - pill_h - margin - 40;
  Ok((x, y))
}
