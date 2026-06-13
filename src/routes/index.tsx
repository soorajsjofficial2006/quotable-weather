import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cloud,
  Code2,
  Copy,
  Download,
  Github,
  Loader2,
  Play,
  Quote,
  RefreshCw,
  Save,
  Sparkles,
  Terminal,
  Thermometer,
  Timer,
  Workflow,
  Zap,
} from "lucide-react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulse — Autonomous Daily Summary Bot" },
      {
        name: "description",
        content:
          "Pulse fetches live weather and a daily motivational quote, generating an automated summary via Python and GitHub Actions.",
      },
      { property: "og:title", content: "Pulse — Autonomous Daily Summary Bot" },
      {
        property: "og:description",
        content:
          "Pulse fetches live weather and a daily motivational quote, generating an automated summary via Python and GitHub Actions.",
      },
    ],
  }),
  component: PulseApp,
});

type Weather = {
  location: string;
  temperature: string;
  condition: string;
  feelsLike: string;
  humidity: string;
  wind: string;
  updatedAt: string;
};

type QuoteData = { text: string; author: string };

type Status = "idle" | "running" | "success" | "failed";

async function fetchWeather(): Promise<Weather> {
  const res = await fetch("https://wttr.in/?format=j1");
  if (!res.ok) throw new Error("Weather fetch failed");
  const data = await res.json();
  const current = data.current_condition?.[0];
  const area = data.nearest_area?.[0];
  return {
    location: `${area?.areaName?.[0]?.value ?? "Unknown"}, ${area?.country?.[0]?.value ?? ""}`,
    temperature: `${current?.temp_C ?? "--"}°C`,
    condition: current?.weatherDesc?.[0]?.value ?? "Unknown",
    feelsLike: `${current?.FeelsLikeC ?? "--"}°C`,
    humidity: `${current?.humidity ?? "--"}%`,
    wind: `${current?.windspeedKmph ?? "--"} km/h`,
    updatedAt: new Date().toLocaleTimeString(),
  };
}

async function fetchQuote(): Promise<QuoteData> {
  // ZenQuotes CORS proxy via allorigins (zenquotes blocks browser CORS)
  try {
    const res = await fetch(
      "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://zenquotes.io/api/random"),
    );
    const data = await res.json();
    const q = Array.isArray(data) ? data[0] : data;
    if (q?.q) return { text: q.q, author: q.a };
  } catch {
    // fall through
  }
  // Fallback list
  const fallback: QuoteData[] = [
    { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
    { text: "Code is poetry written for machines and humans alike.", author: "Anonymous" },
    { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  ];
  return fallback[Math.floor(Math.random() * fallback.length)];
}

function PulseApp() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runPipeline = async () => {
    setStatus("running");
    setError(null);
    try {
      const [w, q] = await Promise.all([fetchWeather(), fetchQuote()]);
      setWeather(w);
      setQuote(q);
      setStatus("success");
      setLastRun(new Date().toLocaleString());
    } catch (e) {
      setStatus("failed");
      setError(e instanceof Error ? e.message : "Pipeline failed");
    }
  };

  useEffect(() => {
    runPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const date = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return `PULSE DAILY SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date: ${date}

WEATHER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Location:    ${weather?.location ?? "—"}
Temperature: ${weather?.temperature ?? "—"} (feels like ${weather?.feelsLike ?? "—"})
Condition:   ${weather?.condition ?? "—"}
Humidity:    ${weather?.humidity ?? "—"}
Wind:        ${weather?.wind ?? "—"}

TODAY'S QUOTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"${quote?.text ?? "—"}"
   — ${quote?.author ?? "—"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated automatically by Pulse.
`;
  }, [weather, quote]);

  const downloadTxt = () => {
    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulse-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Summary downloaded");
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Toaster theme="dark" position="bottom-right" />
      <BackgroundFx />
      <Nav status={status} />

      <main className="relative mx-auto max-w-7xl px-6 pb-32 pt-24 sm:pt-32">
        <Hero status={status} lastRun={lastRun} onRun={runPipeline} />

        <Dashboard
          weather={weather}
          quote={quote}
          status={status}
          error={error}
          summary={summary}
          onDownload={downloadTxt}
          onCopy={copySummary}
          onRetry={runPipeline}
        />

        <WorkflowSection />
        <PipelineSection />
        <TechStackSection />
      </main>

      <Footer />
    </div>
  );
}

