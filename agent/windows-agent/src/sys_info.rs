use serde::{Serialize, Deserialize};
use local_ip_address::local_ip;
use std::process::Command;
use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SystemInfo {
    #[serde(rename = "deviceId")]
    pub device_id: String,
    #[serde(rename = "deviceName")]
    pub device_name: String,
    pub hostname: String,
    #[serde(rename = "operatingSystem")]
    pub operating_system: String,
    #[serde(rename = "windowsVersion")]
    pub windows_version: String,
    pub cpu: String,
    pub ram: f64, // in GB
    #[serde(rename = "ipAddress")]
    pub ip_address: String,
}

pub fn get_system_info(device_id: &str) -> SystemInfo {
    // 1. Get Hostname from environment
    let hostname = std::env::var("COMPUTERNAME")
        .unwrap_or_else(|_| "Windows-PC".to_string());

    // 2. Get RAM in GB using native Win32 API
    let mut ram_gb = 8.0; // fallback
    unsafe {
        let mut mem_status = MEMORYSTATUSEX::default();
        mem_status.dwLength = std::mem::size_of::<MEMORYSTATUSEX>() as u32;
        if GlobalMemoryStatusEx(&mut mem_status).as_bool() {
            let total_phys = mem_status.ullTotalPhys;
            let gb = (total_phys as f64) / (1024.0 * 1024.0 * 1024.0);
            ram_gb = (gb * 100.0).round() / 100.0;
        }
    }

    // 3. Get CPU brand name using wmic command (robust and requires no registry API bindings)
    let mut cpu_brand = "Intel/AMD Processor".to_string();
    if let Ok(output) = Command::new("wmic").args(["cpu", "get", "name"]).output() {
        if let Ok(stdout) = String::from_utf8(output.stdout) {
            let lines: Vec<&str> = stdout.lines().map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
            if lines.len() > 1 {
                cpu_brand = lines[1].to_string();
            }
        }
    }

    // 4. Get OS Version / Product Name
    let mut os_version = "10/11".to_string();
    if let Ok(output) = Command::new("powershell")
        .args(["-Command", "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion').ProductName"])
        .output() {
        if let Ok(stdout) = String::from_utf8(output.stdout) {
            let trimmed = stdout.trim();
            if !trimmed.is_empty() {
                os_version = trimmed.to_string();
            }
        }
    }

    let local_ip_str = local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string());

    SystemInfo {
        device_id: device_id.to_string(),
        device_name: format!("{} ({})", hostname, os_version),
        hostname,
        operating_system: "Windows".to_string(),
        windows_version: os_version,
        cpu: cpu_brand,
        ram: ram_gb,
        ip_address: local_ip_str,
    }
}
