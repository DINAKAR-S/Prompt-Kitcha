use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use std::sync::atomic::Ordering;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use crate::SharedState;

static LAST_TRIGGER_AT: OnceLock<Mutex<Instant>> = OnceLock::new();
const HOTKEY_COOLDOWN: Duration = Duration::from_millis(700);

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

fn should_handle_shortcut_event(state: ShortcutState) -> bool {
    matches!(state, ShortcutState::Released)
}

fn register(app: &AppHandle, combo: &str) -> anyhow::Result<()> {
    let gs = app.global_shortcut();
    let sc = validate_and_parse_shortcut(combo)?;

    let app_clone = app.clone();
    gs.on_shortcut(sc, move |_app, _sc, event| {
        if should_handle_shortcut_event(event.state()) {
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
    if state.hotkey_busy.swap(true, Ordering::AcqRel) {
        return Ok(());
    }
    let result = async {
        let now = Instant::now();
        let gate = LAST_TRIGGER_AT.get_or_init(|| Mutex::new(Instant::now() - HOTKEY_COOLDOWN));
        {
            let mut last = gate.lock().map_err(|_| "hotkey lock poisoned".to_string())?;
            if now.duration_since(*last) < HOTKEY_COOLDOWN {
                return Ok(());
            }
            *last = now;
        }

        let hint = crate::foreground::capture();
        if crate::foreground::is_our_process(&hint) {
            return Ok(());
        }
        *state.active_app.write() = Some(hint);
        let text = crate::keystroke::capture_selection(app.clone(), state.clone()).await?;

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
    .await;

    state.hotkey_busy.store(false, Ordering::Release);
    result
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

#[cfg(test)]
mod tests {
    use super::{should_handle_shortcut_event, validate_combo_shape};
    use tauri_plugin_global_shortcut::ShortcutState;

    #[test]
    fn accepts_valid_modifier_plus_key() {
        assert!(validate_combo_shape("CommandOrControl+Shift+Space").is_ok());
        assert!(validate_combo_shape("Alt+F").is_ok());
        assert!(validate_combo_shape("Ctrl+1").is_ok());
    }

    #[test]
    fn rejects_missing_modifier() {
        assert!(validate_combo_shape("Space").is_err());
        assert!(validate_combo_shape("F2").is_err());
    }

    #[test]
    fn rejects_modifier_only() {
        assert!(validate_combo_shape("Ctrl+Shift").is_err());
        assert!(validate_combo_shape("Alt").is_err());
    }

    #[test]
    fn rejects_multiple_primary_keys() {
        assert!(validate_combo_shape("Ctrl+K+P").is_err());
        assert!(validate_combo_shape("Alt+F+G").is_err());
    }

    #[test]
    fn only_handles_shortcut_on_release() {
        assert!(!should_handle_shortcut_event(ShortcutState::Pressed));
        assert!(should_handle_shortcut_event(ShortcutState::Released));
    }
}
