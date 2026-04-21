import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type Intent =
  | "code_agent" | "email" | "message" | "note" | "search"
  | "code" | "content" | "question" | "analysis"
  | "summarize" | "rewrite" | "brainstorm" | "data" | "other";

export interface AppConfig {
  hotkey: string;
  show_pill_on_copy: boolean;
  theme: string;
  provider: string;
  model: string;
  base_url?: string | null;
  auto_replace: boolean;
  stream: boolean;
  max_input_chars: number;
  history_enabled: boolean;
  telemetry: boolean;
  onboarded: boolean;
}

export interface ProviderInfo {
  id: string;
  label: string;
  needs_key: boolean;
  default_model: string;
  key_help_url: string;
}

export interface OptimizeRequest {
  text: string;
  job_id: number;
  provider?: string | null;
  model?: string | null;
  base_url?: string | null;
  feedback?: string | null;
  previous_output?: string | null;
}

export interface OptimizeEvent {
  job_id: number;
  kind: "intent" | "delta" | "done" | "error" | "cancelled";
  intent?: string | null;
  prompt_delta?: string | null;
  full_prompt?: string | null;
  error?: string | null;
}

export const ipc = {
  getConfig: () => invoke<AppConfig>("get_config"),
  updateConfig: (patch: Partial<AppConfig>) =>
    invoke<AppConfig>("update_config", { patch }),

  listProviders: () => invoke<ProviderInfo[]>("list_providers"),
  testConnection: (provider: string, model: string, base_url?: string) =>
    invoke<string>("test_connection", { provider, model, baseUrl: base_url ?? null }),

  setApiKey: (provider: string, key: string) =>
    invoke<void>("set_api_key", { provider, key }),
  getApiKey: (provider: string) =>
    invoke<string | null>("get_api_key", { provider }),
  deleteApiKey: (provider: string) =>
    invoke<void>("delete_api_key", { provider }),
  hasApiKey: (provider: string) =>
    invoke<boolean>("has_api_key", { provider }),

  captureSelection: () => invoke<string>("capture_selection"),
  replaceSelection: (text: string) => invoke<void>("replace_selection", { text }),
  readClipboard: () => invoke<string>("read_clipboard"),
  writeClipboard: (text: string) => invoke<void>("write_clipboard", { text }),

  optimize: (req: OptimizeRequest) => invoke<number>("optimize_text", { req }),
  cancel: (job_id: number) => invoke<void>("cancel_optimize", { jobId: job_id }),

  registerHotkey: (combo: string) =>
    invoke<void>("register_hotkey", { combo }),
  unregisterHotkey: () => invoke<void>("unregister_hotkey"),

  showSettings: () => invoke<void>("show_settings"),
  showPopupAtCursor: () => invoke<void>("show_popup_at_cursor"),
  showImagePrompt: () => invoke<void>("show_image_prompt"),
  hideWindow: (label: string) => invoke<void>("hide_window", { label }),
  showWindow: (label: string) => invoke<void>("show_window", { label }),
  quit: () => invoke<void>("quit_app"),
};

export function onOptimize(
  handler: (ev: OptimizeEvent) => void
): Promise<UnlistenFn> {
  return listen<OptimizeEvent>("pw:optimize", (e) => handler(e.payload));
}

export function onSelectionCaptured(
  handler: (text: string) => void
): Promise<UnlistenFn> {
  return listen<string>("pw:selection-captured", (e) => handler(e.payload));
}