function BackgroundFx() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-40" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-[#050816]" />
    </>
  );
}

function Nav({ status }: { status: Status }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2">
          <div className="relative grid h-9 w-9 place-items-center rounded-lg grad-bg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tight">Pulse</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Daily Summary Bot
            </span>
          </div>
        </a>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#dashboard" className="transition hover:text-foreground">Dashboard</a>
          <a href="#workflow" className="transition hover:text-foreground">Workflow</a>
          <a href="#pipeline" className="transition hover:text-foreground">Pipeline</a>
          <a href="#stack" className="transition hover:text-foreground">Stack</a>
        </nav>
        <ApiStatusPill status={status} />
      </div>
    </header>
  );
}

function ApiStatusPill({ status }: { status: Status }) {
  const map = {
    idle: { color: "bg-muted-foreground", label: "Idle" },
    running: { color: "bg-secondary", label: "Running" },
    success: { color: "bg-[color:var(--success)]", label: "Live" },
    failed: { color: "bg-destructive", label: "Down" },
  } as const;
  const s = map[status];
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
      <span className={`relative flex h-2 w-2`}>
        <span className={`absolute inline-flex h-full w-full rounded-full ${s.color} opacity-60 animate-pulse-dot`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${s.color}`} />
      </span>
      <span className="font-mono text-muted-foreground">API · {s.label}</span>
    </div>
  );
}

function Hero({ status, lastRun, onRun }: { status: Status; lastRun: string | null; onRun: () => void }) {
  return (
    <section id="top" className="relative pb-20 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-4xl text-center"
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-secondary" />
          Autonomous · Python · GitHub Actions
        </div>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          A daily summary bot
          <br />
          that <span className="gradient-text">runs itself.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Pulse fetches live weather and a motivational quote every morning, compiles a clean
          report, and ships it through a scheduled GitHub Actions pipeline — no servers required.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onRun}
            disabled={status === "running"}
            className="group inline-flex items-center gap-2 rounded-full grad-bg px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_-8px_rgba(59,130,246,0.6)] transition hover:scale-[1.02] disabled:opacity-60"
          >
            {status === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 transition group-hover:translate-x-0.5" />
            )}
            Run Pipeline Now
          </button>
          <a
            href="#dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-white/10"
          >
            View Dashboard <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {lastRun && (
          <p className="mt-6 font-mono text-xs text-muted-foreground">
            last_run = "{lastRun}"
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mx-auto mt-16 max-w-3xl"
      >
        <TerminalPreview />
      </motion.div>
    </section>
  );
}

function TerminalPreview() {
  return (
    <div className="glass rounded-2xl p-1">
      <div className="rounded-xl bg-[#050816]/80 font-mono text-xs sm:text-sm">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          <span className="ml-3 text-muted-foreground">pulse — bash</span>
        </div>
        <div className="space-y-1.5 p-5 leading-relaxed">
          <p><span className="text-secondary">$</span> python pulse.py --run</p>
          <p className="text-muted-foreground">→ fetching weather from wttr.in...</p>
          <p className="text-muted-foreground">→ fetching quote from zenquotes.io...</p>
          <p className="text-muted-foreground">→ generating daily summary...</p>
          <p><span className="text-[color:var(--success)]">✓</span> summary saved to <span className="text-primary">reports/2026-06-13.txt</span></p>
          <p><span className="text-[color:var(--success)]">✓</span> artifact uploaded · workflow #128 passed</p>
          <p className="text-muted-foreground">next scheduled run: tomorrow 08:00 UTC</p>
        </div>
      </div>
    </div>
  );
}

function Dashboard({
  weather,
  quote,
  status,
  error,
  summary,
  onDownload,
  onCopy,
  onRetry,
}: {
  weather: Weather | null;
  quote: QuoteData | null;
  status: Status;
  error: string | null;
  summary: string;
  onDownload: () => void;
  onCopy: () => void;
  onRetry: () => void;
}) {
  return (
    <section id="dashboard" className="scroll-mt-24 pt-12">
      <SectionHeader
        eyebrow="Dashboard"
        title="Today's autonomous run"
        description="Live data fetched directly from the same APIs used by the scheduled Python job."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <WeatherCard weather={weather} status={status} />
        <QuoteCard quote={quote} status={status} />
        <StatusCard status={status} error={error} onRetry={onRetry} />
      </div>

      <div className="mt-6">
        <SummaryCard summary={summary} status={status} onDownload={onDownload} onCopy={onCopy} />
      </div>
    </section>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-shimmer rounded-md bg-white/5 ${className}`} />;
}

