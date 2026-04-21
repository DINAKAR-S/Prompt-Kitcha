use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let open_settings = MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
    let optimize_now = MenuItem::with_id(app, "optimize", "Optimize Clipboard", true, None::<&str>)?;
    let show_pill = MenuItem::with_id(app, "show_pill", "Show Floating Pill", true, None::<&str>)?;
    let hide_pill = MenuItem::with_id(app, "hide_pill", "Hide Floating Pill", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&optimize_now, &show_pill, &hide_pill, &open_settings, &quit])?;

    let _tray = TrayIconBuilder::with_id("pw-tray")
        .tooltip("PromptKitchen")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
    "settings" => {
      if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
      } else {
        // Create settings window if it doesn't exist
        let _ = tauri::WebviewWindowBuilder::new(
          app,
          "settings",
          tauri::WebviewUrl::App("settings.html".into())
        )
        .title("PromptKitchen Settings")
        .inner_size(860.0, 620.0)
        .min_inner_size(720.0, 520.0)
        .center()
        .build();
      }
    }
            "optimize" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    let cb = tauri_plugin_clipboard_manager::ClipboardExt::clipboard(&app);
                    if let Ok(text) = cb.read_text() {
                        if let Some(win) = app.get_webview_window("popup") {
                            let anchor = crate::cursor::get_popup_anchor(560, 360);
                            if let Ok(p) = anchor {
                                let _ = win.set_position(tauri::PhysicalPosition::new(p.x, p.y));
                            }
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                        let _ = tauri::Emitter::emit(&app, "pw:selection-captured", text);
                    }
                });
            }
            "show_pill" => {
                if let Some(pill) = app.get_webview_window("pill") {
                    let _ = pill.show();
                }
            }
            "hide_pill" => {
                if let Some(pill) = app.get_webview_window("pill") {
                    let _ = pill.hide();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .icon(app.default_window_icon().cloned().unwrap_or_else(|| {
            tauri::image::Image::new_owned(vec![0, 0, 0, 0], 1, 1)
        }))
        .build(app)?;

    Ok(())
}
