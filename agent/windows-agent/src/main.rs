mod capture;
mod clipboard;
mod connection;
mod input;
mod sys_info;

use connection::ConnectionManager;
use std::fs;
use std::path::Path;
use uuid::Uuid;

#[tokio::main]
async fn main() {
    println!("====================================================");
    println!("Browser-First Remote Support Platform Host Agent");
    println!("====================================================");

    // Initialize or load persistent Device ID
    let device_config_path = "device.conf";
    let device_id = if Path::new(device_config_path).exists() {
        fs::read_to_string(device_config_path)
            .unwrap_or_else(|_| Uuid::new_v4().to_string())
            .trim()
            .to_string()
    } else {
        let new_id = Uuid::new_v4().to_string();
        if let Err(e) = fs::write(device_config_path, &new_id) {
            println!("Warning: Could not save persistent device ID: {}. Generating ephemeral ID.", e);
        }
        new_id
    };

    println!("Device ID: {}", device_id);

    // Read server URL from environment or configuration, default to local websocket service
    let server_url = std::env::var("SIGNALING_SERVER_URL")
        .unwrap_or_else(|_| "ws://127.0.0.1:5003/".to_string());

    let manager = ConnectionManager::new(device_id, server_url);
    manager.start().await;
}
