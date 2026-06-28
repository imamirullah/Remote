use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT, KEYEVENTF_KEYUP,
    MOUSEINPUT, MOUSEEVENTF_ABSOLUTE, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP, MOUSEEVENTF_MIDDLEDOWN,
    MOUSEEVENTF_MIDDLEUP, MOUSEEVENTF_MOVE, MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_WHEEL,
    VIRTUAL_KEY, VK_BACK, VK_CONTROL, VK_DELETE, VK_DOWN, VK_ESCAPE, VK_LEFT, VK_LMENU, VK_LSHIFT,
    VK_LWIN, VK_RETURN, VK_RIGHT, VK_SPACE, VK_TAB, VK_UP, VK_F1, VK_F2, VK_F3, VK_F4, VK_F5, VK_F6,
    VK_F7, VK_F8, VK_F9, VK_F10, VK_F11, VK_F12
};
use std::mem::size_of;

pub fn inject_mouse_event(
    event_type: &str,
    x: f64,
    y: f64,
    button: Option<&str>,
    delta_y: Option<f64>,
) {
    // Map normalized coordinates (0.0 to 1.0) to Windows absolute coordinate space (0 to 65535)
    let rx = (x * 65535.0) as i32;
    let ry = (y * 65535.0) as i32;

    let mut dw_flags = MOUSEEVENTF_ABSOLUTE;
    let mut mouse_data = 0u32;

    match event_type {
        "mousemove" => {
            dw_flags |= MOUSEEVENTF_MOVE;
        }
        "mousedown" => {
            match button {
                Some("left") => dw_flags |= MOUSEEVENTF_LEFTDOWN,
                Some("right") => dw_flags |= MOUSEEVENTF_RIGHTDOWN,
                Some("middle") => dw_flags |= MOUSEEVENTF_MIDDLEDOWN,
                _ => {}
            }
        }
        "mouseup" => {
            match button {
                Some("left") => dw_flags |= MOUSEEVENTF_LEFTUP,
                Some("right") => dw_flags |= MOUSEEVENTF_RIGHTUP,
                Some("middle") => dw_flags |= MOUSEEVENTF_MIDDLEUP,
                _ => {}
            }
        }
        "wheel" => {
            dw_flags |= MOUSEEVENTF_WHEEL;
            // delta_y in Windows API is positive for forward (away from user), negative for backward
            // browser deltaY is positive for downward/backward. Let's adjust:
            let dy = delta_y.unwrap_or(0.0);
            mouse_data = if dy > 0.0 { -120i32 as u32 } else { 120u32 };
        }
        _ => {}
    }

    let mouse_input = MOUSEINPUT {
        dx: rx,
        dy: ry,
        mouseData: mouse_data as i32,
        dwFlags: dw_flags,
        time: 0,
        dwExtraInfo: 0,
    };

    let input = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 { mi: mouse_input },
    };

    unsafe {
        SendInput(&[input], size_of::<INPUT>() as i32);
    }
}

pub fn inject_keyboard_event(event_type: &str, key: &str, code: &str) {
    let vk = match code {
        "Enter" => VK_RETURN,
        "Space" => VK_SPACE,
        "Backspace" => VK_BACK,
        "Tab" => VK_TAB,
        "Escape" => VK_ESCAPE,
        "Delete" => VK_DELETE,
        "ArrowUp" => VK_UP,
        "ArrowDown" => VK_DOWN,
        "ArrowLeft" => VK_LEFT,
        "ArrowRight" => VK_RIGHT,
        "ShiftLeft" | "ShiftRight" => VK_LSHIFT,
        "ControlLeft" | "ControlRight" => VK_CONTROL,
        "AltLeft" | "AltRight" => VK_LMENU,
        "MetaLeft" | "MetaRight" => VK_LWIN,
        "F1" => VK_F1,
        "F2" => VK_F2,
        "F3" => VK_F3,
        "F4" => VK_F4,
        "F5" => VK_F5,
        "F6" => VK_F6,
        "F7" => VK_F7,
        "F8" => VK_F8,
        "F9" => VK_F9,
        "F10" => VK_F10,
        "F11" => VK_F11,
        "F12" => VK_F12,
        c if c.starts_with("Key") => {
            // Map e.g. "KeyA" to virtual key code 'A'
            let char_val = c.chars().nth(3).unwrap_or('A');
            VIRTUAL_KEY(char_val as u16)
        }
        c if c.starts_with("Digit") => {
            // Map e.g. "Digit1" to virtual key code '1'
            let char_val = c.chars().nth(5).unwrap_or('0');
            VIRTUAL_KEY(char_val as u16)
        }
        _ => {
            // Fallback: try mapping the first character of the key value
            if key.len() == 1 {
                let char_val = key.to_uppercase().chars().next().unwrap_or(' ');
                VIRTUAL_KEY(char_val as u16)
            } else {
                return; // Ignore unknown keys
            }
        }
    };

    let mut dw_flags = if event_type == "keyup" {
        KEYEVENTF_KEYUP
    } else {
        windows::Win32::UI::Input::KeyboardAndMouse::KEYBD_EVENT_FLAGS(0)
    };

    let kb_input = KEYBDINPUT {
        wVk: vk,
        wScan: 0,
        dwFlags: dw_flags,
        time: 0,
        dwExtraInfo: 0,
    };

    let input = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 { ki: kb_input },
    };

    unsafe {
        SendInput(&[input], size_of::<INPUT>() as i32);
    }
}
