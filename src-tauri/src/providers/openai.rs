use async_trait::async_trait;
use eventsource_stream::Eventsource;
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::json;

use super::{ChatRequest, ChunkStream, Provider, ProviderError};

pub struct OpenAi {
    api_key: Option<String>,
    base_url: String,
    client: reqwest::Client,
}

impl OpenAi {
    pub fn new(api_key: Option<String>, base_url: Option<&str>) -> Self {
        Self {
            api_key,
            base_url: base_url
                .unwrap_or("https://api.openai.com/v1")
                .trim_end_matches('/')
                .to_string(),
            client: reqwest::Client::new(),
        }
    }
}

#[derive(Deserialize)]
struct Delta { content: Option<String> }
#[derive(Deserialize)]
struct Choice { delta: Delta }
#[derive(Deserialize)]
struct Chunk { choices: Vec<Choice> }

#[async_trait]
impl Provider for OpenAi {
    fn name(&self) -> &'static str { "openai" }

    async fn ping(&self) -> Result<(), ProviderError> {
        if self.api_key.is_none() {
            return Err(ProviderError::MissingKey("openai".into()));
        }
        Ok(())
    }

    async fn stream_chat(&self, req: ChatRequest) -> Result<ChunkStream, ProviderError> {
        let key = self
            .api_key
            .as_ref()
            .ok_or_else(|| ProviderError::MissingKey("openai".into()))?;

        let body = json!({
            "model": req.model,
            "stream": true,
            "temperature": req.temperature,
            "max_tokens": req.max_tokens,
            "messages": [
                { "role": "system", "content": req.system },
                { "role": "user", "content": req.user },
            ],
        });

        let resp = self
            .client
            .post(format!("{}/chat/completions", self.base_url))
            .bearer_auth(key)
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
                    if ev.data == "[DONE]" { return None; }
                    match serde_json::from_str::<Chunk>(&ev.data) {
                        Ok(c) => c
                            .choices
                            .into_iter()
                            .next()
                            .and_then(|c| c.delta.content)
                            .map(Ok),
                        Err(e) => Some(Err(ProviderError::Decode(e.to_string()))),
                    }
                }
                Err(e) => Some(Err(ProviderError::Http(e.to_string()))),
            }
        });

        Ok(Box::pin(stream))
    }
}
