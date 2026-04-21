use async_trait::async_trait;
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::json;

use super::{ChatRequest, ChunkStream, Provider, ProviderError};

pub struct Ollama {
    base_url: String,
    client: reqwest::Client,
}

impl Ollama {
    pub fn new(base_url: Option<&str>) -> Self {
        Self {
            base_url: base_url
                .unwrap_or("http://localhost:11434")
                .trim_end_matches('/')
                .to_string(),
            client: reqwest::Client::new(),
        }
    }
}

#[derive(Deserialize)]
struct OllamaChunk {
    message: Option<Message>,
    #[serde(default)]
    done: bool,
}

#[derive(Deserialize)]
struct Message { content: String }

#[async_trait]
impl Provider for Ollama {
    fn name(&self) -> &'static str { "ollama" }

    async fn ping(&self) -> Result<(), ProviderError> {
        let url = format!("{}/api/tags", self.base_url);
        let resp = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|e| ProviderError::Http(format!("ollama not running: {e}")))?;
        if !resp.status().is_success() {
            return Err(ProviderError::Upstream(format!(
                "ollama returned {}",
                resp.status()
            )));
        }
        Ok(())
    }

    async fn stream_chat(&self, req: ChatRequest) -> Result<ChunkStream, ProviderError> {
        let body = json!({
            "model": req.model,
            "stream": true,
            "options": { "temperature": req.temperature },
            "messages": [
                { "role": "system", "content": req.system },
                { "role": "user", "content": req.user },
            ],
        });

        let resp = self
            .client
            .post(format!("{}/api/chat", self.base_url))
            .json(&body)
            .send()
            .await
            .map_err(|e| ProviderError::Http(e.to_string()))?;

        if !resp.status().is_success() {
            let s = resp.status();
            let t = resp.text().await.unwrap_or_default();
            return Err(ProviderError::Upstream(format!("{s}: {t}")));
        }

        let mut buf = String::new();
        let stream = resp.bytes_stream().flat_map(move |chunk| {
            let items: Vec<Result<String, ProviderError>> = match chunk {
                Ok(bytes) => {
                    buf.push_str(&String::from_utf8_lossy(&bytes));
                    let mut out = Vec::new();
                    while let Some(pos) = buf.find('\n') {
                        let line = buf[..pos].to_string();
                        buf.drain(..=pos);
                        let line = line.trim();
                        if line.is_empty() { continue; }
                        match serde_json::from_str::<OllamaChunk>(line) {
                            Ok(c) => {
                                if c.done { continue; }
                                if let Some(m) = c.message {
                                    out.push(Ok(m.content));
                                }
                            }
                            Err(e) => out.push(Err(ProviderError::Decode(e.to_string()))),
                        }
                    }
                    out
                }
                Err(e) => vec![Err(ProviderError::Http(e.to_string()))],
            };
            futures_util::stream::iter(items)
        });

        Ok(Box::pin(stream))
    }
}
