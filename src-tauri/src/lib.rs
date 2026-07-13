mod commands;
mod roku;

use commands::{
    ping, roku_app_icon, roku_apps, roku_device_info, roku_install, roku_keypress, roku_launch,
    roku_media_player, roku_type, brainerd_api,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ping,
            roku_launch,
            roku_install,
            roku_keypress,
            roku_type,
            roku_device_info,
            roku_apps,
            roku_app_icon,
            roku_media_player,
            brainerd_api
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
