use std::time::Duration;

use crate::roku::{self, DeviceInfo, MediaPlayer, RokuApp};

#[tauri::command]
pub fn ping() -> &'static str {
    "pong"
}

// brainerd-api base. Override at build time with BUZZED_REMOTE_API_BASE; defaults to the local dev API.
fn api_base() -> String {
    option_env!("BUZZED_REMOTE_API_BASE")
        .unwrap_or("https://local.brainerd.dev:5002/api")
        .to_string()
}

// Authenticated proxy to the brainerd-api /watch/* endpoints. Doing the HTTP from Rust (not the
// webview) sidesteps CORS entirely and lets dev builds accept the local self-signed cert. The
// caller passes a fresh Firebase ID token; `X-Client` routes it to the app auth path server-side.
#[tauri::command]
pub async fn brainerd_api(
    method: String,
    path: String,
    token: String,
    body: Option<serde_json::Value>,
    base: Option<String>,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(cfg!(debug_assertions))
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    // The frontend passes the user-configured base (needed on iOS, where the dev hostname won't
    // resolve); fall back to the compile-time default.
    let resolved_base = base.filter(|b| !b.trim().is_empty()).unwrap_or_else(api_base);
    let url = format!("{}{}", resolved_base.trim_end_matches('/'), path);
    let http_method =
        reqwest::Method::from_bytes(method.to_uppercase().as_bytes()).map_err(|e| e.to_string())?;

    let mut request = client
        .request(http_method, &url)
        .header("Authorization", format!("Bearer {token}"))
        .header("X-Client", "buzzed-remote");
    if let Some(payload) = body {
        request = request.json(&payload);
    }

    let response = request.send().await.map_err(|e| e.to_string())?;
    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("{} {}", status.as_u16(), text));
    }
    if text.is_empty() {
        return Ok(serde_json::Value::Null);
    }
    serde_json::from_str(&text).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn roku_launch(
    ip: String,
    channel_id: String,
    content_id: Option<String>,
    media_type: Option<String>,
) -> Result<(), String> {
    roku::launch(&ip, &channel_id, content_id.as_deref(), media_type.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn roku_install(ip: String, channel_id: String) -> Result<(), String> {
    roku::install(&ip, &channel_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn roku_keypress(ip: String, key: String) -> Result<(), String> {
    roku::keypress(&ip, &key).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn roku_type(ip: String, text: String) -> Result<(), String> {
    roku::type_text(&ip, &text).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn roku_device_info(ip: String) -> Result<DeviceInfo, String> {
    roku::device_info(&ip).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn roku_apps(ip: String) -> Result<Vec<RokuApp>, String> {
    roku::apps(&ip).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn roku_app_icon(ip: String, id: String) -> Result<String, String> {
    roku::app_icon(&ip, &id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn roku_media_player(ip: String) -> Result<MediaPlayer, String> {
    roku::media_player(&ip).await.map_err(|e| e.to_string())
}
