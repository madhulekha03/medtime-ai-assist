import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  LineChart as LineChartIcon,
  Sparkles,
  Timer,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/medicare/AppShell";
import { AiPanel, SectionTitle, StatCard, StatusBadge } from "@/components/medicare/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  daySlotInfo,
  demandForecast,
  detectConflicts,
  noShowRisk,
  optimisationTips,
  riskBand,
} from "@/lib/medicare/ai";
import { generateSlots, prettyDate, prettyTime } from "@/lib/medicare/data";
import { useMediCare } from "@/lib/medicare/store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Hospital Admin — MediCare" },
      {
        name: "description",
        content:
          "Hospital-wide overview of doctors, departments, appointments, cancellations, waiting list and AI demand prediction.",
      },
      { property: "og:title", content: "Hospital Admin — MediCare" },
      {
        property: "og:description",
        content: "Patient load analytics and AI demand forecasting for hospital operations.",
      },
    ],
  }),
  component: AdminWorkspace,
});

const tabs = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="size-4" /> },
  { id: "doctors", label: "Doctors", icon: <Users className="size-4" /> },
  { id: "departments", label: "Departments", icon: <Building2 className="size-4" /> },
  { id: "appointments", label: "Appointments", icon: <CalendarDays className="size-4" /> },
  { id: "waitlist", label: "Waiting list", icon: <Timer className="size-4" /> },
  { id: "ai", label: "Analytics", icon: <LineChartIcon className="size-4" /> },
];

