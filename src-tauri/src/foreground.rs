use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppHint {
    pub process: String,
    pub title: String,
    pub surface: &'static str,
    #[serde(default)]
    pub hwnd: isize,
}

#[cfg(windows)]
pub fn capture() -> AppHint {
    use windows::Win32::Foundation::{CloseHandle, HWND, MAX_PATH};
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
    };

    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.0.is_null() {
            return AppHint::default();
        }

        let mut title_buf = [0u16; 512];
        let tlen = GetWindowTextW(hwnd, &mut title_buf);
        let title = String::from_utf16_lossy(&title_buf[..tlen as usize]);

        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));

        let mut process = String::new();
        if pid != 0 {
            if let Ok(h) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                let mut buf = [0u16; MAX_PATH as usize];
                let mut len = buf.len() as u32;
                if QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, windows::core::PWSTR(buf.as_mut_ptr()), &mut len).is_ok() {
                    let full = String::from_utf16_lossy(&buf[..len as usize]);
                    process = full
                        .rsplit(['\\', '/'])
                        .next()
                        .unwrap_or(&full)
                        .to_string();
                }
                let _ = CloseHandle(h);
            }
        }

        let surface = classify_surface(&process, &title);
        AppHint {
            process,
            title,
            surface,
            hwnd: hwnd.0 as isize,
        }
    }
}

#[cfg(windows)]
pub fn focus_hwnd(hwnd: isize) -> bool {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
    use windows::Win32::UI::Input::KeyboardAndMouse::SetFocus;
    use windows::Win32::UI::WindowsAndMessaging::{
        BringWindowToTop, GetForegroundWindow, GetWindowThreadProcessId,
        IsIconic, IsWindow, SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOW,
    };
    if hwnd == 0 {
        return false;
    }
    let target = HWND(hwnd as *mut _);
    unsafe {
        if !IsWindow(target).as_bool() {
            return false;
        }

        if IsIconic(target).as_bool() {
            let _ = ShowWindow(target, SW_RESTORE);
        } else {
            let _ = ShowWindow(target, SW_SHOW);
        }

        let fg = GetForegroundWindow();
        let current_tid = GetCurrentThreadId();
        let fg_tid = if !fg.0.is_null() {
            GetWindowThreadProcessId(fg, None)
        } else {
            0
        };
        let target_tid = GetWindowThreadProcessId(target, None);

        let attached_fg = fg_tid != 0 && fg_tid != current_tid;
        let attached_tgt = target_tid != 0 && target_tid != current_tid;

        if attached_fg {
            let _ = AttachThreadInput(current_tid, fg_tid, true);
        }
        if attached_tgt && target_tid != fg_tid {
            let _ = AttachThreadInput(current_tid, target_tid, true);
        }

        let _ = BringWindowToTop(target);
        let ok = SetForegroundWindow(target).as_bool();
        let _ = SetFocus(target);

        if attached_fg {
            let _ = AttachThreadInput(current_tid, fg_tid, false);
        }
        if attached_tgt && target_tid != fg_tid {
            let _ = AttachThreadInput(current_tid, target_tid, false);
        }

        ok
    }
}

#[cfg(not(windows))]
pub fn focus_hwnd(_hwnd: isize) -> bool {
    false
}

#[cfg(not(windows))]
pub fn capture() -> AppHint {
    AppHint::default()
}

pub fn is_our_process(hint: &AppHint) -> bool {
    is_our_process_impl(hint)
}

#[cfg(windows)]
fn is_our_process_impl(hint: &AppHint) -> bool {
    let our = std::env::current_exe()
        .ok()
        .and_then(|p| p.file_name().map(|n| n.to_string_lossy().to_lowercase()))
        .unwrap_or_default();
    if our.is_empty() {
        return false;
    }
    let p = hint.process.to_lowercase();
    p == our
}

#[cfg(not(windows))]
fn is_our_process_impl(_hint: &AppHint) -> bool {
    false
}

fn classify_surface(process: &str, title: &str) -> &'static str {
    let p = process.to_lowercase();
    let t = title.to_lowercase();

    // LLM chat UIs -> output should be a prompt for an LLM.
    let llm_title_hits = [
        "chatgpt", "claude.ai", "claude ", "gemini", "perplexity",
        "copilot", "poe.com", "huggingface chat", "mistral",
        "openrouter", "t3.chat", "grok",
    ];
    for needle in llm_title_hits {
        if t.contains(needle) {
            return "llm_chat";
        }
    }

    // IDEs / coding agents -> output should be an agent instruction.
    let ide_processes = [
        "code.exe", "cursor.exe", "windsurf.exe", "webstorm64.exe",
        "pycharm64.exe", "idea64.exe", "rider64.exe", "goland64.exe",
        "phpstorm64.exe", "clion64.exe", "rustrover64.exe",
        "sublime_text.exe", "atom.exe", "devenv.exe",
    ];
    if ide_processes.iter().any(|x| p == *x) {
        return "ide";
    }
    if t.contains("visual studio code")
        || t.contains("cursor")
        || t.contains("windsurf")
        || t.contains(" - vs code")
    {
        return "ide";
    }

    // Email clients -> output should be the actual email body.
    if p == "outlook.exe" || p == "thunderbird.exe" {
        return "email_client";
    }
    if t.contains("gmail") || t.contains("outlook.com") || t.contains("mail - ") {
        return "email_client";
    }

    // Chat / messengers -> output should be the actual message.
    let chat_processes = [
        "slack.exe", "discord.exe", "teams.exe", "ms-teams.exe",
        "whatsapp.exe", "telegram.exe",
    ];
    if chat_processes.iter().any(|x| p == *x) {
        return "chat_app";
    }

    // Docs / notes / plain text editors -> final artifact.
    let doc_processes = [
        "notepad.exe", "notepad++.exe", "winword.exe", "wordpad.exe",
        "onenote.exe", "obsidian.exe", "notion.exe", "typora.exe",
    ];
    if doc_processes.iter().any(|x| p == *x) {
        return "doc_editor";
    }
    if t.contains("google docs") || t.contains("notion") || t.contains("obsidian") {
        return "doc_editor";
    }

    // Browser search box / address bar heuristic -> search query.
    if (p == "chrome.exe" || p == "msedge.exe" || p == "firefox.exe" || p == "brave.exe")
        && (t.contains("google search") || t.contains("- google") || t.contains("new tab"))
    {
        return "search";
    }

    // Generic browser -> unknown; let the classifier decide from text alone.
    if p == "chrome.exe" || p == "msedge.exe" || p == "firefox.exe" || p == "brave.exe" {
        return "browser";
    }

    "unknown"
}
