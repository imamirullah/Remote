use std::time::Instant;
use windows::core::{ComInterface, Result};
use windows::Win32::Graphics::Direct3D::{D3D_DRIVER_TYPE_HARDWARE, D3D_FEATURE_LEVEL_11_1};
use windows::Win32::Graphics::Direct3D11::{
    D3D11CreateDevice, ID3D11Device, ID3D11DeviceContext, ID3D11Texture2D, D3D11_BIND_FLAG,
    D3D11_CPU_ACCESS_READ, D3D11_RESOURCE_MISC_FLAG, D3D11_TEXTURE2D_DESC, D3D11_USAGE_STAGING,
};
use windows::Win32::Graphics::Dxgi::{
    IDXGIAdapter1, IDXGIDevice, IDXGIOutput1,
    IDXGIOutputDuplication, DXGI_OUTDUPL_FRAME_INFO,
};

pub struct ScreenCapture {
    device: Option<ID3D11Device>,
    context: Option<ID3D11DeviceContext>,
    duplication: Option<IDXGIOutputDuplication>,
    staging_texture: Option<ID3D11Texture2D>,
    width: u32,
    height: u32,
    is_fallback: bool,
    start_time: Instant,
}

impl ScreenCapture {
    pub fn new() -> Self {
        match Self::init_dxgi() {
            Ok((device, context, duplication, width, height)) => {
                println!("DirectX Graphics Infrastructure (DXGI) Initialized. Resolution: {}x{}", width, height);
                Self {
                    device: Some(device),
                    context: Some(context),
                    duplication: Some(duplication),
                    staging_texture: None,
                    width,
                    height,
                    is_fallback: false,
                    start_time: Instant::now(),
                }
            }
            Err(err) => {
                println!("DXGI Duplication not available (possibly headless or VM context): {}. Falling back to virtual screen generator.", err);
                Self {
                    device: None,
                    context: None,
                    duplication: None,
                    staging_texture: None,
                    width: 1280,
                    height: 720,
                    is_fallback: true,
                    start_time: Instant::now(),
                }
            }
        }
    }

    fn init_dxgi() -> Result<(ID3D11Device, ID3D11DeviceContext, IDXGIOutputDuplication, u32, u32)> {
        unsafe {
            // Create D3D11 Device
            let mut device: Option<ID3D11Device> = None;
            let mut context: Option<ID3D11DeviceContext> = None;
            let mut feature_level = D3D_FEATURE_LEVEL_11_1;

            D3D11CreateDevice(
                None,
                D3D_DRIVER_TYPE_HARDWARE,
                None,
                windows::Win32::Graphics::Direct3D11::D3D11_CREATE_DEVICE_FLAG(0),
                None,
                windows::Win32::Graphics::Direct3D11::D3D11_SDK_VERSION,
                Some(&mut device as *mut Option<ID3D11Device>),
                Some(&mut feature_level as *mut _),
                Some(&mut context as *mut Option<ID3D11DeviceContext>),
            )?;

            let device = device.unwrap();
            let context = context.unwrap();

            // Get DXGI Device, Adapter, and Output
            let dxgi_device: IDXGIDevice = device.cast()?;
            let adapter = dxgi_device.GetAdapter()?;
            let adapter1: IDXGIAdapter1 = adapter.cast()?;
            let output = adapter1.EnumOutputs(0)?;
            let output1: IDXGIOutput1 = output.cast()?;

            // Duplicate the desktop output
            let duplication = output1.DuplicateOutput(&device)?;
            let mut desc = windows::Win32::Graphics::Dxgi::DXGI_OUTDUPL_DESC::default();
            duplication.GetDesc(&mut desc);

            let width = desc.ModeDesc.Width;
            let height = desc.ModeDesc.Height;

            Ok((device, context, duplication, width, height))
        }
    }

