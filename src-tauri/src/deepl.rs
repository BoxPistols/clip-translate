use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
struct DeepLRequest {
    text: Vec<String>,
    target_lang: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_lang: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DeepLResponse {
    translations: Vec<DeepLTranslation>,
}

#[derive(Debug, Deserialize)]
struct DeepLTranslation {
    text: String,
    #[allow(dead_code)]
    detected_source_language: String,
}

#[derive(Debug, thiserror::Error)]
pub enum DeepLError {
    #[error("HTTP request failed: {0}")]
    RequestError(#[from] reqwest::Error),
    #[error("API returned error status: {0}")]
    ApiError(String),
    #[error("No translation returned")]
    EmptyResponse,
    #[error("API key not configured")]
    NoApiKey,
}

impl Serialize for DeepLError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// DeepL API usage response
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DeepLUsage {
    pub character_count: u64,
    pub character_limit: u64,
}

pub struct DeepLClient {
    client: reqwest::Client,
}

impl DeepLClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    fn base_url(api_key: &str) -> &'static str {
        if api_key.ends_with(":fx") {
            "https://api-free.deepl.com"
        } else {
            "https://api.deepl.com"
        }
    }

    /// Fetch API usage (character count / limit)
    pub async fn usage(&self, api_key: &str) -> Result<DeepLUsage, DeepLError> {
        if api_key.is_empty() {
            return Err(DeepLError::NoApiKey);
        }

        let url = format!("{}/v2/usage", Self::base_url(api_key));

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("DeepL-Auth-Key {}", api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(DeepLError::ApiError(format!("{}: {}", status, body)));
        }

        let usage: DeepLUsage = response.json().await?;
        Ok(usage)
    }

    /// Translate text using the DeepL API.
    ///
    /// `api_key` - DeepL API key
    /// `text` - Text to translate
    /// `source_lang` - Source language code (e.g., "EN", "JA"), or None for auto-detect
    /// `target_lang` - Target language code (e.g., "EN", "JA")
    pub async fn translate(
        &self,
        api_key: &str,
        text: &str,
        source_lang: Option<&str>,
        target_lang: &str,
    ) -> Result<String, DeepLError> {
        if api_key.is_empty() {
            return Err(DeepLError::NoApiKey);
        }

        let url = format!("{}/v2/translate", Self::base_url(api_key));

        let request_body = DeepLRequest {
            text: vec![text.to_string()],
            target_lang: target_lang.to_uppercase(),
            source_lang: source_lang.map(|s| s.to_uppercase()),
        };

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("DeepL-Auth-Key {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(DeepLError::ApiError(format!("{}: {}", status, body)));
        }

        let deepl_response: DeepLResponse = response.json().await?;

        deepl_response
            .translations
            .into_iter()
            .next()
            .map(|t| t.text)
            .ok_or(DeepLError::EmptyResponse)
    }
}
