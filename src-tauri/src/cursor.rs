use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize)]
pub struct Point {
    pub x: i32,
    pub y: i32,
}

#[cfg(windows)]
pub fn get_cursor_position_raw() -> Result<Point, String> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut p = POINT::default();
    unsafe { GetCursorPos(&mut p).map_err(|e| e.to_string())? };
    Ok(Point { x: p.x, y: p.y })
}

#[cfg(not(windows))]
pub fn get_cursor_position_raw() -> Result<Point, String> {
    Ok(Point { x: 0, y: 0 })
}

#[tauri::command]
pub fn get_cursor_position() -> Result<Point, String> {
    get_cursor_position_raw()
}

#[cfg(windows)]
fn monitor_bounds(p: Point) -> (i32, i32, i32, i32) {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
    let mut info = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };
    unsafe {
        let hm = MonitorFromPoint(POINT { x: p.x, y: p.y }, MONITOR_DEFAULTTONEAREST);
        let _ = GetMonitorInfoW(hm, &mut info);
    }
    (
        info.rcWork.left,
        info.rcWork.top,
        info.rcWork.right,
        info.rcWork.bottom,
    )
}

#[cfg(not(windows))]
fn monitor_bounds(_p: Point) -> (i32, i32, i32, i32) {
    (0, 0, 1920, 1080)
}

#[tauri::command]
pub fn get_popup_anchor(width: i32, height: i32) -> Result<Point, String> {
    let cursor = get_cursor_position_raw()?;
    let (left, top, right, bottom) = monitor_bounds(cursor);
    let margin = 12;
    let mut x = cursor.x + 16;
    let mut y = cursor.y + 16;
    if x + width + margin > right {
        x = right - width - margin;
    }
    if y + height + margin > bottom {
        y = cursor.y - height - 16;
    }
    if x < left + margin { x = left + margin; }
    if y < top + margin { y = top + margin; }
    Ok(Point { x, y })
}
