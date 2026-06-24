import { useState } from "react";
import { usePredict } from "@/hooks/use-xray-api";
import { UploadZone } from "@/components/upload-zone";
import { SampleGallery } from "@/components/sample-gallery";
import { ResultsPanel } from "@/components/results-panel";
import { LoadingScanner } from "@/components/loading-scanner";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from "framer-motion";

export default function Home() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const predict = usePredict();

  const handleAnalyze = async (fileOrBlob: File | Blob, previewUrl: string) => {
    setImagePreview(previewUrl);
    predict.mutate(fileOrBlob);
  };

  const handleReset = () => {
    setImagePreview(null);
    predict.reset();
  };

  return (
    <div className="container mx-auto px-4 py-12 lg:py-16 max-w-6xl flex flex-col gap-12 relative min-h-[calc(100vh-4rem)]">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[100px] pointer-events-none -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl mx-auto space-y-6"
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
          X-Ray AI Lung <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Diagnosis Assistant</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Instant CNN-powered screening for chest X-ray analysis. Upload a clinical scan or select a benchmark sample to begin.
        </p>
      </motion.div>

      {predict.error && (
        <Alert variant="destructive" className="max-w-2xl mx-auto shadow-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Failed</AlertTitle>
          <AlertDescription>{predict.error.message}</AlertDescription>
        </Alert>
      )}

      <div className="w-full flex-1 flex flex-col justify-start">
        {!imagePreview ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-16"
          >
            <UploadZone onUpload={(file) => handleAnalyze(file, URL.createObjectURL(file))} />
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-background text-sm text-muted-foreground uppercase tracking-widest font-medium">Or</span>
              </div>
            </div>
            <SampleGallery onSelectSample={async (sample) => {
              try {
                const res = await fetch(sample.path);
                const blob = await res.blob();
                handleAnalyze(blob, sample.path);
              } catch (e) {
                console.error("Failed to load sample");
              }
            }} />
          </motion.div>
        ) : predict.isPending ? (
          <LoadingScanner imageSrc={imagePreview} />
        ) : predict.data ? (
          <ResultsPanel result={predict.data} imageSrc={imagePreview} onReset={handleReset} />
        ) : null}
      </div>
    </div>
  );
}