function AdminWorkspace() {
  const store = useMediCare();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [date, setDate] = useState(store.today);

  useEffect(() => {
    if (store.session && store.session.role !== "admin") navigate({ to: "/" });
  }, [store.session, navigate]);

  const active = store.appointments.filter(
    (a) => a.status === "confirmed" || a.status === "rescheduled",
  );
  const todays = store.appointments.filter((a) => a.date === store.today && a.status !== "cancelled");
  const cancellations = store.appointments.filter((a) => a.status === "cancelled");
  const noShows = store.appointments.filter((a) => a.status === "no-show");
  const forecast = demandForecast(date, store.doctors, store.appointments);
  const conflicts = detectConflicts(store.appointments, store.doctors, store.blocked, store.patients);
  const tips = optimisationTips(date, store.doctors, store.appointments);

  const doctorLoad = store.doctors.map((d) => {
    const cap = generateSlots(d, date).length;
    const booked = store.appointments.filter(
      (a) => a.doctorId === d.id && a.date === date && a.status !== "cancelled",
    ).length;
    return { d, cap, booked, pct: cap ? Math.round((booked / cap) * 100) : 0 };
  });

  const deptData = store.departments.map((dep) => ({
    name: dep.name.slice(0, 10),
    appointments: store.appointments.filter(
      (a) =>
        a.status !== "cancelled" &&
        store.doctors.find((d) => d.id === a.doctorId)?.departmentId === dep.id,
    ).length,
  }));

  return (
    <AppShell role="admin" tabs={tabs} active={tab} onTabChange={setTab}>
      {tab === "overview" && (
        <div className="space-y-6">
          <SectionTitle title="Hospital overview" subtitle="Live operational snapshot" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today's OPD" value={todays.length} hint="Scheduled appointments" icon={<CalendarDays className="size-5" />} />
            <StatCard label="Active bookings" value={active.length} hint="Across all departments" tone="info" icon={<Users className="size-5" />} />
            <StatCard label="Cancellations" value={cancellations.length} hint={`${noShows.length} no-shows recorded`} tone="warning" icon={<Trash2 className="size-5" />} />
            <StatCard label="Conflicts" value={conflicts.length} hint="AI conflict detection" tone="ai" icon={<Sparkles className="size-5" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 font-display text-sm font-semibold">Appointments by department</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="name" fontSize={11} stroke="var(--color-muted-foreground)" />
                      <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                      <Tooltip />
                      <Bar dataKey="appointments" fill="var(--color-chart-1)" radius={6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="mb-3 font-display text-sm font-semibold">Doctor utilisation · {prettyDate(date)}</p>
                <div className="space-y-3">
                  {doctorLoad.map((x) => (
                    <div key={x.d.id} className="flex items-center gap-3">
                      <span className="w-40 truncate text-sm">{x.d.name}</span>
                      <Progress className="flex-1" value={x.pct} />
                      <span className="w-16 text-right text-xs text-muted-foreground">
                        {x.cap ? `${x.booked}/${x.cap}` : "Off"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {conflicts.length > 0 && (
            <AiPanel title="Conflicts needing attention" subtitle="Detected across all doctor schedules">
              <ul className="space-y-2 text-sm">
                {conflicts.slice(0, 5).map((c) => (
                  <li key={c.id} className="rounded-lg bg-card/80 p-3">{c.message}</li>
                ))}
              </ul>
            </AiPanel>
          )}
        </div>
      )}

      {tab === "doctors" && <ManageDoctors />}

      {tab === "departments" && <ManageDepartments />}

      {tab === "appointments" && (
        <div className="space-y-4">
          <SectionTitle title="All appointments" subtitle="Bookings, cancellations and no-shows" />
          <Card>
            <CardContent className="divide-y p-0">
              {[...store.appointments]
                .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
                .slice(0, 40)
                .map((a) => {
                  const patient = store.patients.find((p) => p.id === a.patientId);
                  const risk = patient ? noShowRisk(patient, a) : 0;
                  const band = riskBand(risk);
                  return (
                    <div key={a.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                      <span className="w-28">{prettyDate(a.date)}</span>
                      <span className="w-20 font-medium">{prettyTime(a.time)}</span>
                      <span className="min-w-32 flex-1">{store.patientName(a.patientId)}</span>
                      <span className="min-w-32 flex-1 text-muted-foreground">
                        {store.doctorName(a.doctorId)}
                      </span>
                      {a.source === "ai-waitlist" && (
                        <Badge className="border-transparent bg-ai-soft text-ai">AI waitlist</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {band.label} risk
                      </Badge>
                      <StatusBadge status={a.status} />
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "waitlist" && <ManageWaitlist />}

      {tab === "ai" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle title="Patient load analytics & AI prediction" subtitle="Forecast demand and optimise the day" />
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {store.next14.map((d) => (
                  <SelectItem key={d} value={d}>{prettyDate(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-4">
              <p className="mb-3 font-display text-sm font-semibold">
                Predicted vs booked demand · {prettyDate(date)}
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="hour" fontSize={11} stroke="var(--color-muted-foreground)" />
                    <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                    <Tooltip />
                    <Line type="monotone" dataKey="capacity" stroke="var(--color-chart-4)" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="booked" stroke="var(--color-chart-1)" strokeWidth={2} />
                    <Line type="monotone" dataKey="predicted" stroke="var(--color-chart-3)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Dashed line = capacity · solid teal = confirmed bookings · purple = AI predicted demand
              </p>
            </CardContent>
          </Card>

          <AiPanel title="Optimisation recommendations" subtitle="Spread load and cut average waiting time">
            <ul className="space-y-2 text-sm">
              {tips.map((t) => (
                <li key={t} className="rounded-lg bg-card/80 p-3">{t}</li>
              ))}
            </ul>
          </AiPanel>

          <AiPanel title="High no-show risk appointments" subtitle="Send confirmation calls to these patients first">
            <div className="space-y-2">
              {store.appointments
                .filter((a) => a.status === "confirmed" && a.date >= store.today)
                .map((a) => {
                  const patient = store.patients.find((p) => p.id === a.patientId);
                  return { a, risk: patient ? noShowRisk(patient, a) : 0 };
                })
                .sort((x, y) => y.risk - x.risk)
                .slice(0, 5)
                .map(({ a, risk }) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-card/80 p-3 text-sm">
                    <span>
                      {store.patientName(a.patientId)} · {store.doctorName(a.doctorId)}
                    </span>
                    <span className="text-muted-foreground">
                      {prettyDate(a.date)} {prettyTime(a.time)}
                    </span>
                    <Badge variant="outline" className="border-destructive/40 text-destructive">
                      {risk}% risk
                    </Badge>
                  </div>
                ))}
            </div>
          </AiPanel>
        </div>
      )}
    </AppShell>
  );
}

function ManageDoctors() {
  const store = useMediCare();
  const [form, setForm] = useState({ name: "", departmentId: store.departments[0]?.id ?? "", specialization: "" });

  return (
    <div className="space-y-6">
      <SectionTitle title="Manage doctors" subtitle="Add specialists and review their OPD schedules" />
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. …" />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {store.departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Specialisation</Label>
            <Input
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              placeholder="e.g. Rheumatology"
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error("Enter the doctor's name");
                  return;
                }
                store.addDoctor({
                  name: form.name,
                  departmentId: form.departmentId,
                  specialization: form.specialization || "Consultant",
                  qualification: "MBBS, MD",
                  experience: 5,
                  rating: 4.5,
                  fee: 600,
                  languages: ["English"],
                  bio: "Newly onboarded consultant at MediCare.",
                  workingHours: { start: "10:00", end: "16:00" },
                  offDays: [0],
                  slotMinutes: 30,
                  avgConsultMinutes: 20,
                });
                setForm({ ...form, name: "", specialization: "" });
                toast.success("Doctor added");
              }}
            >
              <UserPlus className="size-4" /> Add doctor
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {store.doctors.map((d) => {
          const slots = daySlotInfo(d, store.today, store.appointments, store.blocked);
          return (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.specialization} · {store.departmentName(d.departmentId)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      store.removeDoctor(d.id);
                      toast.success("Doctor removed");
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  OPD {prettyTime(d.workingHours.start)} – {prettyTime(d.workingHours.end)} ·{" "}
                  {slots.filter((s) => s.status === "booked").length}/{slots.length || 0} booked today
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {slots.map((s) => (
                    <span
                      key={s.time}
                      className={`h-2.5 w-4 rounded-full ${
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
  );
}

function ManageDepartments() {
  const store = useMediCare();
  const [form, setForm] = useState({ name: "", description: "", floor: "" });

  return (
    <div className="space-y-6">
      <SectionTitle title="Manage departments" subtitle="Specialities offered by the hospital" />
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
          <Input placeholder="Department name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input placeholder="Location (Block · Floor)" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Enter a department name");
                return;
              }
              store.addDepartment({
                name: form.name,
                description: form.description || "New speciality at MediCare.",
                floor: form.floor || "Block A · Floor 1",
              });
              setForm({ name: "", description: "", floor: "" });
              toast.success("Department added");
            }}
          >
            Add department
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {store.departments.map((dep) => (
          <Card key={dep.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{dep.name}</p>
                  <p className="text-xs text-muted-foreground">{dep.floor}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => store.removeDepartment(dep.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{dep.description}</p>
              <p className="mt-3 text-xs">
                {store.doctors.filter((d) => d.departmentId === dep.id).length} doctors
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ManageWaitlist() {
  const store = useMediCare();

  return (
    <div className="space-y-6">
      <SectionTitle title="Waiting list" subtitle="Auto-offer cancelled slots to waiting patients" />
      <div className="space-y-3">
        {store.waitlist.length === 0 && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No patients waiting.</CardContent></Card>
        )}
        {store.waitlist.map((w) => {
          const doctor = store.doctors.find((d) => d.id === w.doctorId);
          const free = doctor
            ? daySlotInfo(doctor, w.preferredDate, store.appointments, store.blocked).filter(
                (s) => s.status === "available",
              )
            : [];
          const best = free[0];
          return (
            <Card key={w.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-40 flex-1">
                  <p className="font-medium">{store.patientName(w.patientId)}</p>
                  <p className="text-xs text-muted-foreground">
                    {doctor?.name} · prefers {w.preferredWindow} on {prettyDate(w.preferredDate)}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">{w.status}</Badge>
                {best && w.status === "waiting" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      store.offerWaitlistSlot(w.id, w.preferredDate, best.time);
                      toast.success(`Slot ${prettyTime(best.time)} offered and booked`);
                    }}
                  >
                    <Sparkles className="size-4" /> Offer {prettyTime(best.time)}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {w.status === "waiting" ? "No free slot yet" : "Allocated"}
                  </span>
                )}
                <Button size="icon" variant="ghost" onClick={() => store.removeWaitlist(w.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