    /// Captures the next screen frame. Returns a BGRA buffer.
    pub fn capture_frame(&mut self) -> Vec<u8> {
        if self.is_fallback {
            return self.generate_fallback_frame();
        }

        let duplication = self.duplication.as_ref().unwrap();
        let context = self.context.as_ref().unwrap();
        let device = self.device.as_ref().unwrap();

        unsafe {
            let mut frame_info = DXGI_OUTDUPL_FRAME_INFO::default();
            let mut resource = None;

            // Acquire next frame with a 50ms timeout
            let res = duplication.AcquireNextFrame(50, &mut frame_info, &mut resource);
            if res.is_err() {
                // If it times out or fails (due to no screen changes), generate the last frame or a blank/fallback
                return self.generate_fallback_frame();
            }

            let resource = resource.unwrap();
            let texture: ID3D11Texture2D = resource.cast().unwrap();

            // Create staging texture if not created
            if self.staging_texture.is_none() {
                let mut desc = D3D11_TEXTURE2D_DESC::default();
                texture.GetDesc(&mut desc);
                desc.Usage = D3D11_USAGE_STAGING;
                desc.BindFlags = D3D11_BIND_FLAG(0);
                desc.CPUAccessFlags = D3D11_CPU_ACCESS_READ;
                desc.MiscFlags = D3D11_RESOURCE_MISC_FLAG(0);

                let mut staging = None;
                if unsafe { device.CreateTexture2D(&desc, None, Some(&mut staging as *mut Option<ID3D11Texture2D>)) }.is_ok() {
                    self.staging_texture = staging;
                }
            }

            let mut frame_data = vec![0u8; (self.width * self.height * 4) as usize];

            if let Some(ref staging) = self.staging_texture {
                // Copy texture to staging
                context.CopyResource(staging, &texture);

                // Map the staging texture to read CPU bytes
                let mut mapped_resource = windows::Win32::Graphics::Direct3D11::D3D11_MAPPED_SUBRESOURCE::default();
                let map_res = context.Map(
                    staging,
                    0,
                    windows::Win32::Graphics::Direct3D11::D3D11_MAP_READ,
                    0,
                    Some(&mut mapped_resource),
                );

                if map_res.is_ok() {
                    let src_ptr = mapped_resource.pData as *const u8;
                    let row_pitch = mapped_resource.RowPitch as usize;

                    // Copy row-by-row accounting for row pitch (alignment bytes)
                    let width_bytes = (self.width * 4) as usize;
                    for row in 0..self.height {
                        let src_row = src_ptr.add(row as usize * row_pitch);
                        let dest_row = &mut frame_data[(row as usize * width_bytes)..((row as usize + 1) * width_bytes)];
                        std::ptr::copy_nonoverlapping(src_row, dest_row.as_mut_ptr(), width_bytes);
                    }

                    context.Unmap(staging, 0);
                }
            }

            // Release frame back to DXGI
            let _ = duplication.ReleaseFrame();

            frame_data
        }
    }

    /// Generates a mock virtual desktop frame when DXGI is not available
    fn generate_fallback_frame(&self) -> Vec<u8> {
        let size = (self.width * self.height * 4) as usize;
        let mut frame = vec![0u8; size];

        // Draw a dark slate-gray background
        for i in (0..size).step_by(4) {
            frame[i] = 30;     // B
            frame[i + 1] = 27; // G
            frame[i + 2] = 20; // R
            frame[i + 3] = 255; // A
        }

        // Draw a moving circle to simulate active desktop activity
        let elapsed = self.start_time.elapsed().as_secs_f64();
        let cx = (self.width / 2) as f64 + (self.width / 4) as f64 * (elapsed * 2.0).cos();
        let cy = (self.height / 2) as f64 + (self.height / 4) as f64 * (elapsed * 2.0).sin();
        let radius = 60.0;

        for y in 0..self.height {
            for x in 0..self.width {
                let dx = x as f64 - cx;
                let dy = y as f64 - cy;
                if dx * dx + dy * dy < radius * radius {
                    let idx = ((y * self.width + x) * 4) as usize;
                    // Blue-violet orb
                    frame[idx] = 250;     // B
                    frame[idx + 1] = 100; // G
                    frame[idx + 2] = 79;  // R
                }
            }
        }

        frame
    }
}
