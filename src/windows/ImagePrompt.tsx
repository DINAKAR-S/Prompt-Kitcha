import { useState, useRef, useEffect } from "react";
import {
  Copy,
  Check,
  X,
  Sparkles,
  Image,
  ChevronDown,
  Lightbulb,
  Wand2,
  RefreshCw,
} from "lucide-react";
import clsx from "clsx";
import { ipc } from "../lib/ipc";
import {
  imagePromptTechniques,
  generateImagePrompt,
} from "../lib/imagePromptTechniques";

export default function ImagePrompt() {
  const [selectedTechnique, setSelectedTechnique] = useState<string>("creative");
  const [userInput, setUserInput] = useState<string>("");
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [tips, setTips] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [showTechniqueDropdown, setShowTechniqueDropdown] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const techniqueDropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentTechnique = imagePromptTechniques.find(
    (t) => t.id === selectedTechnique
  );

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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleGenerate = () => {
    if (!userInput.trim()) return;

    setIsGenerating(true);

    // Simulate a brief generation animation
    setTimeout(() => {
      const result = generateImagePrompt(selectedTechnique, userInput);
      setGeneratedPrompt(result.prompt);
      setTips(result.tips);
      setIsGenerating(false);
    }, 300);
  };

  const handleTechniqueSelect = (techniqueId: string) => {
    setSelectedTechnique(techniqueId);
    setShowTechniqueDropdown(false);

    // Regenerate if there's already input
    if (userInput.trim()) {
      const result = generateImagePrompt(techniqueId, userInput);
      setGeneratedPrompt(result.prompt);
      setTips(result.tips);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedPrompt) return;
    await ipc.writeClipboard(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const clearAll = () => {
    setUserInput("");
    setGeneratedPrompt("");
    setTips([]);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  const closeWindow = () => {
    ipc.hideWindow("image-prompt");
  };

  return (
    <div className="h-screen w-screen p-3 animate-slide-up">
      <div className="rounded-2xl glass shadow-float ring-1 ring-black/10 dark:ring-white/10 flex flex-col h-full overflow-hidden bg-gradient-to-br from-white/90 to-white/70 dark:from-zinc-900/95 dark:to-zinc-900/80">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-black/5 dark:border-white/10 bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Image size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Image Prompt Maker
            </h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Craft perfect prompts for AI image generation
            </p>
          </div>
          <button
            onClick={closeWindow}
            className="btn-icon hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Technique Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Wand2 size={12} />
              Prompt Technique
            </label>
            <div className="relative" ref={techniqueDropdownRef}>
              <button
                onClick={() => setShowTechniqueDropdown(!showTechniqueDropdown)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 ring-1 ring-black/10 dark:ring-white/10 hover:ring-brand-500/50 transition-all text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <Sparkles size={14} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {currentTechnique?.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {currentTechnique?.description}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={clsx(
                    "text-zinc-400 transition-transform",
                    showTechniqueDropdown && "rotate-180"
                  )}
                />
              </button>

              {showTechniqueDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 max-h-72 overflow-y-auto bg-white dark:bg-zinc-800 rounded-xl shadow-xl ring-1 ring-black/10 dark:ring-white/10 z-50 py-2">
                  {imagePromptTechniques.map((technique) => (
                    <button
                      key={technique.id}
                      onClick={() => handleTechniqueSelect(technique.id)}
                      className={clsx(
                        "w-full text-left px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors",
                        selectedTechnique === technique.id &&
                          "bg-brand-50 dark:bg-brand-900/20"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={clsx(
                            "w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold",
                            selectedTechnique === technique.id
                              ? "bg-brand-500 text-white"
                              : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                          )}
                        >
                          {technique.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div
                            className={clsx(
                              "text-sm font-medium",
                              selectedTechnique === technique.id
                                ? "text-brand-600 dark:text-brand-400"
                                : "text-zinc-700 dark:text-zinc-200"
                            )}
                          >
                            {technique.name}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                            {technique.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Lightbulb size={12} />
              Your Idea
            </label>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to generate... (e.g., 'a serene mountain landscape at sunset')"
                className="w-full h-20 px-3 py-2.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 text-sm text-zinc-800 dark:text-zinc-100 ring-1 ring-black/10 dark:ring-white/10 outline-none resize-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder:text-zinc-400"
              />
              {userInput && (
                <button
                  onClick={clearAll}
                  className="absolute top-2 right-2 p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  title="Clear"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400">
                Press Ctrl+Enter to generate
              </span>
              <button
                onClick={handleGenerate}
                disabled={!userInput.trim() || isGenerating}
                className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate Prompt
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Output */}
          {generatedPrompt && (
            <div className="space-y-2 animate-slide-up">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Generated Prompt
                </label>
                <button
                  onClick={copyToClipboard}
                  className="btn-ghost text-xs py-1"
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <div className="w-full min-h-[100px] max-h-48 overflow-auto px-3 py-2.5 rounded-xl bg-gradient-to-br from-brand-50/80 to-brand-100/50 dark:from-brand-900/20 dark:to-brand-900/10 text-sm text-zinc-800 dark:text-zinc-100 ring-1 ring-brand-200 dark:ring-brand-800 whitespace-pre-wrap">
                  {generatedPrompt}
                </div>
              </div>
            </div>
          )}

          {/* Tips Section */}
          {tips.length > 0 && showTips && (
            <div className="space-y-2 animate-slide-up">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Lightbulb size={12} className="text-amber-500" />
                  Pro Tips
                </label>
                <button
                  onClick={() => setShowTips(!showTips)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600"
                >
                  {showTips ? "Hide" : "Show"}
                </button>
              </div>
              <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl p-3 ring-1 ring-amber-200/50 dark:ring-amber-800/30">
                <ul className="space-y-1.5">
                  {tips.map((tip, index) => (
                    <li
                      key={index}
                      className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2"
                    >
                      <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800/50 flex items-center justify-center text-[9px] font-bold text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-black/5 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-950/30">
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>Based on Google's nano-banana prompting guide</span>
            <span className="flex items-center gap-1">
              <Sparkles size={10} className="text-brand-500" />
              {imagePromptTechniques.length} techniques available
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
