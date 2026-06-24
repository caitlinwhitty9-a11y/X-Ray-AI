import { useStats } from "@/hooks/use-xray-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Network, ShieldCheck, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const CLASS_DESCRIPTIONS = [
  {
    name: "Healthy",
    color: "bg-emerald-500 hover:bg-emerald-600",
    text: "text-emerald-50",
    desc: "Clear lung fields without any abnormal opacities, masses, or pleural effusions. Normal cardiothoracic ratio and diaphragm structure."
  },
  {
    name: "Pneumonia",
    color: "bg-amber-500 hover:bg-amber-600",
    text: "text-amber-50",
    desc: "Inflammatory condition of the lung primarily affecting the microscopic air sacs (alveoli). Appears as cloudy, hazy areas or consolidations on X-rays."
  },
  {
    name: "Tuberculosis",
    color: "bg-red-500 hover:bg-red-600",
    text: "text-red-50",
    desc: "Infectious disease caused by Mycobacterium tuberculosis. Characterized by cavitary lesions, nodular infiltrates, or pleural effusions, typically in the upper lobes."
  },
  {
    name: "COVID-19",
    color: "bg-purple-500 hover:bg-purple-600",
    text: "text-purple-50",
    desc: "Viral infection often presenting with bilateral, peripheral, ground-glass opacities, mostly in the lower lobes of the lungs."
  }
];

export default function About() {
  const { data, isLoading } = useStats();

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl space-y-16 relative">
      <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 text-center"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">About the AI Model</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Our diagnostic assistant uses a Deep Convolutional Neural Network (CNN) trained on thousands of clinical chest X-rays to detect common lung conditions with high precision.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="space-y-2">
                <div className="p-3 bg-primary/10 w-fit rounded-lg mb-2">
                  <Network className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">How it Works</CardTitle>
                <CardDescription className="text-base">The prediction pipeline architecture</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ol className="relative border-l-2 border-primary/20 ml-4 space-y-10">
                  <li className="pl-8 relative">
                    <span className="absolute flex items-center justify-center w-8 h-8 bg-background border-2 border-primary rounded-full -left-[17px] top-0 text-primary font-bold text-sm shadow-sm">1</span>
                    <h3 className="font-semibold text-lg text-foreground">Image Preprocessing</h3>
                    <p className="text-muted-foreground mt-2 leading-relaxed">X-rays are resized to 150x150 pixels, normalized to adjust contrast, and converted to standardized RGB arrays for the neural network input layer.</p>
                  </li>
                  <li className="pl-8 relative">
                    <span className="absolute flex items-center justify-center w-8 h-8 bg-background border-2 border-primary rounded-full -left-[17px] top-0 text-primary font-bold text-sm shadow-sm">2</span>
                    <h3 className="font-semibold text-lg text-foreground">Feature Extraction</h3>
                    <p className="text-muted-foreground mt-2 leading-relaxed">Multiple convolutional layers paired with max-pooling identify hierarchical visual patterns, advancing from basic edges to complex opacities, infiltrates, and lung boundaries.</p>
                  </li>
                  <li className="pl-8 relative">
                    <span className="absolute flex items-center justify-center w-8 h-8 bg-background border-2 border-primary rounded-full -left-[17px] top-0 text-primary font-bold text-sm shadow-sm">3</span>
                    <h3 className="font-semibold text-lg text-foreground">Classification</h3>
                    <p className="text-muted-foreground mt-2 leading-relaxed">Dense, fully-connected layers process the extracted features and pass them through a softmax activation function to calculate final probability scores for each diagnostic class.</p>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="space-y-2">
                <div className="p-3 bg-primary/10 w-fit rounded-lg mb-2">
                  <Stethoscope className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Diagnostic Classes</CardTitle>
                <CardDescription className="text-base">Conditions identified by the model</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {CLASS_DESCRIPTIONS.map(c => (
                  <div key={c.name} className="space-y-2">
                    <Badge className={`${c.color} ${c.text} hover:${c.color}`}>{c.name}</Badge>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="space-y-2">
                <div className="p-3 bg-primary/10 w-fit rounded-lg mb-2">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Model Performance</CardTitle>
                <CardDescription className="text-base">Validation metrics across all classes</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl"/>)}
                  </div>
                ) : data ? (
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(data.performance).map(([key, value]) => (
                      <div key={key} className="bg-muted/50 border border-border/50 rounded-xl p-6 text-center hover:bg-muted transition-colors">
                        <div className="text-3xl font-extrabold text-primary mb-1">{value}%</div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{key.replace('_', ' ')}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="space-y-2">
                <div className="p-3 bg-primary/10 w-fit rounded-lg mb-2">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Training Dataset</CardTitle>
                <CardDescription className="text-base">Distribution of the clinical dataset</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8 w-full"/>)}
                  </div>
                ) : data ? (
                  <div className="space-y-4">
                    {Object.entries(data.class_distribution).map(([cls, count]) => (
                      <div key={cls} className="flex justify-between items-center text-base p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <span className="capitalize font-medium text-foreground">{cls}</span>
                        <span className="font-mono bg-muted border border-border/50 px-3 py-1 rounded-md text-muted-foreground text-sm font-semibold">{count.toLocaleString()} images</span>
                      </div>
                    ))}
                    <div className="pt-4 mt-2 border-t border-border flex justify-between items-center font-bold text-foreground px-3">
                      <span>Total Dataset Volume</span>
                      <span className="text-primary">{Object.values(data.class_distribution).reduce((a,b)=>a+b, 0).toLocaleString()} images</span>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