function WeatherCard({ weather, status }: { weather: Weather | null; status: Status }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass relative overflow-hidden rounded-2xl p-6"
    >
      <div className="absolute inset-x-0 top-0 h-px grad-bg" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Cloud className="h-4 w-4 text-secondary" /> Weather
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">wttr.in</span>
      </div>
      {status === "running" || !weather ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-baseline gap-2">
            <Thermometer className="h-6 w-6 text-primary" />
            <span className="text-5xl font-bold tracking-tight">{weather.temperature}</span>
          </div>
          <p className="mt-2 text-sm text-foreground/80">{weather.condition}</p>
          <p className="text-sm text-muted-foreground">{weather.location}</p>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/5 pt-4 text-xs">
            <Stat label="Feels" value={weather.feelsLike} />
            <Stat label="Humidity" value={weather.humidity} />
            <Stat label="Wind" value={weather.wind} />
          </div>
          <p className="mt-4 font-mono text-[10px] text-muted-foreground">
            updated {weather.updatedAt}
          </p>
        </>
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}

function QuoteCard({ quote, status }: { quote: QuoteData | null; status: Status }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="glass relative overflow-hidden rounded-2xl p-6">
      <div className="absolute inset-x-0 top-0 h-px grad-bg" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Quote className="h-4 w-4 text-secondary" /> Today's Quote
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">zenquotes.io</span>
      </div>
      {status === "running" || !quote ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : (
        <>
          <p className="mt-6 text-lg font-medium leading-snug text-foreground">
            <span className="gradient-text">"</span>
            {quote.text}
            <span className="gradient-text">"</span>
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            — {quote.author}
          </p>
        </>
      )}
    </motion.div>
  );
}

function StatusCard({ status, error, onRetry }: { status: Status; error: string | null; onRetry: () => void }) {
  const config = {
    idle: { color: "text-muted-foreground", dot: "bg-muted-foreground", label: "Idle" },
    running: { color: "text-secondary", dot: "bg-secondary", label: "Running" },
    success: { color: "text-[color:var(--success)]", dot: "bg-[color:var(--success)]", label: "Success" },
    failed: { color: "text-destructive", dot: "bg-destructive", label: "Failed" },
  }[status];

  return (
    <motion.div whileHover={{ y: -4 }} className="glass relative overflow-hidden rounded-2xl p-6">
      <div className="absolute inset-x-0 top-0 h-px grad-bg" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Activity className="h-4 w-4 text-secondary" /> Last Run
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">workflow #128</span>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className={`absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-50 animate-pulse-dot`} />
          <span className={`relative inline-flex h-3 w-3 rounded-full ${config.dot}`} />
        </span>
        <span className={`text-2xl font-semibold ${config.color}`}>{config.label}</span>
      </div>

      <div className="mt-5 space-y-2 border-t border-white/5 pt-4 font-mono text-xs text-muted-foreground">
        <p>job: <span className="text-foreground">pulse-daily</span></p>
        <p>trigger: <span className="text-foreground">cron(0 8 * * *)</span></p>
        <p>runner: <span className="text-foreground">ubuntu-latest</span></p>
      </div>

      {status === "failed" && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs">
          <p className="text-destructive">{error ?? "Unknown error"}</p>
          <button onClick={onRetry} className="mt-2 inline-flex items-center gap-1 text-foreground hover:underline">
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}
    </motion.div>
  );
}

function SummaryCard({
  summary,
  status,
  onDownload,
  onCopy,
}: {
  summary: string;
  status: Status;
  onDownload: () => void;
  onCopy: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-strong relative overflow-hidden rounded-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-secondary" />
          <span className="font-mono text-xs text-muted-foreground">~/reports/daily-summary.txt</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            disabled={status !== "success"}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10 disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <button
            onClick={onDownload}
            disabled={status !== "success"}
            className="inline-flex items-center gap-1.5 rounded-md grad-bg px-3 py-1.5 text-xs font-semibold text-white transition hover:scale-[1.03] disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Download .txt
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto p-6 font-mono text-[12px] leading-relaxed text-foreground/90 sm:text-sm">
        {summary}
      </pre>
    </motion.div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-secondary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">{description}</p>
    </div>
  );
}

