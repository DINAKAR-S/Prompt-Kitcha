import clsx from "clsx";
import { INTENT_META } from "../lib/intents";
import type { Intent } from "../lib/ipc";

export function IntentBadge({ intent }: { intent: Intent | "detecting" }) {
  const meta = INTENT_META[intent];
  const Icon = meta.icon;
  const spinning = intent === "detecting";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white",
        "bg-gradient-to-r shadow-sm ring-1",
        meta.color,
        meta.ring
      )}
    >
      <span className="w-4 h-4 rounded-full bg-white/25 grid place-items-center">
        <Icon size={10} strokeWidth={2.5} className={spinning ? "animate-spin" : ""} />
      </span>
      <span className="tracking-tight">{meta.label}</span>
    </span>
  );
}
