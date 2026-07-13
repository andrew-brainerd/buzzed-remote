use std::time::Duration;

use serde::Serialize;

// Roku External Control Protocol (ECP) lives on HTTP port 8060. All control is a POST to a path;
// device/app info are GETs that return XML. No auth — same-LAN reachability is the only requirement.
const ECP_PORT: u16 = 8060;
const TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Debug, thiserror::Error)]
pub enum RokuError {
    #[error("request to Roku failed: {0}")]
    Http(String),
    #[error("Roku returned status {0}")]
    Status(u16),
    #[error("failed to parse Roku response: {0}")]
    Xml(String),
}

impl From<reqwest::Error> for RokuError {
    fn from(e: reqwest::Error) -> Self {
        RokuError::Http(e.to_string())
    }
}

#[derive(Debug, Serialize)]
pub struct DeviceInfo {
    pub name: String,
    pub model: String,
    pub is_tv: bool,
    pub power_on: bool,
}

#[derive(Debug, Serialize)]
pub struct RokuApp {
    pub id: String,
    pub name: String,
    /// "app" for a channel (type="appl"), "input" for a TV input (type="tvin", e.g. HDMI).
    pub kind: String,
}

#[derive(Debug, Serialize)]
pub struct MediaPlayer {
    /// "play", "pause", "stop", "close", "startup", "buffer", "none"… "close" when nothing is playing.
    pub state: String,
    /// The foreground media app (channel id / name), when something is playing.
    pub app_id: Option<String>,
    pub app_name: Option<String>,
    pub position_ms: Option<u64>,
    pub duration_ms: Option<u64>,
    pub is_live: bool,
}

fn client() -> Result<reqwest::Client, RokuError> {
    reqwest::Client::builder().timeout(TIMEOUT).build().map_err(RokuError::from)
}

fn base(ip: &str) -> String {
    format!("http://{ip}:{ECP_PORT}")
}

async fn post(url: &str) -> Result<(), RokuError> {
    let resp = client()?.post(url).body("").send().await?;
    if !resp.status().is_success() {
        return Err(RokuError::Status(resp.status().as_u16()));
    }
    Ok(())
}

async fn get_text(url: &str) -> Result<String, RokuError> {
    let resp = client()?.get(url).send().await?;
    if !resp.status().is_success() {
        return Err(RokuError::Status(resp.status().as_u16()));
    }
    Ok(resp.text().await?)
}

/// Launch (and optionally deep-link into) an app. `content_id`/`media_type` present = cast to a title.
pub async fn launch(
    ip: &str,
    channel_id: &str,
    content_id: Option<&str>,
    media_type: Option<&str>,
) -> Result<(), RokuError> {
    let mut url = format!("{}/launch/{}", base(ip), channel_id);
    let mut params: Vec<String> = Vec::new();
    if let Some(cid) = content_id {
        params.push(format!("contentId={}", urlencoding::encode(cid)));
    }
    if let Some(mt) = media_type {
        params.push(format!("mediaType={}", urlencoding::encode(mt)));
    }
    if !params.is_empty() {
        url.push('?');
        url.push_str(&params.join("&"));
    }
    post(&url).await
}

pub async fn install(ip: &str, channel_id: &str) -> Result<(), RokuError> {
    post(&format!("{}/install/{}", base(ip), channel_id)).await
}

pub async fn keypress(ip: &str, key: &str) -> Result<(), RokuError> {
    post(&format!("{}/keypress/{}", base(ip), key)).await
}

/// Type a string into the TV's focused field, one `Lit_` keypress per character.
pub async fn type_text(ip: &str, text: &str) -> Result<(), RokuError> {
    for ch in text.chars() {
        let encoded = urlencoding::encode(&ch.to_string()).into_owned();
        post(&format!("{}/keypress/Lit_{}", base(ip), encoded)).await?;
    }
    Ok(())
}

