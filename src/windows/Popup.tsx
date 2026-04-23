import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  RefreshCw,
  X,
  ArrowRightLeft,
  Settings2,
  SendHorizonal,
  Sparkles,
  AlertCircle,
  Loader2,
  ChevronDown,
  MessageSquare,
  Image,
  Lightbulb,
  Wand2,
} from "lucide-react";
import clsx from "clsx";
import { IntentBadge } from "../components/IntentBadge";
import {
  ipc,
  onOptimize,
  onSelectionCaptured,
  type Intent,
  type OptimizeEvent,
} from "../lib/ipc";
import {
  promptTechniques,
  generatePromptWithTechnique,
  getTechniqueById,
  type PromptTechnique,
} from "../lib/promptTechniques";

// Function to suggest best technique based on input
function suggestTechnique(input: string): { technique: PromptTechnique; reason: string } {
  const lower = input.toLowerCase();

  // Check for specific patterns
  if (lower.includes("step") || lower.includes("how to") || lower.includes("process") || lower.includes("explain")) {
    return {
      technique: getTechniqueById("reasoning")!,
      reason: "Step-by-step reasoning works best for explanations"
    };
  }

  if (lower.includes("code") || lower.includes("function") || lower.includes("program")) {
    return {
      technique: getTechniqueById("care")!,
      reason: "CARE framework helps with code examples"
    };
  }

  if (lower.includes("email") || lower.includes("write") || lower.includes("draft")) {
    return {
      technique: getTechniqueById("create")!,
      reason: "CREATE helps craft well-structured writing"
    };
  }

  if (lower.includes("problem") || lower.includes("fix") || lower.includes("issue") || lower.includes("solve")) {
    return {
      technique: getTechniqueById("pain")!,
      reason: "PAIN framework is ideal for problem-solving"
    };
  }

  if (lower.includes("analyze") || lower.includes("compare") || lower.includes("evaluate")) {
    return {
      technique: getTechniqueById("roses")!,
      reason: "ROSES provides structured analysis"
    };
  }

  if (lower.includes("plan") || lower.includes("strategy") || lower.includes("approach")) {
    return {
      technique: getTechniqueById("coast")!,
      reason: "COAST helps with strategic planning"
    };
  }

  if (lower.includes("role") || lower.includes("act as") || lower.includes("expert")) {
    return {
      technique: getTechniqueById("race")!,
      reason: "RACE defines roles clearly"
    };
  }

  // Default to standard
  return {
    technique: getTechniqueById("standard")!,
    reason: "Standard works well for general prompts"
  };
}

type Status = "idle" | "capturing" | "streaming" | "done" | "error" | "cancelled";