const workflowSteps = [
  { icon: Cloud, title: "Fetch Weather", desc: "Call wttr.in API for live conditions" },
  { icon: Quote, title: "Fetch Quote", desc: "Pull a random motivational quote" },
  { icon: Sparkles, title: "Generate Summary", desc: "Compose formatted daily report" },
  { icon: Save, title: "Save Report", desc: "Write artifact to reports directory" },
  { icon: Github, title: "Auto-run Daily", desc: "Trigger via GitHub Actions cron" },
];

function WorkflowSection() {
  return (
    <section id="workflow" className="scroll-mt-24 pt-32">
      <SectionHeader
        eyebrow="How it runs"
        title="Daily Automation Workflow"
        description="Five deterministic steps, executed every morning without human input."
      />

      <div className="relative mt-14">
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {workflowSteps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="relative"
            >
              <div className="glass group flex h-full flex-col rounded-2xl p-5 transition hover:border-primary/30">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg grad-bg">
                    <step.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    STEP {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{step.desc}</p>
              </div>
              {i < workflowSteps.length - 1 && (
                <ArrowRight className="absolute -right-4 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-primary lg:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const pipelineItems = [
  {
    icon: Timer,
    title: "Scheduled Execution",
    desc: "Workflow triggers automatically once per day at 08:00 UTC.",
    code: "schedule:\n  - cron: '0 8 * * *'",
  },
  {
    icon: Workflow,
    title: "Cron Trigger",
    desc: "Standard cron expression managed entirely by GitHub Actions.",
    code: "on: [schedule, workflow_dispatch]",
  },
  {
    icon: Code2,
    title: "Python Script",
    desc: "Lightweight pulse.py using requests fetches data and writes the report.",
    code: "run: python pulse.py --run",
  },
  {
    icon: Save,
    title: "Artifact Upload",
    desc: "Generated summary is committed and uploaded as a workflow artifact.",
    code: "uses: actions/upload-artifact@v4",
  },
];

function PipelineSection() {
  return (
    <section id="pipeline" className="scroll-mt-24 pt-32">
      <SectionHeader
        eyebrow="DevOps"
        title="Automation Pipeline"
        description="The same workflow that powers this dashboard, deployed as a free GitHub Actions job."
      />
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {pipelineItems.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            className="glass group relative overflow-hidden rounded-2xl p-6 transition hover:border-primary/30"
          >
            <div className="flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-lg grad-bg">
                <item.icon className="h-5 w-5 text-white" />
              </div>
              <CheckCircle2 className="h-5 w-5 text-[color:var(--success)]" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-[11px] text-secondary">
              {item.code}
            </pre>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const techGroups = [
  {
    label: "Backend",
    items: [
      { name: "Python", tag: "language" },
      { name: "Requests", tag: "http client" },
    ],
  },
  {
    label: "APIs",
    items: [
      { name: "wttr.in", tag: "weather" },
      { name: "ZenQuotes", tag: "quotes" },
    ],
  },
  {
    label: "Automation",
    items: [
      { name: "GitHub Actions", tag: "ci/cd" },
      { name: "Cron Scheduling", tag: "trigger" },
    ],
  },
  {
    label: "Deployment",
    items: [
      { name: "GitHub Pages", tag: "static host" },
      { name: "Artifacts", tag: "storage" },
    ],
  },
];

function TechStackSection() {
  return (
    <section id="stack" className="scroll-mt-24 pt-32">
      <SectionHeader
        eyebrow="Stack"
        title="Built on tools you already trust"
        description="A minimal stack — zero infrastructure to maintain, no servers to pay for."
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {techGroups.map((g, i) => (
          <motion.div
            key={g.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-secondary" />
              {g.label}
            </div>
            <ul className="mt-5 space-y-3">
              {g.items.map((it) => (
                <li
                  key={it.name}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
                >
                  <span className="text-sm font-medium">{it.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {it.tag}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg grad-bg">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            pulse · autonomous daily summary bot
          </span>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} · built with python, requests & github actions
        </p>
      </div>
    </footer>
  );
}
