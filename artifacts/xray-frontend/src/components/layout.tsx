import { Link, useLocation } from "wouter";
import { Activity, Info } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
            <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground hidden sm:inline-block">X-Ray AI Assistant</span>
          </Link>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link 
              href="/" 
              className={`transition-colors hover:text-primary ${location === "/" ? "text-primary" : "text-muted-foreground"}`}
            >
              Diagnosis
            </Link>
            <Link 
              href="/about" 
              className={`transition-colors hover:text-primary flex items-center gap-1.5 ${location === "/about" ? "text-primary" : "text-muted-foreground"}`}
            >
              <Info className="h-4 w-4" />
              <span>About Model</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>

      <footer className="py-6 border-t border-border/40 bg-muted/20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>For demonstration and research purposes only. Not for clinical diagnostic use without human verification.</p>
        </div>
      </footer>
    </div>
  );
}
