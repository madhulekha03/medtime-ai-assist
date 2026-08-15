import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AppointmentStatus } from "@/lib/medicare/data";

const statusStyles: Record<AppointmentStatus, string> = {
  confirmed: "bg-success/15 text-success border-success/30",
  completed: "bg-primary-soft text-primary border-primary/25",
  cancelled: "bg-destructive/12 text-destructive border-destructive/30",
  rescheduled: "bg-warning/20 text-warning-foreground border-warning/40",
  "no-show": "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant="outline" className={`capitalize ${statusStyles[status]}`}>
      {status.replace("-", " ")}
    </Badge>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  tone?: "primary" | "success" | "warning" | "ai" | "info";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    ai: "bg-ai-soft text-ai",
    info: "bg-info/15 text-info",
  };
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-start gap-3 p-4">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-display text-2xl leading-tight font-semibold">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function AiPanel({
  title,
  children,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card className="gradient-ai border-ai/25 shadow-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-ai text-ai-foreground">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </CardContent>
    </Card>
  );
}

export function WaitPill({ minutes }: { minutes: number }) {
  const tone =
    minutes <= 10
      ? "bg-success/15 text-success"
      : minutes <= 25
        ? "bg-warning/20 text-warning-foreground"
        : "bg-destructive/12 text-destructive";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      ~{minutes}m wait
    </span>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
