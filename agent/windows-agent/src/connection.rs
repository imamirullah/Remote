use crate::clipboard::ClipboardSync;
use crate::input::{inject_keyboard_event, inject_mouse_event};
use crate::sys_info::get_system_info;
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::sleep;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::protocol::Message;
use url::Url;

pub struct ConnectionManager {
    device_id: String,
    server_url: String,
    clipboard: ClipboardSync,
}

impl ConnectionManager {
    pub fn new(device_id: String, server_url: String) -> Self {
        Self {
            device_id,
            server_url,
            clipboard: ClipboardSync::new(),
        }
    }

    pub async fn start(&self) {
        let clipboard_rx = self.clipboard.start_monitor();
        let (clip_tx, mut clip_rx) = mpsc::channel(10);
        
        // Forward clipboard changes to the connection loop
        tokio::spawn(async move {
            let mut rx = clipboard_rx;
            while let Some(text) = rx.recv().await {
                let _ = clip_tx.send(text).await;
            }
        });

        loop {
            println!("Connecting to signaling server at {}...", self.server_url);

            // Socket.IO protocol url for direct WebSocket transport
            let url_str = format!(
                "{}socket.io/?EIO=4&transport=websocket&clientType=agent&deviceId={}",
                self.server_url, self.device_id
            );

            let url = match Url::parse(&url_str) {
                Ok(u) => u,
                Err(e) => {
                    println!("Failed to parse URL: {}. Retrying in 5 seconds...", e);
                    sleep(Duration::from_secs(5)).await;
                    continue;
                }
            };

            match connect_async(url).await {
                Ok((ws_stream, _)) => {
                    println!("Successfully connected to server.");
                    let (mut write, mut read) = ws_stream.split();
                    
                    // Engine.IO handshake: wait for '0' (open) packet, then send '40' (Socket.IO connection)
                    if let Some(Ok(Message::Text(msg))) = read.next().await {
                        if msg.starts_with('0') {
                            // Send connect to namespace
                            let _ = write.send(Message::Text("40".to_string())).await;
                        }
                    }

                    // Register device specs on connect via HTTP or WebSocket.
                    // We'll send a websocket register event: "device-register"
                    let sys_info = get_system_info(&self.device_id);
                    let reg_payload = json!(["device-register", sys_info]).to_string();
                    let _ = write.send(Message::Text(format!("42{}", reg_payload))).await;

                    // Heartbeat ticker (Engine.IO handles ping/pong, but we also send agent heartbeats)
                    let device_id_clone = self.device_id.clone();
                    let (hb_tx, mut hb_rx) = mpsc::channel(1);
                    tokio::spawn(async move {
                        loop {
                            sleep(Duration::from_secs(15)).await;
                            if hb_tx.send(()).await.is_err() {
                                break;
                            }
                        }
                    });

                    // Main read/write loop
                    loop {
                        tokio::select! {
                            // Handle incoming WebSocket messages
                            msg_res = read.next() => {
                                match msg_res {
                                    Some(Ok(Message::Text(text))) => {
                                        self.handle_server_message(&text, &mut write).await;
                                    }
                                    Some(Ok(Message::Ping(p))) => {
                                        let _ = write.send(Message::Pong(p)).await;
                                    }
                                    None | Some(Err(_)) => {
                                        println!("Connection closed by server.");
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                            
                            // Send local clipboard updates to remote
                            Some(text) = clip_rx.recv() => {
                                let clip_payload = json!(["clipboard", { "deviceId": self.device_id, "text": text }]).to_string();
                                if write.send(Message::Text(format!("42{}", clip_payload))).await.is_err() {
                                    break;
                                }
                            }

                            // Send heartbeats
                            Some(_) = hb_rx.recv() => {
                                let hb_payload = json!(["heartbeat", { "deviceId": device_id_clone }]).to_string();
                                if write.send(Message::Text(format!("42{}", hb_payload))).await.is_err() {
                                    break;
                                }
                            }
                        }
                    }
                }
                Err(err) => {
                    println!("Failed to connect: {}. Retrying in 5 seconds...", err);
                    sleep(Duration::from_secs(5)).await;
                }
            }
        }
    }

    async fn handle_server_message<S>(&self, msg: &str, write: &mut S)
    where
        S: futures_util::Sink<Message> + Unpin,
        <S as futures_util::Sink<Message>>::Error: std::fmt::Debug,
    {
        // Engine.IO Heartbeat Ping
        if msg.starts_with('2') {
            // Reply with Engine.IO Pong '3'
            let _ = write.send(Message::Text("3".to_string())).await;
            return;
        }

        // Socket.IO event packet
        if msg.starts_with("42") {
            let json_str = &msg[2..];
            let parsed: Value = match serde_json::from_str(json_str) {
                Ok(v) => v,
                Err(_) => return,
            };

            if let Value::Array(arr) = parsed {
                if arr.len() < 2 {
                    return;
                }

                let event_name = arr[0].as_str().unwrap_or("");
                let payload = &arr[1];

                match event_name {
                    "session-request" => {
                        let session_id = payload["sessionId"].as_str().unwrap_or("");
                        let engineer_name = payload["engineerName"].as_str().unwrap_or("Support Engineer");
                        println!("Remote connection requested by {} for Session: {}", engineer_name, session_id);
                        
                        // Automatically accept connection for testing/demo.
                        // In production, prompt the user or run as service with predefined authorization.
                        println!("Accepting session request...");
                        let accept_payload = json!(["session-accepted", { "sessionId": session_id }]).to_string();
                        let _ = write.send(Message::Text(format!("42{}", accept_payload))).await;
                    }
                    "mouse-event" => {
                        let event_type = payload["type"].as_str().unwrap_or("");
                        let x = payload["x"].as_f64().unwrap_or(0.0);
                        let y = payload["y"].as_f64().unwrap_or(0.0);
                        let button = payload["button"].as_str();
                        let delta_y = payload["deltaY"].as_f64();
                        
                        inject_mouse_event(event_type, x, y, button, delta_y);
                    }
                    "keyboard-event" => {
                        let event_type = payload["type"].as_str().unwrap_or("");
                        let key = payload["key"].as_str().unwrap_or("");
                        let code = payload["code"].as_str().unwrap_or("");
                        
                        inject_keyboard_event(event_type, key, code);
                    }
                    "clipboard" => {
                        let text = payload["text"].as_str().unwrap_or("");
                        println!("Clipboard synchronized from remote: {}", text);
                        self.clipboard.write_text(text.to_string());
                    }
                    "chat" => {
                        let text = payload["text"].as_str().unwrap_or("");
                        let sender = payload["senderName"].as_str().unwrap_or("Engineer");
                        println!("[Chat] {}: {}", sender, text);
                    }
                    "webrtc-signal" => {
                        let signal = &payload["signal"];
                        println!("WebRTC Signal received: {:?}", signal["type"].as_str());
                        // Forward signaling message internally to WebRTC handler if applicable
                    }
                    _ => {
                        println!("Unhandled websocket event: {}", event_name);
                    }
                }
            }
        }
    }
}