pub async fn device_info(ip: &str) -> Result<DeviceInfo, RokuError> {
    let xml = get_text(&format!("{}/query/device-info", base(ip))).await?;
    let doc = roxmltree::Document::parse(&xml).map_err(|e| RokuError::Xml(e.to_string()))?;
    let text_of = |tag: &str| -> String {
        doc.descendants()
            .find(|n| n.has_tag_name(tag))
            .and_then(|n| n.text())
            .unwrap_or("")
            .trim()
            .to_string()
    };
    let friendly = text_of("friendly-device-name");
    let name = if friendly.is_empty() { text_of("user-device-name") } else { friendly };
    Ok(DeviceInfo {
        name: if name.is_empty() { ip.to_string() } else { name },
        model: text_of("model-name"),
        is_tv: text_of("is-tv") == "true",
        power_on: text_of("power-mode") == "PowerOn",
    })
}

/// Installed channels (type="appl") AND TV inputs (type="tvin", e.g. HDMI labelled "Steam").
/// Both are launchable via `/launch/<id>`, so the Shortcuts view treats them uniformly.
pub async fn apps(ip: &str) -> Result<Vec<RokuApp>, RokuError> {
    let xml = get_text(&format!("{}/query/apps", base(ip))).await?;
    let doc = roxmltree::Document::parse(&xml).map_err(|e| RokuError::Xml(e.to_string()))?;
    let apps = doc
        .descendants()
        .filter(|n| n.has_tag_name("app"))
        .filter_map(|n| {
            let kind = match n.attribute("type") {
                Some("appl") => "app",
                Some("tvin") => "input",
                _ => return None,
            };
            let id = n.attribute("id")?.to_string();
            let name = n.text().unwrap_or("").trim().to_string();
            Some(RokuApp { id, name, kind: kind.to_string() })
        })
        .collect();
    Ok(apps)
}

/// Current playback on the device (ECP /query/media-player). `state` is "close"/"none" when nothing is
/// playing; the `plugin` element names the foreground media app; position/duration come as "<n> ms" text.
pub async fn media_player(ip: &str) -> Result<MediaPlayer, RokuError> {
    let xml = get_text(&format!("{}/query/media-player", base(ip))).await?;
    let doc = roxmltree::Document::parse(&xml).map_err(|e| RokuError::Xml(e.to_string()))?;

    let state = doc
        .descendants()
        .find(|n| n.has_tag_name("player"))
        .and_then(|n| n.attribute("state"))
        .unwrap_or("close")
        .to_string();

    let plugin = doc.descendants().find(|n| n.has_tag_name("plugin"));
    let app_id = plugin.and_then(|n| n.attribute("id")).map(str::to_string);
    let app_name = plugin.and_then(|n| n.attribute("name")).map(str::to_string);

    // Position/duration arrive as e.g. "7050 ms" — take the leading integer. Prefer the text node;
    // fall back to a same-named attribute on <player> (some apps report them that way). Note: many apps
    // (e.g. Netflix) don't expose progress at all, so these can legitimately be None while playing.
    let leading_u64 = |s: &str| s.trim().split_whitespace().next().and_then(|d| d.parse::<u64>().ok());
    let ms_of = |tag: &str| -> Option<u64> {
        doc.descendants()
            .find(|n| n.has_tag_name(tag))
            .and_then(|n| n.text())
            .and_then(leading_u64)
            .or_else(|| {
                doc.descendants()
                    .find(|n| n.has_tag_name("player"))
                    .and_then(|n| n.attribute(tag))
                    .and_then(leading_u64)
            })
    };

    let is_live = doc
        .descendants()
        .find(|n| n.has_tag_name("is_live"))
        .and_then(|n| n.text())
        .map(|t| t.trim() == "true")
        .unwrap_or(false);

    Ok(MediaPlayer {
        state,
        app_id,
        app_name,
        position_ms: ms_of("position"),
        duration_ms: ms_of("duration"),
        is_live,
    })
}

/// The app/input icon as a `data:` URL (Roku serves a PNG/JPEG at /query/icon/<id>).
/// TV inputs may not have one — the caller falls back to a text tile on error.
pub async fn app_icon(ip: &str, id: &str) -> Result<String, RokuError> {
    let resp = client()?.get(format!("{}/query/icon/{}", base(ip), id)).send().await?;
    if !resp.status().is_success() {
        return Err(RokuError::Status(resp.status().as_u16()));
    }
    let content_type = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/png")
        .to_string();
    let bytes = resp.bytes().await?;
    if bytes.is_empty() {
        return Err(RokuError::Http("empty icon".to_string()));
    }
    use base64::Engine;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", content_type, encoded))
}
