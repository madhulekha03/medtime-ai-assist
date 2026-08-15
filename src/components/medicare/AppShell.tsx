import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, HeartPulse, LogOut, RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediCare } from "@/lib/medicare/store";
import type { Role } from "@/lib/medicare/data";

export function AppShell({
  role,
  tabs,
  active,
  onTabChange,
  children,
}: {
  role: Role;
  tabs: { id: string; label: string; icon: ReactNode }[];
  active: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
}) {
  const { session, setSession, notifications, markAllRead, resetDemo, currentPatient } =
    useMediCare();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const mine = notifications.filter(
    (n) =>
      n.audience === role &&
      (role === "patient"
        ? !n.patientId || n.patientId === session?.patientId
        : role === "doctor"
          ? !n.doctorId || n.doctorId === session?.doctorId
          : true),
  );
  const unread = mine.filter((n) => !n.read).length;

  const roleLabel = role === "patient" ? "Patient" : role === "doctor" ? "Doctor" : "Administrator";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <HeartPulse className="size-5" />
            </span>
            <span className="hidden sm:block">
              <span className="block font-display text-base leading-none font-semibold">
                MediCare
              </span>
              <span className="text-[11px] text-muted-foreground">Multispeciality Hospital</span>
            </span>
          </Link>

          <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active === t.id
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (v) markAllRead(role, session?.patientId ?? session?.doctorId);
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="size-5" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {unread}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {mine.length === 0 && (
                  <p className="px-2 py-4 text-sm text-muted-foreground">Nothing new right now.</p>
                )}
                {mine.slice(0, 6).map((n) => (
                  <div key={n.id} className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.kind === "ai" && (
                        <Badge className="border-transparent bg-ai-soft text-ai">AI</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" aria-label="Reset demo data" onClick={resetDemo}>
              <RotateCcw className="size-4" />
            </Button>

            <div className="hidden text-right sm:block">
              <p className="text-sm leading-none font-medium">
                {currentPatient?.name ?? session?.name ?? roleLabel}
              </p>
              <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSession(null);
                navigate({ to: "/" });
              }}
            >
              <LogOut className="size-4" /> <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <div className="flex items-stretch">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                active === t.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
