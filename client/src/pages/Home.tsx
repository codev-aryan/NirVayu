import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ClimateClock } from "@/components/ClimateClock";
import { ArrowRight, Shield, Users, Wind, Map } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 p-6 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto w-full gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Wind className="text-white w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">NirVayu</span>
        </div>
        <div className="md:absolute md:left-1/2 md:-translate-x-1/2 md:top-4">
          <ClimateClock />
        </div>
        <div className="hidden md:block w-32" /> {/* Spacer to keep layout balanced */}
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border backdrop-blur-sm text-sm font-medium animate-in slide-in-from-top-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Live Ward-Wise Monitoring System
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 pb-2">
            Breathing data into <br/>
            <span className="text-primary">actionable change.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A dual-interface platform connecting citizens with real-time health advisories and authorities with granular pollution controls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <Link href="/citizen" className="group">
            <div className="h-full p-8 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 text-left flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users className="w-24 h-24" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold font-display mb-2">Citizen Portal</h3>
              <p className="text-muted-foreground mb-6 flex-1">
                Access personalized health plans, check safe outdoor timings, and earn credits for green actions.
              </p>
              <div className="flex items-center text-primary font-semibold text-sm">
                Enter Dashboard <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link href="/authority" className="group">
            <div className="h-full p-8 rounded-2xl border border-border bg-card hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 text-left flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Shield className="w-24 h-24" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold font-display mb-2">Authority Hub</h3>
              <p className="text-muted-foreground mb-6 flex-1">
                Monitor ward-level metrics, simulate policy impacts, and deploy emergency protocols.
              </p>
              <div className="flex items-center text-blue-600 font-semibold text-sm">
                Access Controls <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
        © 2024 NirVayu System. Data provided by Ward Sensors Network.
      </footer>
    </div>
  );
}
