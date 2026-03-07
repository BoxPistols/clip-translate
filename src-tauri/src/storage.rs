use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

const MAX_HISTORY: usize = 100;
const MAX_HISTORY_DAYS: i64 = 90;

// ─── Translation History Entry ───────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationEntry {
    pub id: String,
    pub source_text: String,
    pub target_text: String,
    pub source_lang: String,
    pub target_lang: String,
    pub timestamp: DateTime<Utc>,
}

impl TranslationEntry {
    pub fn new(
        source_text: String,
        target_text: String,
        source_lang: String,
        target_lang: String,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            source_text,
            target_text,
            source_lang,
            target_lang,
            timestamp: Utc::now(),
        }
    }
}

// ─── App Settings ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub deepl_api_key: String,
    pub auto_copy: bool,
    pub shortcut: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            deepl_api_key: String::new(),
            auto_copy: true,
            shortcut: "Shift+Alt+T".to_string(),
        }
    }
}

// ─── Store Data ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct StoreData {
    history: Vec<TranslationEntry>,
    settings: AppSettings,
}

impl Default for StoreData {
    fn default() -> Self {
        Self {
            history: Vec::new(),
            settings: AppSettings::default(),
        }
    }
}

// ─── Storage Manager ─────────────────────────────────────────────────────────

pub struct Storage {
    file_path: PathBuf,
}

impl Storage {
    pub fn new() -> Self {
        let data_dir = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("com.cliptranslate.app");

        fs::create_dir_all(&data_dir).ok();

        Self {
            file_path: data_dir.join("store.json"),
        }
    }

    fn read_store(&self) -> StoreData {
        match fs::read_to_string(&self.file_path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => StoreData::default(),
        }
    }

    fn write_store(&self, data: &StoreData) -> Result<(), String> {
        let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
        fs::write(&self.file_path, json).map_err(|e| e.to_string())
    }

    // ── History Operations ───────────────────────────────────────────────

    /// Remove entries older than MAX_HISTORY_DAYS and cap at MAX_HISTORY
    fn prune_history(history: &mut Vec<TranslationEntry>) {
        let cutoff = Utc::now() - Duration::days(MAX_HISTORY_DAYS);
        history.retain(|e| e.timestamp > cutoff);
        history.truncate(MAX_HISTORY);
    }

    pub fn add_history(
        &self,
        source_text: String,
        target_text: String,
        source_lang: String,
        target_lang: String,
    ) -> Result<TranslationEntry, String> {
        let mut store = self.read_store();
        let entry = TranslationEntry::new(source_text, target_text, source_lang, target_lang);

        store.history.insert(0, entry.clone());

        // Auto-prune: max 100 entries, max 90 days
        Self::prune_history(&mut store.history);

        self.write_store(&store)?;
        Ok(entry)
    }

    pub fn get_history(&self) -> Vec<TranslationEntry> {
        let mut store = self.read_store();
        let before = store.history.len();
        Self::prune_history(&mut store.history);

        // Persist if any entries were removed
        if store.history.len() < before {
            self.write_store(&store).ok();
        }

        store.history
    }

    pub fn clear_history(&self) -> Result<(), String> {
        let mut store = self.read_store();
        store.history.clear();
        self.write_store(&store)
    }

    pub fn delete_history_entry(&self, id: &str) -> Result<(), String> {
        let mut store = self.read_store();
        store.history.retain(|e| e.id != id);
        self.write_store(&store)
    }

    // ── Settings Operations ──────────────────────────────────────────────

    pub fn get_settings(&self) -> AppSettings {
        let mut settings = self.read_store().settings;

        // Migrate old default shortcut to new default
        if settings.shortcut == "CmdOrCtrl+Shift+T" {
            settings.shortcut = "Shift+Alt+T".to_string();
            // Persist the migrated value
            if let Ok(mut store) = serde_json::from_str::<StoreData>(
                &std::fs::read_to_string(&self.file_path).unwrap_or_default(),
            ) {
                store.settings.shortcut = settings.shortcut.clone();
                if let Ok(json) = serde_json::to_string_pretty(&store) {
                    std::fs::write(&self.file_path, json).ok();
                }
            }
        }

        settings
    }

    pub fn save_settings(&self, settings: AppSettings) -> Result<(), String> {
        let mut store = self.read_store();
        store.settings = settings;
        self.write_store(&store)
    }
}
