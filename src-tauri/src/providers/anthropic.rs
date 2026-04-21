use async_trait::async_trait;
use eventsource_stream::Eventsource;
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::json;

use super::{ChatRequest, ChunkStream, Provider, ProviderError};

pub struct Anthropic {
    api_key: Option<String>,
    base_url: String,
    client: reqwest::Client,
}

impl Anthropic {
    pub fn new(api_key: Option<String>, base_url: Option<&str>) -> Self {
        Self {
            api_key,
            base_url: base_url
                .unwrap_or("https://api.anthropic.com/v1")
                .trim_end_matches('/')
                .to_string(),
            client: reqwest::Client::new(),
        }
    }
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum StreamEvent {
    #[serde(rename = "content_block_delta")]
    ContentBlockDelta { delta: Delta },
    #[serde(other)]
    Other,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum Delta {
    #[serde(rename = "text_delta")]
    TextDelta { text: String },
    #[serde(other)]
    Other,
}

#[async_trait]
impl Provider for Anthropic {
    fn name(&self) -> &'static str { "anthropic" }

    async fn ping(&self) -> Result<(), ProviderError> {
        if self.api_key.is_none() {
            return Err(ProviderError::MissingKey("anthropic".into()));
        }
        Ok(())
    }

    async fn stream_chat(&self, req: ChatRequest) -> Result<ChunkStream, ProviderError> {
        let key = self
            .api_key
            .as_ref()
            .ok_or_else(|| ProviderError::MissingKey("anthropic".into()))?;

        let body = json!({
            "model": req.model,
            "stream": true,
            "temperature": req.temperature,
            "max_tokens": req.max_tokens,
            "system": req.system,
            "messages": [{ "role": "user", "content": req.user }],
        });

        let resp = self
            .client
            .post(format!("{}/messages", self.base_url))
            .header("x-api-key", key)
            .header("anthropic-version", "2023-06-01")
            .json(&body)
            .send()
            .await
            .map_err(|e| ProviderError::Http(e.to_string()))?;

        if !resp.status().is_success() {
            let s = resp.status();
            let t = resp.text().await.unwrap_or_default();
            return Err(ProviderError::Upstream(format!("{s}: {t}")));
        }

        let stream = resp.bytes_stream().eventsource().filter_map(|r| async move {
            match r {
                Ok(ev) => {
                    if ev.data.is_empty() { return None; }
                    match serde_json::from_str::<StreamEvent>(&ev.data) {
                        Ok(StreamEvent::ContentBlockDelta {
                            delta: Delta::TextDelta { text },
                        }) => Some(Ok(text)),
                        Ok(_) => None,
                        Err(e) => Some(Err(ProviderError::Decode(e.to_string()))),
                    }
                }
                Err(e) => Some(Err(ProviderError::Http(e.to_string()))),
            }
        });

        Ok(Box::pin(stream))
    }
}
