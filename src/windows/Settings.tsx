import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ExternalLink, KeyRound, Trash2, Zap, Sparkles, Shield, Command, Settings as SettingsIcon, ChevronRight } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ipc, type AppConfig, type ProviderInfo } from "../lib/ipc";

export default function Settings() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [hotkeyDraft, setHotkeyDraft] = useState("");
  const [hotkeyError, setHotkeyError] = useState<string | null>(null);
  const [hotkeySuccess, setHotkeySuccess] = useState<string | null>(null);
  const [capturingHotkey, setCapturingHotkey] = useState(false);
  const [savingHotkey, setSavingHotkey] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "provider" | "advanced">("general");
  const hotkeyCaptureRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { (async () => {
    const [c, pl] = await Promise.all([ipc.getConfig(), ipc.listProviders()]);
    setCfg(c);
    setProviders(pl);
    setHotkeyDraft(c.hotkey);
    setHasKey(await ipc.hasApiKey(c.provider));
  })(); }, []);
  useEffect(() => {
    if (capturingHotkey) {
      hotkeyCaptureRef.current?.focus();
    }
  }, [capturingHotkey]);

  if (!cfg) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex items-center gap-3 text-zinc-400">
        <div className="w-5 h-5 border-2 border-zinc-600 border-t-brand-500 rounded-full animate-spin" />
        <span className="text-sm">Loading settings...</span>
      </div>
    </div>
  );

  const active = providers.find((p) => p.id === cfg.provider);

  async function patch(p: Partial<AppConfig>) {
    const next = await ipc.updateConfig(p);
    setCfg(next);
    if (p.provider) {
      setHasKey(await ipc.hasApiKey(p.provider));
      setApiKey("");
      setTestResult(null);
    }
  }

  async function saveKey() {
    if (!apiKey.trim() || !cfg) return;
    await ipc.setApiKey(cfg.provider, apiKey.trim());
    setApiKey("");
    setHasKey(true);
    setTestResult(null);
  }

  async function removeKey() {
    if (!cfg) return;
    await ipc.deleteApiKey(cfg.provider);
    setHasKey(false);
  }

  async function testConn() {
    if (!cfg) return;
    setTesting(true);
    setTestResult(null);
    try {
      const out = await ipc.testConnection(cfg.provider, cfg.model, cfg.base_url ?? undefined);
      setTestResult("ok: " + out.slice(0, 40));
    } catch (e: any) {
      setTestResult("error: " + String(e));
    } finally { setTesting(false); }
  }

  async function applyHotkey(nextCombo?: string) {
    const combo = (nextCombo ?? hotkeyDraft).trim();
    if (!combo) return;
    setSavingHotkey(true);
    setHotkeyError(null);
    setHotkeySuccess(null);
    try {
      const normalized = await ipc.validateHotkey(combo);
      await ipc.registerHotkey(normalized);
      await patch({ hotkey: normalized, onboarded: true });
      setHotkeyDraft(normalized);
      setHotkeySuccess("Saved");
    } catch (e) {
      setHotkeyError(String(e));
    } finally {
      setSavingHotkey(false);
    }
  }

  async function onHotkeyCaptureKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setHotkeyError(null);
    setHotkeySuccess(null);

    if (e.key === "Escape" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      setCapturingHotkey(false);
      return;
    }

    const combo = keyboardEventToShortcut(e);
    if (!combo) {
      setHotkeyError("Use at least one modifier and one supported key.");
      return;
    }

    setHotkeyDraft(combo);
    setCapturingHotkey(false);
    await applyHotkey(combo);
  }

  async function finishOnboarding() {
    await patch({ onboarded: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">PromptKitcha</h1>
                <p className="text-xs text-zinc-400">AI-powered prompt optimization</p>
              </div>
            </div>
            {!cfg.onboarded && (
              <button 
                onClick={finishOnboarding} 
                className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-all shadow-lg shadow-brand-500/20"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="col-span-3">
            <nav className="space-y-1">
              <SidebarButton 
                active={activeTab === "general"} 
                onClick={() => setActiveTab("general")}
                icon={<SettingsIcon className="w-4 h-4" />}
                label="General"
              />
              <SidebarButton 
                active={activeTab === "provider"} 
                onClick={() => setActiveTab("provider")}
                icon={<Shield className="w-4 h-4" />}
                label="Provider & API"
              />
              <SidebarButton 
                active={activeTab === "advanced"} 
                onClick={() => setActiveTab("advanced")}
                icon={<Command className="w-4 h-4" />}
                label="Advanced"
              />
            </nav>
          </div>

          {/* Content */}
          <div className="col-span-9 space-y-6">
            {activeTab === "general" && (
              <>
                <Card title="Behavior" description="Configure how PromptKitcha works">
                  <div className="space-y-4">
                    <Toggle 
                      label="Auto-replace selection after optimize"
                      description="Automatically replace your selected text with the optimized version"
                      value={cfg.auto_replace} 
                      onChange={(v) => patch({ auto_replace: v })} 
                    />
                    <Toggle 
                      label="Stream output as it generates"
                      description="Watch the AI generate your prompt in real-time"
                      value={cfg.stream} 
                      onChange={(v) => patch({ stream: v })} 
                    />
                    <Toggle 
                      label="Show floating pill on Ctrl+C"
                      description="Display the quick access pill when you copy text"
                      value={cfg.show_pill_on_copy} 
                      onChange={(v) => patch({ show_pill_on_copy: v })} 
                    />
                  </div>
                </Card>
              </>
            )}

            {activeTab === "provider" && (
              <>
                <Card title="AI Provider" description="Choose your AI provider and configure API access">
                  <div className="grid grid-cols-2 gap-3">
                    {providers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => patch({ provider: p.id, model: p.default_model })}
                        className={clsx(
                          "relative p-4 rounded-xl border-2 transition-all text-left group",
                          cfg.provider === p.id
                            ? "border-brand-500 bg-brand-500/10"
                            : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-white mb-1">{p.label}</div>
                            <div className="text-xs text-zinc-400">
                              {p.needs_key ? "Requires API key" : "Local — no key needed"}
                            </div>
                          </div>
                          {cfg.provider === p.id && (
                            <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>

                {active && (
                  <Card title="Model Configuration" description="Select the AI model to use">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-zinc-300">Model</label>
                      <input
                        type="text"
                        value={cfg.model}
                        onChange={(e) => patch({ model: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                        placeholder={active.default_model}
                      />
                      {cfg.provider === "ollama" && (
                        <p className="text-xs text-zinc-500">Examples: llama3.1, qwen2.5, mistral</p>
                      )}
                    </div>
                  </Card>
                )}

                {active?.needs_key && (
                  <Card title="API Key" description="Securely store your API key">
                    {hasKey ? (
                      <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <KeyRound className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <div className="font-medium text-emerald-400">API Key Stored</div>
                            <div className="text-xs text-emerald-400/70">Your key is encrypted and secure</div>
                          </div>
                        </div>
                        <button 
                          onClick={removeKey} 
                          className="px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key"
                            className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                          />
                          <button 
                            onClick={saveKey} 
                            className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-all shadow-lg shadow-brand-500/20"
                          >
                            Save Key
                          </button>
                        </div>
                        <button
                          onClick={() => openUrl(active.key_help_url)}
                          className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                        >
                          Get an API key <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </Card>
                )}

                <Card title="Connection Test" description="Verify your API connection is working">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={testConn}
                      disabled={testing}
                      className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4" /> 
                      {testing ? "Testing..." : "Test Connection"}
                    </button>
                    {testResult && (
                      <span
                        className={clsx(
                          "text-sm font-medium",
                          testResult.startsWith("ok") ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        {testResult.startsWith("ok") ? "✓ Connected" : "✗ Failed"}
                      </span>
                    )}
                  </div>
                </Card>
              </>
            )}

            {activeTab === "advanced" && (
              <Card title="Keyboard Shortcut" description="Customize your hotkey for quick access">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-zinc-300">Global Hotkey</label>
                  <button
                    ref={hotkeyCaptureRef}
                    type="button"
                    onClick={() => {
                      setCapturingHotkey((v) => !v);
                      setHotkeyError(null);
                      setHotkeySuccess(null);
                    }}
                    onKeyDown={onHotkeyCaptureKeyDown}
                    className={clsx(
                      "w-full px-4 py-3 rounded-xl border text-left transition-all font-mono text-sm",
                      capturingHotkey
                        ? "border-brand-500 bg-brand-500/10 text-brand-300 ring-2 ring-brand-500/20"
                        : "border-zinc-800 bg-zinc-900 text-white hover:border-zinc-700"
                    )}
                  >
                    {capturingHotkey ? "Press your shortcut..." : hotkeyDraft}
                  </button>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={hotkeyDraft}
                      onChange={(e) => setHotkeyDraft(e.target.value)}
                      placeholder="Or type manually (e.g. CommandOrControl+Shift+Space)"
                      className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-mono text-sm"
                    />
                    <button 
                      onClick={() => applyHotkey()}
                      disabled={savingHotkey}
                      className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                    >
                      {savingHotkey ? "Saving..." : "Apply"}
                    </button>
                    <button
                      onClick={() => applyHotkey(DEFAULT_HOTKEY)}
                      disabled={savingHotkey}
                      className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-all disabled:opacity-50"
                    >
                      Reset
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500">Use modifier combos like CommandOrControl+Shift+Space or Alt+F.</p>
                  {hotkeyError && <p className="text-xs text-rose-400">{hotkeyError}</p>}
                  {hotkeySuccess && <p className="text-xs text-emerald-400">{hotkeySuccess}</p>}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_HOTKEY = "CommandOrControl+Shift+Space";
const MODIFIER_ORDER = ["CommandOrControl", "Alt", "Shift", "Super"] as const;

function keyboardEventToShortcut(e: React.KeyboardEvent<HTMLButtonElement>): string | null {
  const modifierSet = new Set<string>();
  if (e.ctrlKey || e.metaKey) modifierSet.add("CommandOrControl");
  if (e.altKey) modifierSet.add("Alt");
  if (e.shiftKey) modifierSet.add("Shift");

  const key = normalizePrimaryKey(e.key);
  if (!key || modifierSet.size === 0) return null;

  const mods = MODIFIER_ORDER.filter((m) => modifierSet.has(m));
  return [...mods, key].join("+");
}

function normalizePrimaryKey(key: string): string | null {
  const lowered = key.toLowerCase();
  if (["control", "ctrl", "shift", "alt", "meta", "super", "os", "command"].includes(lowered)) {
    return null;
  }
  if (lowered === " ") return "Space";
  if (lowered === "escape" || lowered === "esc") return "Escape";
  if (lowered === "enter" || lowered === "return") return "Enter";
  if (lowered === "tab") return "Tab";
  if (lowered === "backspace") return "Backspace";
  if (lowered === "delete") return "Delete";
  if (lowered === "insert") return "Insert";
  if (lowered === "home") return "Home";
  if (lowered === "end") return "End";
  if (lowered === "pageup") return "PageUp";
  if (lowered === "pagedown") return "PageDown";
  if (lowered === "arrowup") return "Up";
  if (lowered === "arrowdown") return "Down";
  if (lowered === "arrowleft") return "Left";
  if (lowered === "arrowright") return "Right";
  if (/^f([1-9]|1[0-9]|2[0-4])$/i.test(key)) return key.toUpperCase();
  if (/^[a-z0-9]$/i.test(key)) return key.toUpperCase();
  return null;
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description && <p className="text-sm text-zinc-400 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SidebarButton({ active, onClick, icon, label }: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
        active 
          ? "bg-brand-500/10 text-brand-400 border border-brand-500/20" 
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
      )}
    >
      {icon}
      <span>{label}</span>
      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  );
}

function Toggle({ label, description, value, onChange }: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-2">
      <div className="flex-1">
        <div className="font-medium text-zinc-200">{label}</div>
        {description && <div className="text-sm text-zinc-500 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={clsx(
          "relative w-12 h-6 rounded-full transition-all duration-300 overflow-hidden",
          value ? "bg-brand-500" : "bg-zinc-700"
        )}
      >
        <span
          className={clsx(
            "absolute top-1 left-0 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
            value ? "translate-x-7" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}
