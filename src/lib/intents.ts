import type { Intent } from "./ipc";
import {
  Code2, Mail, MessageCircle, StickyNote, Search, Braces,
  PenLine, HelpCircle, BarChart3, AlignLeft, RefreshCw,
  Lightbulb, Table2, Sparkles, Loader2, type LucideIcon,
} from "lucide-react";

export const INTENT_META: Record<
  Intent | "detecting",
  { label: string; icon: LucideIcon; color: string; ring: string }
> = {
  code_agent: { label: "IDE / Agent", icon: Code2,        color: "from-indigo-500 to-violet-500",  ring: "ring-indigo-400/30" },
  email:      { label: "Email",       icon: Mail,         color: "from-sky-500 to-blue-500",       ring: "ring-sky-400/30" },
  message:    { label: "Message",     icon: MessageCircle,color: "from-cyan-500 to-teal-500",      ring: "ring-cyan-400/30" },
  note:       { label: "Note",        icon: StickyNote,   color: "from-amber-400 to-yellow-500",   ring: "ring-amber-400/30" },
  search:     { label: "Search",      icon: Search,       color: "from-slate-500 to-zinc-600",     ring: "ring-slate-400/30" },
  code:       { label: "Code",        icon: Braces,       color: "from-emerald-500 to-green-500",  ring: "ring-emerald-400/30" },
  content:    { label: "Content",     icon: PenLine,      color: "from-violet-500 to-purple-500",  ring: "ring-violet-400/30" },
  question:   { label: "Question",    icon: HelpCircle,   color: "from-amber-500 to-orange-500",   ring: "ring-amber-400/30" },
  analysis:   { label: "Analysis",    icon: BarChart3,    color: "from-rose-500 to-pink-500",      ring: "ring-rose-400/30" },
  summarize:  { label: "Summarize",   icon: AlignLeft,    color: "from-orange-500 to-red-500",     ring: "ring-orange-400/30" },
  rewrite:    { label: "Rewrite",     icon: RefreshCw,    color: "from-teal-500 to-cyan-500",      ring: "ring-teal-400/30" },
  brainstorm: { label: "Brainstorm",  icon: Lightbulb,    color: "from-fuchsia-500 to-pink-500",   ring: "ring-fuchsia-400/30" },
  data:       { label: "Data",        icon: Table2,       color: "from-lime-500 to-green-600",     ring: "ring-lime-400/30" },
  other:      { label: "Prompt",      icon: Sparkles,     color: "from-zinc-500 to-zinc-600",      ring: "ring-zinc-400/30" },
  detecting:  { label: "Detecting",   icon: Loader2,      color: "from-zinc-400 to-zinc-500",      ring: "ring-zinc-400/30" },
};
