import { useEffect, useRef, useState } from "react";
import { Sparkles, GripVertical, X } from "lucide-react";
import { emit, listen } from "@tauri-apps/api/event";
import { ipc } from "../lib/ipc";

export default function Pill() {
  const [hasFreshCopy, setHasFreshCopy] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cachedText = useRef<string>("");

  useEffect(() => {
    const un = listen<string>("pw:pill-shown", (e) => {
      cachedText.current = e.payload ?? "";
      setHasFreshCopy(true);
      window.setTimeout(() => setHasFreshCopy(false), 5000);
    });
    return () => {
      un.then((fn) => fn());
    };
  }, []);

  async function onClick() {
    await ipc.showPopupAtCursor();
    let payload = cachedText.current;
    if (!payload) {
      try {
        payload = await ipc.readClipboard();
      } catch {
        payload = "";
      }
    }
    if (payload && payload.trim()) {
      await emit("pw:selection-captured", payload);
    }
  }

  async function onHide(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await ipc.hideWindow("pill");
  }

  return (
    <div className="h-screen w-screen p-2 flex items-center justify-center">
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/30 to-accent-500/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Main pill container */}
        <div
          className="relative flex items-center rounded-full
            bg-gradient-to-r from-brand-500 to-accent-500
            text-white text-xs font-semibold
            shadow-[0_8px_32px_-8px_rgba(99,102,241,0.5)]
            ring-1 ring-white/20
            animate-fade-in
            overflow-hidden
            backdrop-blur-sm
            transition-all duration-200
            hover:shadow-[0_12px_40px_-8px_rgba(99,102,241,0.6)]
            hover:scale-[1.02]"
        >
          {/* Drag handle */}
          <div
            data-tauri-drag-region
            className="flex items-center justify-center px-2 py-3 cursor-grab active:cursor-grabbing
              opacity-60 hover:opacity-100 transition-opacity
              border-r border-white/10"
            title="Drag to move"
          >
            <GripVertical size={14} className="text-white/80" />
          </div>
          
          {/* Main button */}
          <button
            onClick={onClick}
            onContextMenu={onHide}
            className="flex items-center justify-center gap-2 px-4 py-3
              transition-all duration-200
              hover:bg-white/10 active:bg-white/20"
            title="Click: optimize · Right-click: hide"
          >
            <div className="relative">
              <Sparkles 
                size={16} 
                className={`transition-all duration-300 ${hasFreshCopy ? 'text-yellow-300 animate-pulse' : 'text-white'}`} 
              />
              {hasFreshCopy && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
              )}
            </div>
            <span className="tracking-wide">
              {hasFreshCopy ? "Optimize" : "Optimize"}
            </span>
          </button>
          
          {/* Close button - appears on hover */}
          <button
            onClick={onHide}
            className={`flex items-center justify-center px-2 py-3
              border-l border-white/10
              transition-all duration-200
              hover:bg-white/10 active:bg-white/20
              ${isHovered ? 'opacity-100 w-auto' : 'opacity-0 w-0 px-0 overflow-hidden'}`}
            title="Hide"
          >
            <X size={14} className="text-white/80" />
          </button>
        </div>
        
        {/* Tooltip */}
        <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap
          text-[10px] text-zinc-400 bg-zinc-900/90 px-2 py-1 rounded
          transition-all duration-200 pointer-events-none
          ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
          Click to optimize · Drag to move
        </div>
      </div>
    </div>
  );
}
