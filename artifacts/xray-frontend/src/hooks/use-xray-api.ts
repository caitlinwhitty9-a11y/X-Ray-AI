import { useQuery, useMutation } from "@tanstack/react-query";

interface ClassInfo {
  color: string;
  severity: string;
  description: string;
  recommendation: string;
}

interface PredictionScore {
  label: string;
  probability: number;
  percentage: number;
}

export interface PredictionResponse {
  prediction: string;
  confidence: number;
  confidence_percentage: number;
  all_scores: PredictionScore[];
  class_info: ClassInfo;
  filename: string;
  differential: boolean;
  differential_note: string | null;
  tta_passes: number;
}

interface Sample {
  filename: string;
  label: string;
  path: string;
}

interface SamplesResponse {
  samples: Sample[];
}

interface StatsResponse {
  model_name: string;
  architecture: string;
  classes: string[];
  input_shape: string;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
  class_distribution: Record<string, number>;
}

export function useSamples() {
  return useQuery<SamplesResponse>({
    queryKey: ["samples"],
    queryFn: async () => {
      const res = await fetch("/ml-api/samples");
      if (!res.ok) throw new Error("Failed to fetch samples");
      return res.json();
    },
  });
}

export function useStats() {
  return useQuery<StatsResponse>({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/ml-api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });
}

export function usePredict() {
  return useMutation<PredictionResponse, Error, File | Blob>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/ml-api/predict", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        let msg = "Failed to predict";
        try {
          const errData = await res.json();
          if (errData.detail) msg = errData.detail;
        } catch (_) {}
        throw new Error(msg);
      }
      return res.json();
    },
  });
}
