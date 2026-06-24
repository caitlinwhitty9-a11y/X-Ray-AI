import { motion, AnimatePresence } from "framer-motion";
import { Clock, Trash2, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { HistoryEntry } from "@/hooks/use-scan-history";

const CLASS_COLORS: Record<string, string> = {
  healthy: "#10b981",
  pneumonia: "#f59e0b",
  tuberculosis: "#ef4444",
  covid: "#8b5cf6",
};

const CLASS_BG: Record<string, string> = {
  healthy: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/40",
  pneumonia: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300/40",
  tuberculosis: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-300/40",
  covid: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300/40",
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface ScanHistoryProps {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  activeId?: string;
}

export function ScanHistory({ entries, onSelect, onClear, activeId }: ScanHistoryProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors group"
          data-testid="button-toggle-history"
        >
          <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          Session History
          <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {entries.length}
          </span>
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-destructive gap-1.5 h-7 px-2"
          data-testid="button-clear-history"
        >
          <Trash2 className="w-3 h-3" />
          Clear all
        </Button>
      </div>

      {/* Grid */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pb-2">
              <AnimatePresence initial={false}>
                {entries.map((entry, index) => {
                  const predClass = entry.result.prediction.toLowerCase();
                  const color = CLASS_COLORS[predClass] ?? "#6b7280";
                  const badgeCls = CLASS_BG[predClass] ?? "bg-muted text-muted-foreground border-border/40";
                  const isActive = entry.id === activeId;

                  return (
                    <motion.button
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      onClick={() => onSelect(entry)}
                      data-testid={`history-item-${entry.id}`}
                      className={cn(
                        "group relative flex flex-col overflow-hidden rounded-xl border-2 bg-card text-left shadow-sm transition-all duration-200",
                        "hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isActive
                          ? "ring-2 ring-primary shadow-md -translate-y-0.5"
                          : "border-border/60"
                      )}
                      style={isActive ? { borderColor: color } : {}}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-square w-full bg-black overflow-hidden">
                        <img
                          src={entry.imageSrc}
                          alt={entry.result.prediction}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {/* Newest badge */}
                        {index === 0 && (
                          <div className="absolute top-1.5 left-1.5 rounded-full bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 leading-none">
                            NEW
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2 space-y-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide w-full justify-center",
                            badgeCls
                          )}
                        >
                          {predClass === "healthy" ? (
                            <CheckCircle className="w-2.5 h-2.5" />
                          ) : (
                            <AlertTriangle className="w-2.5 h-2.5" />
                          )}
                          {entry.result.prediction}
                        </span>
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                            {entry.result.confidence_percentage.toFixed(0)}%
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>
                        {/* Mini confidence bar */}
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${entry.result.confidence_percentage}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
            <p className="text-center text-[11px] text-muted-foreground mt-1 pb-1">
              Click any scan to review its results — history resets when you close the tab
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