export default function Popup() {
  const [source, setSource] = useState("");
  const [intent, setIntent] = useState<Intent | "detecting">("detecting");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [jobId, setJobId] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selectedTechnique, setSelectedTechnique] = useState<string>("standard");
  const [showTechniqueDropdown, setShowTechniqueDropdown] = useState(false);
  const [suggestedMethods, setSuggestedMethods] = useState<string[]>([]);
  const [comments, setComments] = useState<string>("");
  const [showComments, setShowComments] = useState(false);
  const [clipboardFallback, setClipboardFallback] = useState<string | null>(null);
  const [optimizeButtonAnimating, setOptimizeButtonAnimating] = useState(false);
  const [suggestedTechnique, setSuggestedTechnique] = useState<{ technique: PromptTechnique; reason: string } | null>(null);
  const lastOutputRef = useRef<string>("");
  const outRef = useRef<HTMLDivElement>(null);
  const techniqueDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlistens: Array<Promise<() => void>> = [];
    unlistens.push(
      onSelectionCaptured((text) => {
        setSource(text);
        // Analyze input and suggest technique
        const suggestion = suggestTechnique(text);
        setSuggestedTechnique(suggestion);
        runOptimize(text);
      })
    );
    unlistens.push(
      onOptimize((ev: OptimizeEvent) => {
        if (ev.kind === "intent" && ev.intent) setIntent(ev.intent as Intent);
        else if (ev.kind === "delta" && ev.prompt_delta) {
          setOutput((p) => p + ev.prompt_delta);
          setStatus("streaming");
        } else if (ev.kind === "done") {
          if (ev.full_prompt) {
            setOutput(ev.full_prompt);
            lastOutputRef.current = ev.full_prompt;
          }
          if (ev.intent) setIntent(ev.intent as Intent);
          setStatus("done");
        } else if (ev.kind === "error") {
          setErr(ev.error ?? "unknown error");
          setStatus("error");
        } else if (ev.kind === "cancelled") setStatus("cancelled");
      })
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      // Handle Ctrl+C for visual feedback
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (output) {
          e.preventDefault();
          copy();
          // Trigger Optimize button animation
          setOptimizeButtonAnimating(true);
          setTimeout(() => setOptimizeButtonAnimating(false), 600);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlistens.forEach((u) => u.then((fn) => fn()));
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
  }, [output]);

  async function runOptimize(text: string, opts?: { feedback?: string; previous?: string }) {
    setOutput("");
    setErr(null);
    setIntent("detecting");
    setStatus("capturing");
    try {
      const id = await ipc.optimize({
        text,
        job_id: 0,
        feedback: opts?.feedback ?? null,
        previous_output: opts?.previous ?? null,
      });
      setJobId(id);
    } catch (e: any) {
      setErr(String(e));
      setStatus("error");
    }
  }

  async function refine() {
    if (!source || !feedback.trim()) return;
    if (jobId) await ipc.cancel(jobId).catch(() => {});
    const prev = lastOutputRef.current;
    await runOptimize(source, { feedback, previous: prev });
    setFeedback("");
  }

  async function accept() {
    if (!output) return;
    try {
      const cfg = await ipc.getConfig();
      if (cfg.auto_replace) {
        await ipc.hideWindow("popup");
        await new Promise((r) => setTimeout(r, 120));
        await ipc.replaceSelection(output);
      } else {
        await ipc.writeClipboard(output);
        await ipc.hideWindow("popup");
      }
    } catch (e) {
      setErr(String(e));
    }
  }

  async function copy() {
    await ipc.writeClipboard(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function regenerate() {
    if (!source) return;
    if (jobId) await ipc.cancel(jobId).catch(() => {});
    await runOptimize(source);
  }

  async function close() {
    if (jobId && status === "streaming") await ipc.cancel(jobId).catch(() => {});
    await ipc.hideWindow("popup");
  }

  const isBusy = status === "streaming" || status === "capturing";

  const currentTechnique = promptTechniques.find((t) => t.id === selectedTechnique);

  const handleTechniqueSelect = (techniqueId: string) => {
    setSelectedTechnique(techniqueId);
    setShowTechniqueDropdown(false);
    setSuggestedTechnique(null); // Clear suggestion when user manually selects
    if (source) {
      const result = generatePromptWithTechnique(techniqueId, source);
      setSuggestedMethods(result.suggestedMethods);
      // Re-run optimization with the new technique
      if (jobId) ipc.cancel(jobId).catch(() => {});
      runOptimize(source);
    }
  };

  const applySuggestedTechnique = () => {
    if (suggestedTechnique) {
      handleTechniqueSelect(suggestedTechnique.technique.id);
    }
  };

  const applyMethod = (method: string) => {
    const methodText = `\n${method}: [Add details here]`;
    setOutput((prev) => prev + methodText);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        techniqueDropdownRef.current &&
        !techniqueDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTechniqueDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="h-screen w-screen p-2 animate-slide-up">
      <div
        data-tauri-drag-region
        className="rounded-2xl glass shadow-float ring-1 ring-black/10 dark:ring-white/10
        flex flex-col h-full overflow-hidden"
      >
        <div
          data-tauri-drag-region
          className="flex items-center gap-2 px-3 py-2 border-b border-black/5 dark:border-white/10
          bg-gradient-to-r from-white/40 to-white/0 dark:from-white/5 dark:to-transparent"
        >
          <IntentBadge intent={intent} />
          <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-200 truncate flex items-center gap-1">
            {isBusy && <Loader2 size={11} className="animate-spin" />}
            {statusLabel(status, source.length)}
          </span>
          <div className="flex-1" />

          {/* Technique Dropdown */}
          <div className="relative" ref={techniqueDropdownRef}>
            <button
              onClick={() => setShowTechniqueDropdown(!showTechniqueDropdown)}
              className="btn-ghost text-xs flex items-center gap-1"
              title="Select prompt technique"
            >
              {currentTechnique?.name || "Standard"}
              <ChevronDown size={12} />
            </button>
            {showTechniqueDropdown && (
              <div className="absolute right-0 top-full mt-1 w-56 max-h-64 overflow-y-auto
              bg-white dark:bg-zinc-800 rounded-lg shadow-lg ring-1 ring-black/10 dark:ring-white/10
              z-50 py-1">
                {promptTechniques.map((technique) => (
                  <button
                    key={technique.id}
                    onClick={() => handleTechniqueSelect(technique.id)}
                    className={clsx(
                      "w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors",
                      selectedTechnique === technique.id && "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400"
                    )}
                  >
                    <div className="font-medium">{technique.name}</div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-[10px] truncate">
                      {technique.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => ipc.showSettings()} className="btn-icon" title="Settings">
            <Settings2 size={14} />
          </button>
          <button onClick={close} className="btn-icon" title="Close (Esc)">
            <X size={14} />
          </button>
        </div>

        {/* Suggestion Bar */}
        {suggestedTechnique && suggestedTechnique.technique.id !== selectedTechnique && (
          <div className="px-3 py-2 border-b border-black/5 dark:border-white/10 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-900/20 dark:to-orange-900/10">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs text-zinc-700 dark:text-zinc-300 flex-1">
                <span className="font-medium">Suggestion:</span> {suggestedTechnique.reason}
              </span>
              <button
                onClick={applySuggestedTechnique}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex items-center gap-1"
              >
                <Wand2 size={10} />
                Use {suggestedTechnique.technique.name}
              </button>
            </div>
          </div>
        )}

        <div
          ref={outRef}
          className="flex-1 overflow-auto px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap
          text-zinc-800 dark:text-zinc-100 selection:bg-brand-500/25"
        >
          {err ? (
            <div className="flex gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/20 text-rose-700 dark:text-rose-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-0.5 text-[13px]">Something went wrong</div>
                <div className="whitespace-pre-wrap text-xs opacity-90">{err}</div>
              </div>
            </div>
          ) : output ? (
            <>
              {output}
              {status === "streaming" && (
                <span className="inline-block w-[3px] h-[14px] bg-brand-500 animate-pulse-soft ml-0.5 align-middle rounded-sm" />
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-zinc-400">
              <Sparkles size={14} className="animate-pulse-soft" />
              <span className="text-xs font-medium">Optimizing your prompt…</span>
            </div>
          )}
        </div>

        {/* Suggested Methods */}
        {status === "done" && !err && suggestedMethods.length > 0 && (
          <div className="px-3 py-2 border-t border-black/5 dark:border-white/10 bg-zinc-50/30 dark:bg-zinc-900/30">
            <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Suggested methods:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedMethods.map((method) => (
                <button
                  key={method}
                  onClick={() => applyMethod(method)}
                  className="px-2 py-0.5 rounded-full text-[10px] bg-brand-100 dark:bg-brand-900/30
                  text-brand-700 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-900/50
                  transition-colors"
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Clipboard fallback notice (if any) */}
        {clipboardFallback && (
          <div className="px-3 py-2 border-t border-black/5 dark:border-white/10 bg-yellow-50 dark:bg-yellow-900/20">
            <span className="text-xs text-yellow-800 dark:text-yellow-300">{clipboardFallback}</span>
            <button
              onClick={() => setClipboardFallback(null)}
              className="ml-2 text-xs font-medium text-blue-600 dark:text-blue-300 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Comments Section */}
        {showComments && (
          <div className="px-3 py-2 border-t border-black/5 dark:border-white/10 bg-white/30 dark:bg-white/[0.02]">
            <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Comments:
            </div>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add your notes or comments here..."
              className="w-full h-16 px-2 py-1.5 rounded-lg bg-white/80 dark:bg-zinc-800/70 text-xs
              ring-1 ring-black/10 dark:ring-white/10 outline-none resize-none
              focus:ring-2 focus:ring-brand-500/50 focus:bg-white dark:focus:bg-zinc-800
              placeholder:text-zinc-400 transition text-zinc-900 dark:text-zinc-100"
            />
          </div>
        )}

        {/* Refine Input - Always Visible */}
        <div className="flex items-center gap-2 px-3 py-2 border-t border-black/5 dark:border-white/10 bg-white/30 dark:bg-white/[0.02]">
          <div className="relative flex-1">
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && feedback.trim()) {
                  e.preventDefault();
                  refine();
                }
              }}
              placeholder={status === "done" && !err ? "Refine — e.g. shorter, more casual, add a CTA…" : "Add instructions to improve the prompt…"}
              disabled={!source || status === "streaming" || status === "capturing"}
              className="w-full pl-3 pr-9 py-1.5 rounded-lg bg-white/80 dark:bg-zinc-800/70 text-xs
              ring-1 ring-black/10 dark:ring-white/10 outline-none
              focus:ring-2 focus:ring-brand-500/50 focus:bg-white dark:focus:bg-zinc-800
              placeholder:text-zinc-400 transition text-zinc-900 dark:text-zinc-100
              disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={refine}
              disabled={!feedback.trim() || !source || status === "streaming" || status === "capturing"}
              title="Refine (Enter)"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md
              text-brand-600 dark:text-brand-400
              hover:bg-brand-500/10 disabled:opacity-30
              disabled:hover:bg-transparent transition-colors"
            >
              <SendHorizonal size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2 py-2 border-t border-black/5 dark:border-white/10
        bg-zinc-50/60 dark:bg-zinc-950/40">
          <button onClick={regenerate} className="btn-ghost" disabled={!source} title="Regenerate">
            <RefreshCw size={12} /> Regenerate
          </button>
          <button onClick={copy} className="btn-ghost" disabled={!output} title="Copy">
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className={clsx("btn-ghost", showComments && "text-brand-600 dark:text-brand-400")}
            title="Toggle comments"
          >
            <MessageSquare size={12} /> Comments
          </button>
          <button
            onClick={() => ipc.showImagePrompt()}
            className="btn-ghost"
            title="Open Image Prompt Maker"
          >
            <Image size={12} /> Image
          </button>
          <div className="flex-1" />
          <button
            onClick={accept}
            disabled={!output || status === "streaming"}
            className={clsx(
              "btn-primary",
              optimizeButtonAnimating && "animate-pulse ring-2 ring-brand-400"
            )}
            title="Replace selected text"
          >
            <ArrowRightLeft size={12} strokeWidth={2.5} /> Replace
          </button>
        </div>
      </div>
    </div>
  );
}

function statusLabel(s: Status, n: number): string {
  switch (s) {
    case "idle": return "";
    case "capturing": return `Captured ${n} chars`;
    case "streaming": return "Writing";
    case "done": return "Ready — press Replace or Esc";
    case "error": return "Error";
    case "cancelled": return "Cancelled";
  }
}
