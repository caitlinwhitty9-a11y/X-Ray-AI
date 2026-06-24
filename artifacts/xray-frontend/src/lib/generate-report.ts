import { jsPDF } from "jspdf";

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

interface ReportData {
  prediction: string;
  confidence_percentage: number;
  all_scores: PredictionScore[];
  class_info: ClassInfo;
  filename: string;
  imageSrc: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [100, 100, 100];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

function wrapText(doc: jsPDF, text: string, x: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, 0);
  return lines.length * lineHeight;
}

function drawProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  percentage: number,
  color: [number, number, number]
) {
  doc.setFillColor(235, 240, 245);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, "F");

  if (percentage > 0) {
    const fillWidth = (percentage / 100) * width;
    doc.setFillColor(...color);
    doc.roundedRect(x, y, Math.max(fillWidth, height), height, height / 2, height / 2, "F");
  }
}

export async function generateDiagnosticReport(data: ReportData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 0;

  const NAVY = [15, 40, 80] as [number, number, number];
  const TEAL = [14, 165, 165] as [number, number, number];
  const GRAY = [100, 110, 125] as [number, number, number];
  const LIGHT_GRAY = [245, 247, 250] as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];
  const BORDER = [220, 228, 238] as [number, number, number];

  // Header gradient-like band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 38, "F");
  doc.setFillColor(...TEAL);
  doc.rect(0, 34, pageW, 4, "F");

  // App name
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("X-Ray AI Lung Diagnosis Assistant", margin, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 210, 230);
  doc.text("AI-Assisted Diagnostic Screening Report", margin, 24);

  // Date/time top right
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  doc.setTextColor(180, 210, 230);
  doc.setFontSize(8);
  doc.text(`${dateStr}  ${timeStr}`, pageW - margin, 16, { align: "right" });
  doc.text(`File: ${data.filename || "uploaded_scan"}`, pageW - margin, 22, { align: "right" });

  y = 48;

  // --- Diagnosis Summary Card ---
  const diagCardH = 36;
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(margin, y, contentW, diagCardH, 3, 3, "F");
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, diagCardH, 3, 3, "S");

  const predColor = hexToRgb(data.class_info.color);
  doc.setFillColor(...predColor);
  doc.roundedRect(margin, y, 5, diagCardH, 2, 2, "F");

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("AI DIAGNOSIS", margin + 10, y + 8);

  doc.setFontSize(22);
  doc.setTextColor(...predColor);
  doc.text(data.prediction.toUpperCase(), margin + 10, y + 22);

  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Severity", pageW - margin - 44, y + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(data.class_info.severity, pageW - margin - 44, y + 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("Confidence", pageW - margin - 44, y + 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...predColor);
  doc.text(`${data.confidence_percentage.toFixed(1)}%`, pageW - margin - 44, y + 34);

  y += diagCardH + 8;

  // --- Two columns: image + probabilities ---
  const colGap = 6;
  const imgColW = 80;
  const rightColX = margin + imgColW + colGap;
  const rightColW = contentW - imgColW - colGap;

  // X-ray image
  try {
    let imgData = data.imageSrc;
    if (imgData.startsWith("/ml-api")) {
      const resp = await fetch(imgData);
      const blob = await resp.blob();
      imgData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
    doc.setFillColor(20, 20, 20);
    doc.roundedRect(margin, y, imgColW, imgColW, 3, 3, "F");
    doc.addImage(imgData, "PNG", margin + 1, y + 1, imgColW - 2, imgColW - 2);
    doc.setDrawColor(...predColor);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, y, imgColW, imgColW, 3, 3, "S");

    doc.setTextColor(...GRAY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text("Chest X-Ray Scan", margin + imgColW / 2, y + imgColW + 5, { align: "center" });
  } catch {
    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(margin, y, imgColW, imgColW, 3, 3, "F");
    doc.setTextColor(...GRAY);
    doc.setFontSize(8);
    doc.text("Image unavailable", margin + imgColW / 2, y + imgColW / 2, { align: "center" });
  }

  // Class probabilities (right column)
  const probY = y;
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Class Probabilities", rightColX, probY + 5);

  let barY = probY + 10;
  const barH = 4;
  const barSpacing = 13;

  for (const score of data.all_scores) {
    const scoreColor = hexToRgb(getClassColor(score.label));
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(capitalize(score.label), rightColX, barY);
    doc.setFont("helvetica", "bold");
    doc.text(`${score.percentage.toFixed(1)}%`, rightColX + rightColW, barY, { align: "right" });

    drawProgressBar(doc, rightColX, barY + 2, rightColW, barH, score.percentage, scoreColor);
    barY += barSpacing;
  }

  y += imgColW + 10;

  // --- Clinical Description ---
  const descCardX = margin;
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(descCardX, y, contentW, 5, 2, 2, "F");
  doc.setFillColor(...predColor);
  doc.roundedRect(descCardX, y, contentW, 5, 2, 2, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CLINICAL FINDINGS", descCardX + 5, y + 3.5);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(50, 60, 75);

  const descLines = doc.splitTextToSize(data.class_info.description, contentW - 4);
  const descH = descLines.length * 4.5 + 6;

  doc.setFillColor(...LIGHT_GRAY);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, contentW, descH, 2, 2, "FD");
  doc.setDrawColor(...predColor);
  doc.setLineWidth(0.8);
  doc.line(margin + 0.4, y + 2, margin + 0.4, y + descH - 2);
  doc.setTextColor(50, 60, 75);
  doc.text(descLines, margin + 5, y + 5);

  y += descH + 5;

  // --- Recommendation ---
  doc.setFillColor(14, 80, 40);
  doc.roundedRect(margin, y, contentW, 5, 2, 2, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CLINICAL RECOMMENDATION", margin + 5, y + 3.5);

  y += 8;
  const recLines = doc.splitTextToSize(data.class_info.recommendation, contentW - 12);
  const recH = recLines.length * 4.5 + 8;

  doc.setFillColor(235, 248, 240);
  doc.setDrawColor(180, 220, 195);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, contentW, recH, 2, 2, "FD");
  doc.setDrawColor(14, 160, 80);
  doc.setLineWidth(0.8);
  doc.line(margin + 0.4, y + 2, margin + 0.4, y + recH - 2);
  doc.setTextColor(20, 80, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(recLines, margin + 5, y + 5);

  y += recH + 6;

  // --- Model Info ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("MODEL", margin, y + 4);
  doc.text("ARCHITECTURE", margin + 40, y + 4);
  doc.text("INPUT SHAPE", margin + 100, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text("CNN Lung Classifier", margin, y + 9);
  doc.text("Deep Convolutional Network", margin + 40, y + 9);
  doc.text("128 × 128 RGB", margin + 100, y + 9);

  y += 16;

  // --- Disclaimer ---
  const disclaimerH = 18;
  doc.setFillColor(255, 250, 230);
  doc.setDrawColor(220, 180, 80);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, contentW, disclaimerH, 2, 2, "FD");

  doc.setTextColor(120, 90, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("DISCLAIMER", margin + 5, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const disclaimer =
    "This report is generated by an AI model for screening purposes only and does not constitute a medical diagnosis. " +
    "Results must be reviewed and confirmed by a qualified healthcare professional. " +
    "Clinical decisions should never be made based solely on this output.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentW - 10);
  doc.text(disclaimerLines, margin + 5, y + 10);

  // --- Footer ---
  doc.setFillColor(...NAVY);
  doc.rect(0, pageH - 12, pageW, 12, "F");
  doc.setTextColor(140, 170, 200);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("X-Ray AI Lung Diagnosis Assistant  •  Powered by TensorFlow / Keras CNN", pageW / 2, pageH - 5, { align: "center" });

  // Save
  const filename = `xray-report-${data.prediction}-${Date.now()}.pdf`;
  doc.save(filename);
}

function getClassColor(label: string): string {
  const colors: Record<string, string> = {
    healthy: "#10b981",
    pneumonia: "#f59e0b",
    tuberculosis: "#ef4444",
    covid: "#8b5cf6",
  };
  return colors[label.toLowerCase()] || "#6b7280";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
