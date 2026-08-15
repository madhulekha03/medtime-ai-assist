import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  Clock,
  History,
  LayoutDashboard,
  Search,
  Sparkles,
  Star,
  Stethoscope,
  Timer,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/medicare/AppShell";
import { AiPanel, SectionTitle, StatCard, StatusBadge, WaitPill } from "@/components/medicare/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { daySlotInfo, recommendSlots } from "@/lib/medicare/ai";
import { prettyDate, prettyTime, reasons, type Doctor } from "@/lib/medicare/data";
import { useMediCare } from "@/lib/medicare/store";

export const Route = createFileRoute("/patient")({
  head: () => ({
    meta: [
      { title: "Patient Dashboard — MediCare" },
      {
        name: "description",
        content:
          "Book, reschedule and track hospital appointments with AI-recommended slots and predicted waiting times.",
      },
      { property: "og:title", content: "Patient Dashboard — MediCare" },
      {
        property: "og:description",
        content: "Your appointments, doctor search and AI slot recommendations in one place.",
      },
    ],
  }),
  component: PatientWorkspace,
});

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
  { id: "find", label: "Find a doctor", icon: <Search className="size-4" /> },
  { id: "appointments", label: "Appointments", icon: <CalendarDays className="size-4" /> },
  { id: "alerts", label: "Alerts", icon: <Bell className="size-4" /> },
];

