import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  CalendarRange,
  Clock,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/medicare/AppShell";
import { AiPanel, SectionTitle, StatCard, StatusBadge, WaitPill } from "@/components/medicare/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  alternativeSlots,
  daySlotInfo,
  demandForecast,
  detectConflicts,
  noShowRisk,
  riskBand,
} from "@/lib/medicare/ai";
import { generateSlots, prettyDate, prettyTime, timeOf } from "@/lib/medicare/data";
import { useMediCare } from "@/lib/medicare/store";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor Workspace — MediCare" },
      {
        name: "description",
        content:
          "Today's appointments, weekly OPD schedule, slot blocking and AI-predicted patient load for MediCare doctors.",
      },
      { property: "og:title", content: "Doctor Workspace — MediCare" },
      {
        property: "og:description",
        content: "Manage availability and see predicted patient load and no-show risk.",
      },
    ],
  }),
  component: DoctorWorkspace,
});

const tabs = [
  { id: "today", label: "Today", icon: <CalendarDays className="size-4" /> },
  { id: "week", label: "Weekly", icon: <CalendarRange className="size-4" /> },
  { id: "availability", label: "Availability", icon: <Clock className="size-4" /> },
  { id: "load", label: "AI load", icon: <Sparkles className="size-4" /> },
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DoctorWorkspace() {
  const store = useMediCare();
  const navigate = useNavigate();
  const [tab, setTab] = useState("today");
  const [availDate, setAvailDate] = useState(store.today);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (store.session && store.session.role !== "doctor") navigate({ to: "/" });
  }, [store.session, navigate]);

  const doctor = store.currentDoctor ?? store.doctors[0];
  if (!doctor) return null;

  const todays = store.appointments
    .filter((a) => a.doctorId === doctor.id && a.date === store.today && a.status !== "cancelled")
    .sort((a, b) => a.time.localeCompare(b.time));
  const week = store.next14.slice(0, 7);
  const capacityToday = generateSlots(doctor, store.today).length;
  const forecast = demandForecast(store.today, [doctor], store.appointments);
  const conflicts = detectConflicts(
    store.appointments.filter((a) => a.doctorId === doctor.id),
    [doctor],
    store.blocked,
    store.patients,
  );

  return (
    <AppShell role="doctor" tabs={tabs} active={tab} onTabChange={setTab}>
      <div className="surface mb-6 p-5">
        <p className="text-sm text-muted-foreground">Doctor workspace</p>
        <h1 className="font-display text-2xl font-semibold">{doctor.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {doctor.specialization} · {store.departmentName(doctor.departmentId)} · OPD{" "}
          {prettyTime(doctor.workingHours.start)} – {prettyTime(doctor.workingHours.end)}
        </p>
      </div>

      {tab === "today" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today" value={todays.length} hint="Booked appointments" icon={<CalendarDays className="size-5" />} />
            <StatCard label="Capacity" value={`${capacityToday} slots`} hint="Total OPD slots" tone="info" icon={<Clock className="size-5" />} />
            <StatCard
              label="Utilisation"
              value={`${capacityToday ? Math.round((todays.length / capacityToday) * 100) : 0}%`}
              hint="Of today's schedule"
              tone="success"
              icon={<Users className="size-5" />}
            />
            <StatCard
              label="Conflicts"
              value={conflicts.length}
              hint="Detected by AI"
              tone="warning"
              icon={<Sparkles className="size-5" />}
            />
          </div>

          <SectionTitle title="Today's appointments" subtitle="Ordered by scheduled time" />
          <Card>
            <CardContent className="divide-y p-0">
              {todays.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">No appointments today.</p>
              )}
              {todays.map((a) => {
                const patient = store.patients.find((p) => p.id === a.patientId);
                const risk = patient ? noShowRisk(patient, a) : 0;
                const band = riskBand(risk);
                return (
                  <div key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                    <p className="w-20 font-display text-sm font-semibold">{prettyTime(a.time)}</p>
                    <div className="min-w-40 flex-1">
                      <p className="font-medium">{patient?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient?.age} yrs · {a.reason}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        band.tone === "destructive"
                          ? "border-destructive/40 text-destructive"
                          : band.tone === "warning"
                            ? "border-warning/50 text-warning-foreground"
                            : "border-success/40 text-success"
                      }
                    >
                      {band.label} no-show risk · {risk}%
                    </Badge>
                    <StatusBadge status={a.status} />
                    <Button size="sm" variant="outline" onClick={() => setDetailId(a.id)}>
                      Details
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {conflicts.length > 0 && (
            <AiPanel title="Scheduling conflicts detected" subtitle="Resolve before the OPD session starts">
              <ul className="space-y-2 text-sm">
                {conflicts.map((c) => (
                  <li key={c.id} className="rounded-lg bg-card/80 p-3">{c.message}</li>
                ))}
              </ul>
            </AiPanel>
          )}
        </div>
      )}

      {tab === "week" && (
        <div className="space-y-4">
          <SectionTitle title="Weekly schedule" subtitle="Next seven days at a glance" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {week.map((d) => {
              const slots = daySlotInfo(doctor, d, store.appointments, store.blocked);
              const booked = slots.filter((s) => s.status === "booked").length;
              return (
                <Card key={d}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{prettyDate(d)}</p>
                      <Badge variant="secondary">
                        {slots.length === 0 ? "Off duty" : `${booked}/${slots.length}`}
                      </Badge>
                    </div>
                    <Progress
                      className="mt-3"
                      value={slots.length ? (booked / slots.length) * 100 : 0}
                    />
                    <div className="mt-3 flex flex-wrap gap-1">
                      {slots.map((s) => (
                        <span
                          key={s.time}
                          title={`${prettyTime(s.time)} · ${s.status}`}
                          className={`h-2.5 w-5 rounded-full ${
                            s.status === "booked"
                              ? "bg-primary"
                              : s.status === "blocked"
                                ? "bg-destructive/60"
                                : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === "availability" && (
        <div className="space-y-6">
          <SectionTitle title="Availability & working hours" subtitle="Block slots or change your OPD window" />
          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Start time</Label>
                <Select
                  value={doctor.workingHours.start}
                  onValueChange={(v) =>
                    store.setWorkingHours(doctor.id, v, doctor.workingHours.end, doctor.offDays)
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => timeOf((7 + i) * 60)).map((t) => (
                      <SelectItem key={t} value={t}>{prettyTime(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <Select
                  value={doctor.workingHours.end}
                  onValueChange={(v) =>
                    store.setWorkingHours(doctor.id, doctor.workingHours.start, v, doctor.offDays)
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => timeOf((11 + i) * 60)).map((t) => (
                      <SelectItem key={t} value={t}>{prettyTime(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Weekly off days</Label>
                <div className="flex flex-wrap gap-1">
                  {dayNames.map((name, idx) => {
                    const on = doctor.offDays.includes(idx);
                    return (
                      <button
                        key={name}
                        onClick={() =>
                          store.setWorkingHours(
                            doctor.id,
                            doctor.workingHours.start,
                            doctor.workingHours.end,
                            on
                              ? doctor.offDays.filter((d) => d !== idx)
                              : [...doctor.offDays, idx],
                          )
                        }
                        className={`rounded-md border px-2 py-1 text-xs ${
                          on ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm">Date</Label>
            <Select value={availDate} onValueChange={setAvailDate}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {store.next14.map((d) => (
                  <SelectItem key={d} value={d}>{prettyDate(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
            {daySlotInfo(doctor, availDate, store.appointments, store.blocked).map((s) => (
              <button
                key={s.time}
                onClick={() => {
                  if (s.status === "booked") {
                    toast.error("Slot is booked — reschedule the patient first");
                    return;
                  }
                  store.toggleBlock(doctor.id, availDate, s.time);
                }}
                className={`rounded-lg border px-2 py-2 text-xs ${
                  s.status === "booked"
                    ? "border-primary/40 bg-primary-soft text-primary"
                    : s.status === "blocked"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-border bg-card hover:border-primary"
                }`}
              >
                <span className="block font-semibold">{prettyTime(s.time)}</span>
                <span className="block text-[10px] capitalize">{s.status}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Tap an available slot to block it, or a blocked slot to release it.
          </p>
        </div>
      )}

      {tab === "load" && (
        <div className="space-y-6">
          <SectionTitle title="Expected patient load" subtitle="AI forecast for today's session" />
          <Card>
            <CardContent className="space-y-3 p-4">
              {forecast
                .filter((f) => f.capacity > 0)
                .map((f) => (
                  <div key={f.hour} className="flex items-center gap-3">
                    <span className="w-14 text-sm">{prettyTime(f.hour)}</span>
                    <Progress
                      className="flex-1"
                      value={f.capacity ? (f.predicted / f.capacity) * 100 : 0}
                    />
                    <span className="w-24 text-right text-xs text-muted-foreground">
                      {f.predicted}/{f.capacity} predicted
                    </span>
                  </div>
                ))}
            </CardContent>
          </Card>

          <AiPanel title="Suggested alternatives for blocked time" subtitle="Use these when you must step away">
            <div className="grid gap-2 sm:grid-cols-4">
              {alternativeSlots(
                doctor,
                store.next14.slice(0, 4),
                "12:00",
                store.appointments,
                store.blocked,
                4,
              ).map((s) => (
                <div key={`${s.date}${s.time}`} className="rounded-xl bg-card/80 p-3">
                  <p className="text-sm font-semibold">{prettyTime(s.time)}</p>
                  <p className="text-xs text-muted-foreground">{prettyDate(s.date)}</p>
                  <div className="mt-2"><WaitPill minutes={s.predictedWait} /></div>
                </div>
              ))}
            </div>
          </AiPanel>
        </div>
      )}

      {detailId && (
        <DetailDialog id={detailId} onClose={() => setDetailId(null)} />
      )}
    </AppShell>
  );
}

function DetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const store = useMediCare();
  const apt = store.appointments.find((a) => a.id === id);
  const doctor = store.doctors.find((d) => d.id === apt?.doctorId);
  const patient = store.patients.find((p) => p.id === apt?.patientId);
  const [date, setDate] = useState(apt?.date ?? store.today);
  if (!apt || !doctor || !patient) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Appointment details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Patient:</span> {patient.name}</p>
          <p><span className="text-muted-foreground">Age / gender:</span> {patient.age} · {patient.gender}</p>
          <p><span className="text-muted-foreground">Phone:</span> {patient.phone}</p>
          <p><span className="text-muted-foreground">Blood group:</span> {patient.bloodGroup}</p>
          <p><span className="text-muted-foreground">Reason:</span> {apt.reason}</p>
          <p><span className="text-muted-foreground">Scheduled:</span> {prettyDate(apt.date)} {prettyTime(apt.time)}</p>
          <p><span className="text-muted-foreground">Past visits:</span> {patient.pastVisits}</p>
          <p><span className="text-muted-foreground">No-show risk:</span> {noShowRisk(patient, apt)}%</p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Stethoscope className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Reschedule this patient</p>
        </div>
        <Select value={date} onValueChange={setDate}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            {store.next14.map((d) => (
              <SelectItem key={d} value={d}>{prettyDate(d)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {daySlotInfo(doctor, date, store.appointments, store.blocked)
            .filter((s) => s.status === "available")
            .slice(0, 12)
            .map((s) => (
              <button
                key={s.time}
                onClick={() => {
                  store.reschedule(apt.id, date, s.time, "doctor");
                  toast.success("Patient rescheduled and notified");
                  onClose();
                }}
                className="rounded-lg border border-border px-2 py-2 text-xs hover:border-primary hover:bg-primary-soft"
              >
                {prettyTime(s.time)}
              </button>
            ))}
        </div>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            store.setStatus(apt.id, "completed");
            toast.success("Marked as completed");
            onClose();
          }}
        >
          Mark consultation completed
        </Button>
      </DialogContent>
    </Dialog>
  );
}
