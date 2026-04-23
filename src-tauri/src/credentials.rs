use keyring::Entry;

const SERVICE: &str = "com.promptkitcha";

fn entry(provider: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, &format!("{provider}_api_key")).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_api_key(provider: String, key: String) -> Result<(), String> {
    let e = entry(&provider)?;
    e.set_password(&key).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_api_key(provider: String) -> Result<Option<String>, String> {
    let e = entry(&provider)?;
    match e.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub fn delete_api_key(provider: String) -> Result<(), String> {
    let e = entry(&provider)?;
    match e.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub fn has_api_key(provider: String) -> Result<bool, String> {
    Ok(get_api_key(provider)?.is_some())
}

pub fn get_key_internal(provider: &str) -> Option<String> {
    entry(provider).ok().and_then(|e| e.get_password().ok())
}