function PatientWorkspace() {
  const store = useMediCare();
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [profileDoctor, setProfileDoctor] = useState<Doctor | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  useEffect(() => {
    if (store.session && store.session.role !== "patient") navigate({ to: "/" });
  }, [store.session, navigate]);

  const patient = store.currentPatient ?? store.patients[0] ?? null;
  if (!patient) return null;

  const mine = store.appointments
    .filter((a) => a.patientId === patient.id)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const upcoming = mine.filter(
    (a) => a.date >= store.today && (a.status === "confirmed" || a.status === "rescheduled"),
  );
  const history = mine.filter(
    (a) => a.date < store.today || a.status === "completed" || a.status === "cancelled" || a.status === "no-show",
  );

  const notifications = store.notifications.filter(
    (n) => n.audience === "patient" && (!n.patientId || n.patientId === patient.id),
  );

  return (
    <AppShell role="patient" tabs={tabs} active={tab} onTabChange={setTab}>
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="surface p-5">
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="font-display text-2xl font-semibold">{patient.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {patient.age} yrs · {patient.gender} · Blood group {patient.bloodGroup} · Prefers{" "}
              {patient.preferredWindow} appointments
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Upcoming"
              value={upcoming.length}
              hint="Confirmed appointments"
              icon={<CalendarCheck className="size-5" />}
            />
            <StatCard
              label="Visits so far"
              value={patient.pastVisits}
              hint="Completed consultations"
              tone="success"
              icon={<History className="size-5" />}
            />
            <StatCard
              label="Missed"
              value={patient.pastNoShows}
              hint="No-shows on record"
              tone="warning"
              icon={<X className="size-5" />}
            />
            <StatCard
              label="Avg. wait saved"
              value="18 min"
              hint="Using AI slot picks"
              tone="ai"
              icon={<Sparkles className="size-5" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionTitle title="Upcoming appointments" subtitle="Tap an appointment to manage it" />
              <div className="space-y-3">
                {upcoming.length === 0 && (
                  <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      No upcoming appointments. Head to “Find a doctor” to book one.
                    </CardContent>
                  </Card>
                )}
                {upcoming.map((a) => {
                  const doctor = store.doctors.find((d) => d.id === a.doctorId);
                  return (
                    <Card key={a.id} className="shadow-card">
                      <CardContent className="flex flex-wrap items-center gap-4 p-4">
                        <div className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
                          <Stethoscope className="size-5" />
                        </div>
                        <div className="min-w-40 flex-1">
                          <p className="font-medium">{doctor?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doctor?.specialization} · {store.departmentName(doctor?.departmentId ?? "")}
                          </p>
                          <p className="mt-1 text-sm">
                            {prettyDate(a.date)} · {prettyTime(a.time)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <StatusBadge status={a.status} />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setRescheduleId(a.id)}>
                              Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => {
                                store.cancel(a.id);
                                toast.success("Appointment cancelled — the slot is back in the pool");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <AiPanel
                title="AI recommended for you"
                subtitle={`Based on your ${patient.preferredWindow} preference and predicted waiting time`}
              >
                <div className="space-y-2">
                  {store.doctors.slice(0, 2).flatMap((d) =>
                    recommendSlots(
                      d,
                      store.next14.slice(0, 5),
                      patient.preferredWindow,
                      store.appointments,
                      store.blocked,
                      1,
                    ).map((r) => (
                      <div key={`${d.id}${r.date}${r.time}`} className="rounded-xl bg-card/80 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{d.name}</p>
                          <WaitPill minutes={r.predictedWait} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {prettyDate(r.date)} · {prettyTime(r.time)} — {r.reason}
                        </p>
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => {
                            store.book({
                              patientId: patient.id,
                              doctorId: d.id,
                              date: r.date,
                              time: r.time,
                              reason: "AI recommended slot",
                            });
                            toast.success("Appointment booked from AI recommendation");
                          }}
                        >
                          Book this slot
                        </Button>
                      </div>
                    )),
                  )}
                </div>
              </AiPanel>
            </div>
          </div>
        </div>
      )}

      {tab === "find" && (
        <FindDoctor onBook={setBookingDoctor} onProfile={setProfileDoctor} />
      )}

      {tab === "appointments" && (
        <div className="space-y-6">
          <SectionTitle title="Appointment history" subtitle="All past and upcoming visits" />
          <Card>
            <CardContent className="divide-y p-0">
              {[...upcoming, ...history].map((a) => {
                const doctor = store.doctors.find((d) => d.id === a.doctorId);
                return (
                  <div key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-40 flex-1">
                      <p className="font-medium">{doctor?.name ?? "Doctor"}</p>
                      <p className="text-xs text-muted-foreground">{a.reason}</p>
                    </div>
                    <p className="text-sm">
                      {prettyDate(a.date)} · {prettyTime(a.time)}
                    </p>
                    <StatusBadge status={a.status} />
                    {(a.status === "confirmed" || a.status === "rescheduled") && a.date >= store.today && (
                      <Button size="sm" variant="outline" onClick={() => setRescheduleId(a.id)}>
                        Reschedule
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "alerts" && (
        <div className="space-y-4">
          <SectionTitle title="Notifications" subtitle="Reminders, AI suggestions and schedule changes" />
          {notifications.map((n) => (
            <Card key={n.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                    n.kind === "ai"
                      ? "bg-ai-soft text-ai"
                      : n.kind === "alert"
                        ? "bg-warning/20 text-warning-foreground"
                        : n.kind === "success"
                          ? "bg-success/15 text-success"
                          : "bg-primary-soft text-primary"
                  }`}
                >
                  {n.kind === "ai" ? <Sparkles className="size-4" /> : <Bell className="size-4" />}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.read && <Badge variant="outline">New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {bookingDoctor && (
        <BookingDialog
          doctor={bookingDoctor}
          patientId={patient.id}
          onClose={() => setBookingDoctor(null)}
        />
      )}

      {profileDoctor && (
        <Dialog open onOpenChange={() => setProfileDoctor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{profileDoctor.name}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{profileDoctor.bio}</p>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Department:</span> {store.departmentName(profileDoctor.departmentId)}</p>
              <p><span className="text-muted-foreground">Specialisation:</span> {profileDoctor.specialization}</p>
              <p><span className="text-muted-foreground">Qualification:</span> {profileDoctor.qualification}</p>
              <p><span className="text-muted-foreground">Experience:</span> {profileDoctor.experience} years</p>
              <p><span className="text-muted-foreground">Consultation fee:</span> ₹{profileDoctor.fee}</p>
              <p><span className="text-muted-foreground">OPD hours:</span> {prettyTime(profileDoctor.workingHours.start)} – {prettyTime(profileDoctor.workingHours.end)}</p>
              <p className="sm:col-span-2"><span className="text-muted-foreground">Languages:</span> {profileDoctor.languages.join(", ")}</p>
            </div>
            <Button
              className="mt-3"
              onClick={() => {
                setBookingDoctor(profileDoctor);
                setProfileDoctor(null);
              }}
            >
              View available slots
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {rescheduleId && (
        <RescheduleDialog id={rescheduleId} onClose={() => setRescheduleId(null)} />
      )}
    </AppShell>
  );
}

function FindDoctor({
  onBook,
  onProfile,
}: {
  onBook: (d: Doctor) => void;
  onProfile: (d: Doctor) => void;
}) {
  const store = useMediCare();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");

  const results = store.doctors.filter((d) => {
    const matchDept = dept === "all" || d.departmentId === dept;
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.specialization.toLowerCase().includes(q) ||
      store.departmentName(d.departmentId).toLowerCase().includes(q);
    return matchDept && matchQuery;
  });

  return (
    <div className="space-y-5">
      <SectionTitle title="Find a doctor" subtitle="Search by name, department or specialisation" />
      <div className="grid gap-3 sm:grid-cols-[1fr_240px]">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. cardiology, spine, Dr. Nair"
        />
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {store.departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.map((d) => {
          const free = daySlotInfo(d, store.today, store.appointments, store.blocked).filter(
            (s) => s.status === "available",
          ).length;
          return (
            <Card key={d.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent font-display text-sm font-semibold text-accent-foreground">
                    {d.name.split(" ").slice(-2).map((w) => w[0]).join("")}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.specialization}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs">
                      <Star className="size-3 fill-warning text-warning" /> {d.rating} ·{" "}
                      {d.experience} yrs · ₹{d.fee}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary">{store.departmentName(d.departmentId)}</Badge>
                  <Badge variant="outline" className="border-success/40 text-success">
                    {free} slots free today
                  </Badge>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" /> {prettyTime(d.workingHours.start)} –{" "}
                  {prettyTime(d.workingHours.end)}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => onBook(d)}>
                    Book slot
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onProfile(d)}>
                    Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function BookingDialog({
  doctor,
  patientId,
  onClose,
}: {
  doctor: Doctor;
  patientId: string;
  onClose: () => void;
}) {
  const store = useMediCare();
  const patient = store.patients.find((p) => p.id === patientId);
  const [date, setDate] = useState(store.today);
  const [reason, setReason] = useState(reasons[0] ?? "Consultation");
  const [notes, setNotes] = useState("");

  const slots = daySlotInfo(doctor, date, store.appointments, store.blocked);
  const recos = useMemo(
    () =>
      recommendSlots(
        doctor,
        store.next14.slice(0, 6),
        patient?.preferredWindow ?? "any",
        store.appointments,
        store.blocked,
        3,
      ),
    [doctor, store.next14, patient?.preferredWindow, store.appointments, store.blocked],
  );

  const confirm = (d: string, t: string) => {
    store.book({ patientId, doctorId: doctor.id, date: d, time: t, reason: notes || reason });
    toast.success(`Appointment confirmed with ${doctor.name}`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book with {doctor.name}</DialogTitle>
        </DialogHeader>

        <AiPanel title="AI recommended slots" subtitle="Ranked by wait time, congestion and your preference">
          <div className="grid gap-2 sm:grid-cols-3">
            {recos.map((r) => (
              <button
                key={`${r.date}-${r.time}`}
                onClick={() => confirm(r.date, r.time)}
                className="rounded-xl border border-ai/30 bg-card p-3 text-left transition-shadow hover:shadow-card"
              >
                <p className="text-sm font-semibold">{prettyTime(r.time)}</p>
                <p className="text-xs text-muted-foreground">{prettyDate(r.date)}</p>
                <div className="mt-2">
                  <WaitPill minutes={r.predictedWait} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{r.reason}</p>
              </button>
            ))}
            {recos.length === 0 && (
              <p className="text-sm text-muted-foreground">No free slots in the next 6 days.</p>
            )}
          </div>
        </AiPanel>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {store.next14.map((d) => (
                  <SelectItem key={d} value={d}>
                    {prettyDate(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reason for visit</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes for the doctor (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">Real-time availability · {prettyDate(date)}</p>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {doctor.name} does not hold OPD on this day.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  key={s.time}
                  disabled={s.status !== "available"}
                  onClick={() => confirm(date, s.time)}
                  className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
                    s.status === "available"
                      ? "border-border bg-card hover:border-primary hover:bg-primary-soft"
                      : "cursor-not-allowed border-dashed border-border bg-muted text-muted-foreground line-through"
                  }`}
                >
                  <span className="block font-semibold">{prettyTime(s.time)}</span>
                  <span className="block text-[10px]">
                    {s.status === "available" ? `~${s.predictedWait}m wait` : s.status}
                  </span>
                </button>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => {
              store.joinWaitlist({
                patientId,
                doctorId: doctor.id,
                preferredDate: date,
                preferredWindow: patient?.preferredWindow ?? "any",
              });
              toast.success("Added to the waiting list for cancelled slots");
              onClose();
            }}
          >
            <Timer className="size-4" /> Join waiting list for this day
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RescheduleDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const store = useMediCare();
  const apt = store.appointments.find((a) => a.id === id);
  const doctor = store.doctors.find((d) => d.id === apt?.doctorId);
  const [date, setDate] = useState(apt?.date ?? store.today);
  if (!apt || !doctor) return null;
  const slots = daySlotInfo(doctor, date, store.appointments, store.blocked);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule with {doctor.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Current: {prettyDate(apt.date)} at {prettyTime(apt.time)}
        </p>
        <Select value={date} onValueChange={setDate}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {store.next14.map((d) => (
              <SelectItem key={d} value={d}>
                {prettyDate(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => (
            <button
              key={s.time}
              disabled={s.status !== "available"}
              onClick={() => {
                store.reschedule(apt.id, date, s.time);
                toast.success("Appointment rescheduled");
                onClose();
              }}
              className={`rounded-lg border px-2 py-2 text-xs ${
                s.status === "available"
                  ? "border-border bg-card hover:border-primary hover:bg-primary-soft"
                  : "cursor-not-allowed border-dashed bg-muted text-muted-foreground line-through"
              }`}
            >
              <span className="block font-semibold">{prettyTime(s.time)}</span>
              <span className="block text-[10px]">
                {s.status === "available" ? `~${s.predictedWait}m` : s.status}
              </span>
            </button>
          ))}
          {slots.length === 0 && (
            <p className="col-span-4 text-sm text-muted-foreground">No OPD on this day.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
