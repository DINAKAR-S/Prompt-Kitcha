use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::SharedState;

pub fn spawn(app: AppHandle, state: SharedState) {
    tauri::async_runtime::spawn(async move {
        let mut last: Option<String> = app.clipboard().read_text().ok();
        loop {
            tokio::time::sleep(Duration::from_millis(700)).await;

            if !state.config.read().show_pill_on_copy {
                continue;
            }

            let Ok(current) = app.clipboard().read_text() else { continue };
            if current.trim().is_empty() {
                last = Some(current);
                continue;
            }
            if last.as_deref() == Some(current.as_str()) {
                continue;
            }
            let self_write = state.last_self_write.read().clone();
            if self_write.as_deref() == Some(current.as_str()) {
                last = Some(current);
                continue;
            }

            last = Some(current.clone());

            if let Some(popup) = app.get_webview_window("popup") {
                if popup.is_visible().unwrap_or(false) {
                    continue;
                }
            }

            let hint = crate::foreground::capture();
            *state.active_app.write() = Some(hint);
            let _ = app.emit("pw:pill-shown", current);
        }
    });
}
