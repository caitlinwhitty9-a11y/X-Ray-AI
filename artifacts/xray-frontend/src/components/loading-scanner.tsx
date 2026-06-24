import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export function LoadingScanner({ imageSrc }: { imageSrc: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto w-full flex flex-col items-center space-y-8 py-12"
    >
      <div className="relative rounded-2xl overflow-hidden border-4 border-muted shadow-xl w-64 h-64 bg-card">
        <img 
          src={imageSrc} 
          className="w-full h-full object-cover opacity-40 grayscale" 
          alt="Scanning..." 
        />
        
        {/* Animated scanning line */}
        <motion.div
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
          className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_20px_rgba(var(--primary),0.8)] z-10"
        />
        {/* Animated scanning overlay */}
        <motion.div
          animate={{ top: ["-100%", "0%", "-100%"] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
          className="absolute left-0 right-0 h-full bg-gradient-to-b from-transparent to-primary/20 z-0 mix-blend-overlay"
        />
      </div>
      
      <div className="text-center space-y-3">
        <h3 className="text-xl font-semibold flex items-center justify-center gap-2 text-foreground">
          <Activity className="w-5 h-5 animate-pulse text-primary" />
          Analyzing X-Ray...
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Our CNN model is processing the image.<br />
          <span className="opacity-75">This may take up to 20 seconds on cold start.</span>
        </p>
      </div>
    </motion.div>
  );
}
