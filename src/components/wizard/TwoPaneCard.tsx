"use client";

import { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, Zap } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TwoPaneCardProps {
  title: string;
  stepNumber: number;
  isActive: boolean;
  attentionNeeded?: boolean;
  isCompleted?: boolean;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  onValidate: () => void;
  onApplyRefinement?: () => void;
  isLoading?: boolean;
  canValidate?: boolean;
}

export default function TwoPaneCard({
  title,
  stepNumber,
  isActive,
  attentionNeeded,
  isCompleted,
  leftPanel,
  rightPanel,
  onValidate,
  onApplyRefinement,
  isLoading,
  canValidate = true
}: TwoPaneCardProps) {
  return (
    <div 
      className={cn(
        "group relative grid grid-cols-1 lg:grid-cols-2 gap-px bg-zinc-800 border rounded-2xl overflow-hidden transition-all duration-500",
        isActive ? "border-zinc-700 shadow-2xl shadow-blue-500/10" : "border-zinc-900 opacity-60 grayscale",
        attentionNeeded && "border-red-500/50 shadow-red-500/10 shadow-xl scale-[1.01]"
      )}
    >
      {/* Header Info (Mobile & Desktop) */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10 pointer-events-none">
        <span className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors",
          isActive ? "bg-blue-500 text-white" : "bg-zinc-800 text-zinc-500"
        )}>
          {stepNumber}
        </span>
        <h3 className={cn(
          "text-sm font-semibold tracking-wide uppercase transition-colors",
          isActive ? "text-zinc-200" : "text-zinc-500"
        )}>
          {title}
        </h3>
      </div>

      {/* Validation Status Icon */}
      <div className="absolute top-4 right-4 z-10">
        {isCompleted && !attentionNeeded && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        {attentionNeeded && <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />}
      </div>

      {/* Left Panel: User Input */}
      <div className="bg-zinc-950 p-8 pt-16 space-y-4">
        {leftPanel}
        {isActive && (
          <button
            onClick={onValidate}
            disabled={isLoading || !canValidate}
            className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-100 text-zinc-950 font-bold rounded-xl hover:bg-white active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validando con IA...
              </>
            ) : "Confirmar y Continuar"}
          </button>
        )}
      </div>

      {/* Right Panel: AI Recommendations */}
      <div className={cn(
        "p-6 md:p-10 transition-colors duration-500 overflow-y-auto max-h-[500px] scrollbar-hide",
        isActive ? "bg-zinc-900/40" : "bg-zinc-900/10"
      )}>
        <div className="flex items-center gap-2 mb-6 sticky top-0 bg-transparent backdrop-blur-sm pb-2 z-10">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
          <span className="text-[11px] uppercase font-black tracking-[0.2em] text-blue-400/80">IA Co-Pilot Mode</span>
        </div>
        <div className="text-zinc-300 leading-relaxed font-medium">
          {rightPanel}
        </div>

        {isActive && onApplyRefinement && (
           <button 
             onClick={onApplyRefinement}
             className="mt-8 flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 hover:text-black transition-all group"
           >
             <Zap className="w-3.5 h-3.5 fill-current" />
             Aplicar Refinamiento Sugerido
           </button>
        )}
      </div>
    </div>
  );
}
