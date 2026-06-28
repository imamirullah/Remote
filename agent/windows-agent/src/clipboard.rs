use arboard::Clipboard;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::sleep;

pub struct ClipboardSync {
    clipboard: Arc<Mutex<Clipboard>>,
}

impl ClipboardSync {
    pub fn new() -> Self {
        let clipboard = Clipboard::new().expect("Failed to initialize clipboard");
        Self {
            clipboard: Arc::new(Mutex::new(clipboard)),
        }
    }

    /// Spawns a background task monitoring the local clipboard.
    /// Emits updates via the returned channel.
    pub fn start_monitor(&self) -> mpsc::Receiver<String> {
        let (tx, rx) = mpsc::channel(10);
        let clipboard_clone = self.clipboard.clone();

        tokio::spawn(async move {
            let mut last_text = String::new();

            loop {
                sleep(Duration::from_millis(500)).await;

                // Try to acquire lock and read clipboard text
                let current_text = {
                    let mut cb_guard = match clipboard_clone.lock() {
                        Ok(g) => g,
                        Err(_) => continue, // lock poisoned
                    };
                    cb_guard.get_text().unwrap_or_default()
                };

                if !current_text.is_empty() && current_text != last_text {
                    last_text = current_text.clone();
                    if tx.send(current_text).await.is_err() {
                        break; // Receiver disconnected, terminate loop
                    }
                }
            }
        });

        rx
    }

    /// Writes text received from remote session into the local clipboard.
    pub fn write_text(&self, text: String) {
        if let Ok(mut cb_guard) = self.clipboard.lock() {
            let _ = cb_guard.set_text(text);
        }
    }
}
