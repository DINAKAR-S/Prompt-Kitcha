use tauri::{AppHandle, State};
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::SharedState;

#[cfg(windows)]
mod sys {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
        VIRTUAL_KEY, VK_C, VK_CONTROL, VK_V,
    };

    fn make(vk: VIRTUAL_KEY, up: bool) -> INPUT {
        let flags = if up { KEYEVENTF_KEYUP } else { KEYBD_EVENT_FLAGS(0) };
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: 0,
                    dwFlags: flags,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        }
    }

    fn chord(second: VIRTUAL_KEY) {
        let inputs = [
            make(VK_CONTROL, false),
            make(second, false),
            make(second, true),
            make(VK_CONTROL, true),
        ];
        unsafe {
            SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        }
    }

    pub fn send_copy() { chord(VK_C); }
    pub fn send_paste() { chord(VK_V); }
}

#[cfg(not(windows))]
mod sys {
    pub fn send_copy() {}
    pub fn send_paste() {}
}

fn sleep_ms(ms: u64) {
    std::thread::sleep(std::time::Duration::from_millis(ms));
}

#[tauri::command]
pub async fn capture_selection(
    app: AppHandle,
    state: State<'_, SharedState>,
) -> Result<String, String> {
    let cb = app.clipboard();
    let prior = cb.read_text().ok();
    *state.saved_clipboard.write() = prior.clone();

    let sentinel = format!("\u{E000}pw-capture-{}\u{E001}", fastrand_hex());
    let _ = cb.write_text(sentinel.clone());
    *state.last_self_write.write() = Some(sentinel.clone());
    sleep_ms(60);

    sys::send_copy();

    let mut captured: Option<String> = None;
    for _ in 0..12 {
        sleep_ms(40);
        if let Ok(t) = cb.read_text() {
            if t != sentinel && !t.is_empty() {
                captured = Some(t);
                break;
            }
        }
    }

    if let Some(orig) = prior.clone() {
        *state.last_self_write.write() = Some(orig.clone());
        let _ = cb.write_text(orig);
    }

    let final_text = captured.unwrap_or_default();
    if final_text.trim().is_empty() {
        return Err(
            "no selection captured — click into a text app (Notepad, VS Code, Chrome), select text, then press the hotkey. Terminals (CMD/PowerShell) don't respond to Ctrl+C the same way."
                .into(),
        );
    }
    Ok(final_text)
}

fn fastrand_hex() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let n = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    format!("{n:x}")
}

#[tauri::command]
pub async fn replace_selection(
    app: AppHandle,
    state: State<'_, SharedState>,
    text: String,
) -> Result<(), String> {
    // Save current clipboard
    let cb = app.clipboard();
    let prior = cb.read_text().ok();
    
    // Write our text to clipboard
    *state.last_self_write.write() = Some(text.clone());
    cb.write_text(text).map_err(|e| e.to_string())?;
    
    // Small delay to ensure clipboard is ready
    sleep_ms(50);
    
    // Simulate Ctrl+V to paste
    sys::send_paste();
    
    // Wait for paste to complete
    sleep_ms(200);
    
    // Optionally restore original clipboard
    // (disabled - let user restore manually if needed)
    /*
    if let Some(orig) = prior {
        *state.last_self_write.write() = Some(orig.clone());
        let _ = cb.write_text(orig);
    }
    */
    Ok(())
}