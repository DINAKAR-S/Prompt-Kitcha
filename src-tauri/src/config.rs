use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::SharedState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default = "default_hotkey")]
    pub hotkey: String,
    #[serde(default = "default_true")]
    pub show_pill_on_copy: bool,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_provider")]
    pub provider: String,
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default)]
    pub base_url: Option<String>,
    #[serde(default = "default_true")]
    pub auto_replace: bool,
    #[serde(default = "default_true")]
    pub stream: bool,
    #[serde(default = "default_max_chars")]
    pub max_input_chars: usize,
    #[serde(default)]
    pub history_enabled: bool,
    #[serde(default)]
    pub telemetry: bool,
    #[serde(default)]
    pub onboarded: bool,
}

fn default_hotkey() -> String { "CommandOrControl+Shift+Space".into() }
fn default_true() -> bool { true }
fn default_theme() -> String { "system".into() }
fn default_provider() -> String { "openai".into() }
fn default_model() -> String { "gpt-4o-mini".into() }
fn default_max_chars() -> usize { 10_000 }

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            hotkey: default_hotkey(),
            show_pill_on_copy: true,
            theme: default_theme(),
            provider: default_provider(),
            model: default_model(),
            base_url: None,
            auto_replace: true,
            stream: true,
            max_input_chars: default_max_chars(),
            history_enabled: false,
            telemetry: false,
            onboarded: false,
        }
    }
}

impl AppConfig {
    pub fn config_path() -> PathBuf {
        let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
        base.join("PromptKitchen").join("config.toml")
    }

    pub fn load() -> anyhow::Result<Self> {
        let path = Self::config_path();
        if !path.exists() {
            return Ok(Self::default());
        }
        let text = std::fs::read_to_string(&path)?;
        let cfg: Self = toml::from_str(&text)?;
        Ok(cfg)
    }

    pub fn save(&self) -> anyhow::Result<()> {
        let path = Self::config_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, toml::to_string_pretty(self)?)?;
        Ok(())
    }
}

#[tauri::command]
pub fn get_config(state: State<'_, SharedState>) -> AppConfig {
    state.config.read().clone()
}

#[tauri::command]
pub fn update_config(
    state: State<'_, SharedState>,
    patch: serde_json::Value,
) -> Result<AppConfig, String> {
    let mut cfg = state.config.write();
    let mut current = serde_json::to_value(&*cfg).map_err(|e| e.to_string())?;
    if let (Some(obj), Some(patch_obj)) = (current.as_object_mut(), patch.as_object()) {
        for (k, v) in patch_obj {
            obj.insert(k.clone(), v.clone());
        }
    }
    let new_cfg: AppConfig = serde_json::from_value(current).map_err(|e| e.to_string())?;
    *cfg = new_cfg.clone();
    drop(cfg);
    new_cfg.save().map_err(|e| e.to_string())?;
    Ok(new_cfg)
}
