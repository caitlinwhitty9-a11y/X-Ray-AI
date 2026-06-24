import { useState, useCallback } from "react";
import { UploadCloud, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onUpload: (file: File) => void;
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onUpload(file);
    }
  }, [onUpload]);

  return (
    <div
      className={cn(
        "w-full max-w-2xl mx-auto p-12 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-4 bg-card hover:bg-muted/50 group",
        isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/25"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png, image/jpeg, image/jpg";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) onUpload(file);
        };
        input.click();
      }}
    >
      <div className="p-4 bg-primary/10 text-primary rounded-full group-hover:scale-110 transition-transform">
        <UploadCloud className="w-8 h-8" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Drag & Drop X-Ray Scan</h3>
        <p className="text-sm text-muted-foreground mt-1">or click to browse from your computer</p>
      </div>
      <div className="text-xs text-muted-foreground/75 mt-2 flex items-center gap-1">
        <ImageIcon className="w-3 h-3" /> Supports PNG, JPG, JPEG
      </div>
    </div>
  );
}
