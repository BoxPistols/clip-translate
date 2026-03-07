import { useState, useCallback, useEffect } from "react";
import { invoke } from "../lib/tauri";
import type { TranslationEntry } from "../types";

export function useHistory() {
  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const history = await invoke<TranslationEntry[]>("get_history");
      setEntries(history);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, []);

  const deleteEntry = useCallback(
    async (id: string) => {
      try {
        await invoke("delete_history_entry", { id });
        await fetchHistory();
      } catch (err) {
        console.error("Failed to delete history entry:", err);
      }
    },
    [fetchHistory]
  );

  const clearAll = useCallback(async () => {
    try {
      await invoke("clear_history");
      setEntries([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  return {
    entries,
    isOpen,
    toggle,
    fetchHistory,
    deleteEntry,
    clearAll,
  };
}
