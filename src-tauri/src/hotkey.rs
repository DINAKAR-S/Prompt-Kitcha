use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::SharedState;

pub fn install_default(app: &AppHandle, state: &SharedState) -> anyhow::Result<()> {
    let combo = state.config.read().hotkey.clone();
    register(app, &combo)?;
    Ok(())
}

fn parse_shortcut(combo: &str) -> anyhow::Result<Shortcut> {
    combo
        .parse::<Shortcut>()
        .map_err(|e| anyhow::anyhow!("invalid shortcut '{combo}': {e}"))
}

fn register(app: &AppHandle, combo: &str) -> anyhow::Result<()> {
    let gs = app.global_shortcut();
    let sc = parse_shortcut(combo)?;

    let app_clone = app.clone();
    gs.on_shortcut(sc, move |_app, _sc, event| {
        if event.state() == ShortcutState::Pressed {
            let app = app_clone.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = trigger(&app).await {
                    tracing::warn!("hotkey trigger failed: {e}");
                }
            });
        }
    })?;
    Ok(())
}

async fn trigger(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<SharedState>();
    let hint = crate::foreground::capture();
    *state.active_app.write() = Some(hint);
    let text = crate::keystroke::capture_selection(app.clone(), state).await?;

    if let Some(win) = app.get_webview_window("popup") {
        let anchor = crate::cursor::get_popup_anchor(560, 360);
        if let Ok(p) = anchor {
            let _ = win.set_position(tauri::PhysicalPosition::new(p.x, p.y));
        }
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
    }

    app.emit("pw:selection-captured", text)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn register_hotkey(app: AppHandle, combo: String) -> Result<(), String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    register(&app, &combo).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unregister_hotkey(app: AppHandle) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())
}
