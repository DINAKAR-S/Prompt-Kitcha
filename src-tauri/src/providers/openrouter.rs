use async_trait::async_trait;

use super::{openai::OpenAi, ChatRequest, ChunkStream, Provider, ProviderError};

pub struct OpenRouter {
    inner: OpenAi,
}

impl OpenRouter {
    pub fn new(api_key: Option<String>, base_url: Option<&str>) -> Self {
        let base = base_url.unwrap_or("https://openrouter.ai/api/v1");
        Self { inner: OpenAi::new(api_key, Some(base)) }
    }
}

#[async_trait]
impl Provider for OpenRouter {
    fn name(&self) -> &'static str { "openrouter" }
    async fn ping(&self) -> Result<(), ProviderError> { self.inner.ping().await }
    async fn stream_chat(&self, req: ChatRequest) -> Result<ChunkStream, ProviderError> {
        self.inner.stream_chat(req).await
    }
}
