use tauri::{AppHandle, State};
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::SharedState;

#[tauri::command]
pub fn save_clipboard(app: AppHandle, state: State<'_, SharedState>) -> Result<(), String> {
    let text = app.clipboard().read_text().ok();
    *state.saved_clipboard.write() = text;
    Ok(())
}

#[tauri::command]
pub fn restore_clipboard(app: AppHandle, state: State<'_, SharedState>) -> Result<(), String> {
    let saved = state.saved_clipboard.write().take();
    if let Some(t) = saved {
        app.clipboard().write_text(t).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn read_clipboard(app: AppHandle) -> Result<String, String> {
    app.clipboard().read_text().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_clipboard(app: AppHandle, text: String) -> Result<(), String> {
    app.clipboard().write_text(text).map_err(|e| e.to_string())
}
