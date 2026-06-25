import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCcw,
  Download,
  Loader2,
  GitMerge,
  Layers,
  Eye,
  EyeOff,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateDiagnosticReport } from "@/lib/generate-report";
import { useGradcam } from "@/hooks/use-xray-api";
import type { PredictionResponse } from "@/hooks/use-xray-api";

const CLASS_STYLES: Record<string, { container: string; bar: string }> = {
  healthy:      { container: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20", bar: "bg-emerald-500" },
  pneumonia:    { container: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",         bar: "bg-amber-500"   },
  tuberculosis: { container: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",                 bar: "bg-red-500"     },
  covid:        { container: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",     bar: "bg-purple-500"  },
};

interface ResultsPanelProps {
  result: PredictionResponse;
  imageSrc: string;
  onReset: () => void;
}

export function ResultsPanel({ result, imageSrc, onReset }: ResultsPanelProps) {
  const [downloading, setDownloading] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const gradcam = useGradcam();

  const predClass = result.prediction.toLowerCase();
  const styles = CLASS_STYLES[predClass] || CLASS_STYLES.healthy;

  const heatmapDataUrl = gradcam.data
    ? `data:image/png;base64,${gradcam.data.heatmap_b64}`
    : null;

  function handleToggleHeatmap() {
    if (heatmapVisible) {
      setHeatmapVisible(false);
      return;
    }
    // If we already have the heatmap loaded, just show it
    if (gradcam.data) {
      setHeatmapVisible(true);
      return;
    }
    // Request heatmap, then show when ready
    gradcam.mutate(imageSrc, {
      onSuccess: () => setHeatmapVisible(true),
    });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await generateDiagnosticReport({
        prediction: result.prediction,
        confidence_percentage: result.confidence_percentage,
        all_scores: result.all_scores,
        class_info: result.class_info,
        filename: result.filename,
        imageSrc,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full"
    >
      {/* ── Image Side ── */}
      <div className="space-y-4">

        {/* X-ray with heatmap overlay */}
        <div
          className="rounded-2xl overflow-hidden border-4 bg-black relative aspect-square shadow-lg transition-colors duration-500"
          style={{ borderColor: result.class_info.color }}
        >
          <img
            src={imageSrc}
            className="w-full h-full object-cover"
            alt="X-Ray Scan"
          />

          {/* Heatmap overlay */}
          <AnimatePresence>
            {heatmapVisible && heatmapDataUrl && (
              <motion.img
                key="heatmap"
                src={heatmapDataUrl}
                alt="Grad-CAM heatmap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.75 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ mixBlendMode: "screen" }}
              />
            )}
          </AnimatePresence>

          {/* Loading spinner over image */}
          {gradcam.isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
              <div className="flex flex-col items-center gap-2 text-white">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs font-medium">Computing heatmap…</span>
              </div>
            </div>
          )}

          {/* Heatmap badge */}
          {heatmapVisible && heatmapDataUrl && (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-white">
              <Flame className="w-3 h-3 text-orange-400" />
              Grad-CAM Active
            </div>
          )}
        </div>

        {/* Heatmap legend */}
        <AnimatePresence>
          {heatmapVisible && heatmapDataUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] text-muted-foreground font-medium shrink-0">Low</span>
                <div
                  className="h-2.5 flex-1 rounded-full"
                  style={{
                    background: "linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)",
                  }}
                />
                <span className="text-[10px] text-muted-foreground font-medium shrink-0">High</span>
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-1">
                Model attention — red regions drove this prediction
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Heatmap error */}
        {gradcam.isError && (
          <p className="text-xs text-destructive text-center">
            Heatmap unavailable: {gradcam.error?.message}
          </p>
        )}

        {/* Heatmap toggle button */}
        <Button
          data-testid="button-toggle-heatmap"
          onClick={handleToggleHeatmap}
          disabled={gradcam.isPending}
          variant="outline"
          className={cn(
            "w-full h-12 text-base font-medium shadow-sm transition-colors",
            heatmapVisible && "border-orange-400 text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 dark:text-orange-400"
          )}
        >
          {gradcam.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Heatmap…</>
          ) : heatmapVisible ? (
            <><EyeOff className="w-4 h-4 mr-2" />Hide Heatmap</>
          ) : (
            <><Eye className="w-4 h-4 mr-2" />Show Grad-CAM Heatmap</>
          )}
        </Button>

        <Button
          data-testid="button-analyze-another"
          onClick={onReset}
          variant="outline"
          className="w-full h-12 text-base font-medium shadow-sm"
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Analyze Another Scan
        </Button>

        <Button
          data-testid="button-download-report"
          onClick={handleDownload}
          disabled={downloading}
          className="w-full h-12 text-base font-medium shadow-sm"
          style={{ backgroundColor: result.class_info.color, color: "#fff" }}
        >
          {downloading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Report…</>
          ) : (
            <><Download className="w-4 h-4 mr-2" />Download PDF Report</>
          )}
        </Button>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-center pt-1">
          <Layers className="w-3.5 h-3.5" />
          <span>Result averaged over {result.tta_passes ?? 7} augmented passes (TTA)</span>
        </div>
      </div>

      {/* ── Results Side ── */}
      <div className="space-y-5 flex flex-col">

        {/* Diagnosis badge */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn("p-8 rounded-2xl border-2 flex flex-col items-center text-center space-y-3 shadow-sm", styles.container)}
        >
          <h2 className="text-sm font-bold uppercase tracking-widest opacity-80">AI Diagnosis</h2>
          <div className="text-5xl font-extrabold capitalize flex items-center gap-3">
            {predClass === "healthy"
              ? <CheckCircle className="w-10 h-10" />
              : <AlertTriangle className="w-10 h-10" />}
            {result.prediction}
          </div>
          <div className="text-2xl font-semibold opacity-90 tracking-tight">
            {result.confidence_percentage.toFixed(1)}% Confidence
          </div>
        </motion.div>

        {/* Differential warning */}
        {result.differential && result.differential_note && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            data-testid="alert-differential"
            className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex gap-3"
          >
            <GitMerge className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Differential Diagnosis</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{result.differential_note}</p>
            </div>
          </motion.div>
        )}

        {/* Analysis details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-card border rounded-2xl p-6 shadow-sm space-y-5 flex-1"
        >
          <div className="space-y-2 border-b border-border/50 pb-4">
            <h3 className="font-semibold text-lg">Analysis Details</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.class_info.description}</p>
          </div>

          <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-foreground">
              <Activity className="w-4 h-4 text-primary" />
              Recommendation
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.class_info.recommendation}</p>
          </div>

          {/* Probability bars */}
          <div className="pt-2 space-y-4">
            <h4 className="text-sm font-medium text-foreground">Class Probabilities</h4>
            <div className="space-y-3">
              {result.all_scores.map((score, index) => {
                const itemStyle = CLASS_STYLES[score.label.toLowerCase()] || CLASS_STYLES.healthy;
                const isTop = index === 0;
                return (
                  <div key={score.label} className="space-y-1.5" data-testid={`bar-probability-${score.label}`}>
                    <div className="flex justify-between text-xs font-medium">
                      <span className={cn("capitalize", isTop ? "text-foreground font-semibold" : "text-muted-foreground")}>
                        {score.label}
                        {isTop && <span className="ml-1.5 text-[10px] font-normal opacity-60">(primary)</span>}
                      </span>
                      <span className={cn(isTop ? "text-foreground font-semibold" : "text-muted-foreground")}>
                        {score.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-muted overflow-hidden rounded-full border border-border/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score.percentage}%` }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.1, ease: "easeOut" }}
                        className={cn("h-full rounded-full", itemStyle.bar)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
