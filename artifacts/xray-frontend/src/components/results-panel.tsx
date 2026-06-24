import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, CheckCircle, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const CLASS_STYLES: Record<string, { container: string; bar: string }> = {
  healthy: {
    container: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    bar: "bg-emerald-500"
  },
  pneumonia: {
    container: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    bar: "bg-amber-500"
  },
  tuberculosis: {
    container: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
    bar: "bg-red-500"
  },
  covid: {
    container: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
    bar: "bg-purple-500"
  },
};

interface ResultsPanelProps {
  result: any;
  imageSrc: string;
  onReset: () => void;
}

export function ResultsPanel({ result, imageSrc, onReset }: ResultsPanelProps) {
  const predClass = result.prediction.toLowerCase();
  const styles = CLASS_STYLES[predClass] || CLASS_STYLES.healthy;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full"
    >
      {/* Image Side */}
      <div className="space-y-4">
        <div 
          className="rounded-2xl overflow-hidden border-4 bg-muted relative aspect-square shadow-lg transition-colors duration-500" 
          style={{ borderColor: result.class_info.color }}
        >
          <img src={imageSrc} className="w-full h-full object-cover" alt="X-Ray Scan" />
        </div>
        <Button onClick={onReset} variant="outline" className="w-full h-12 text-base font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
          <RefreshCcw className="w-4 h-4 mr-2" />
          Analyze Another Scan
        </Button>
      </div>

      {/* Results Side */}
      <div className="space-y-6 flex flex-col">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn("p-8 rounded-2xl border-2 flex flex-col items-center text-center space-y-3 shadow-sm", styles.container)}
        >
          <h2 className="text-sm font-bold uppercase tracking-widest opacity-80">AI Diagnosis</h2>
          <div className="text-5xl font-extrabold capitalize flex items-center gap-3">
            {predClass === 'healthy' ? <CheckCircle className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
            {result.prediction}
          </div>
          <div className="text-2xl font-semibold opacity-90 tracking-tight">
            {result.confidence_percentage.toFixed(1)}% Confidence
          </div>
        </motion.div>

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

          <div className="pt-2 space-y-4">
            <h4 className="text-sm font-medium text-foreground">Class Probabilities</h4>
            <div className="space-y-3">
              {result.all_scores.map((score: any, index: number) => {
                const itemStyle = CLASS_STYLES[score.label.toLowerCase()] || CLASS_STYLES.healthy;
                return (
                  <div key={score.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="capitalize text-muted-foreground">{score.label}</span>
                      <span className="text-foreground">{score.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-muted overflow-hidden rounded-full border border-border/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score.percentage}%` }}
                        transition={{ duration: 1, delay: 0.5 + (index * 0.1), ease: "easeOut" }}
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
