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

fn is_modifier(token: &str) -> bool {
    matches!(
        token,
        "commandorcontrol"
            | "command"
            | "control"
            | "ctrl"
            | "alt"
            | "option"
            | "shift"
            | "super"
            | "meta"
    )
}

fn validate_combo_shape(combo: &str) -> anyhow::Result<()> {
    let mut has_modifier = false;
    let mut key_count = 0usize;
    for raw in combo.split('+') {
        let token = raw.trim().to_lowercase();
        if token.is_empty() {
            anyhow::bail!("invalid shortcut: empty segment")
        }
        if is_modifier(&token) {
            has_modifier = true;
        } else {
            key_count += 1;
        }
    }
    if !has_modifier {
        anyhow::bail!("invalid shortcut: include at least one modifier key")
    }
    if key_count == 0 {
        anyhow::bail!("invalid shortcut: include a non-modifier key")
    }
    if key_count > 1 {
        anyhow::bail!("invalid shortcut: only one non-modifier key is supported")
    }
    Ok(())
}

fn validate_and_parse_shortcut(combo: &str) -> anyhow::Result<Shortcut> {
    validate_combo_shape(combo)?;
    parse_shortcut(combo)
}

fn register(app: &AppHandle, combo: &str) -> anyhow::Result<()> {
    let gs = app.global_shortcut();
    let sc = validate_and_parse_shortcut(combo)?;

    let app_clone = app.clone();
    gs.on_shortcut(sc, move |_app, _sc, event| {
        if event.state() == ShortcutState::Released {
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
    let combo = combo.trim().to_string();
    validate_and_parse_shortcut(&combo).map_err(|e| e.to_string())?;
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    register(&app, &combo).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn validate_hotkey(combo: String) -> Result<String, String> {
    let combo = combo.trim().to_string();
    let parsed = validate_and_parse_shortcut(&combo).map_err(|e| e.to_string())?;
    Ok(parsed.to_string())
}

#[tauri::command]
pub fn unregister_hotkey(app: AppHandle) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())
}
