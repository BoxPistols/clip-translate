/**
 * Tauri v2 API wrapper.
 *
 * Uses the official @tauri-apps npm packages with static imports.
 * Vite bundles them, and they internally use __TAURI_INTERNALS__
 * which Tauri injects into the webview at runtime.
 */

import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";
import {
  readText,
  writeText,
} from "@tauri-apps/plugin-clipboard-manager";

// ── Invoke ──────────────────────────────────────────────────────────────────

export async function invoke<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  return tauriInvoke<T>(cmd, args);
}

// ── Listen ──────────────────────────────────────────────────────────────────

export async function listen(
  event: string,
  handler: (payload: unknown) => void
): Promise<() => void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return tauriListen(event, (e: any) => handler(e.payload));
}

// ── Clipboard ───────────────────────────────────────────────────────────────

export async function clipboardReadText(): Promise<string> {
  return readText();
}

export async function clipboardWriteText(text: string): Promise<void> {
  return writeText(text);
}

// ── Debug ───────────────────────────────────────────────────────────────────

export function debugTauriState(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  console.log("[ClipTranslate] === Tauri Environment Debug ===");
  console.log("  __TAURI_INTERNALS__:", w.__TAURI_INTERNALS__ ? "available" : "missing");
  console.log("  __TAURI__:", w.__TAURI__ ? "available" : "missing");
  console.log("[ClipTranslate] ==============================");
}
