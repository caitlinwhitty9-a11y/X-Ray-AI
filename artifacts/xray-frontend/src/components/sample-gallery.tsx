import { useState } from "react";
import { useSamples } from "@/hooks/use-xray-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Healthy", "Pneumonia", "Tuberculosis", "COVID"];

interface Sample {
  filename: string;
  label: string;
  path: string;
}

interface SampleGalleryProps {
  onSelectSample: (sample: Sample) => void;
}

export function SampleGallery({ onSelectSample }: SampleGalleryProps) {
  const { data, isLoading } = useSamples();
  const [filter, setFilter] = useState("All");

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-center gap-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data?.samples) return null;

  const filtered = filter === "All"
    ? data.samples
    : data.samples.filter(s => s.label.toLowerCase() === filter.toLowerCase());

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col items-center gap-4">
        <h3 className="text-lg font-medium text-foreground">Try a Sample Scan</h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {CATEGORIES.map(c => (
            <Badge
              key={c}
              variant={filter === c ? "default" : "outline"}
              className={cn("cursor-pointer px-4 py-1.5 text-sm transition-colors", filter !== c && "hover:bg-muted text-muted-foreground")}
              onClick={() => setFilter(c)}
            >
              {c}
            </Badge>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.slice(0, 10).map((sample) => (
          <div
            key={sample.filename}
            onClick={() => onSelectSample(sample)}
            className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-border/50 bg-muted hover:border-primary/50 transition-colors shadow-sm hover:shadow-md"
          >
            <img 
              src={sample.path} 
              alt={sample.label} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
              loading="lazy" 
            />
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
              <span className="text-foreground font-semibold px-4 py-2 bg-background/90 rounded-lg shadow-sm">Analyze</span>
            </div>
            <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
              <span className="bg-background/95 backdrop-blur text-xs font-medium px-2 py-1 rounded-md shadow-sm capitalize block text-center truncate text-foreground">
                {sample.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
