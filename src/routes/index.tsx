import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  BrainCircuit,
  CalendarClock,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useMediCare } from "@/lib/medicare/store";
import type { PreferredWindow } from "@/lib/medicare/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediCare — AI-Powered Hospital Appointments" },
      {
        name: "description",
        content:
          "Book, reschedule and manage multispeciality hospital appointments with AI slot recommendations, demand prediction and waiting-list automation.",
      },
      { property: "og:title", content: "MediCare — AI-Powered Hospital Appointments" },
      {
        property: "og:description",
        content:
          "Book, reschedule and manage multispeciality hospital appointments with AI slot recommendations, demand prediction and waiting-list automation.",
      },
    ],
  }),
  component: Landing,
});

const aiHighlights = [
  { icon: <BrainCircuit className="size-4" />, text: "Best-slot recommendation with predicted waiting time" },
  { icon: <Activity className="size-4" />, text: "High-demand period and no-show risk prediction" },
  { icon: <CalendarClock className="size-4" />, text: "Auto alternatives and waiting-list slot offers" },
  { icon: <ShieldCheck className="size-4" />, text: "Conflict detection and day-load optimisation" },
];

function Landing() {
  const { patients, doctors, setSession, registerPatient } = useMediCare();
  const navigate = useNavigate();
  const [regOpen, setRegOpen] = useState(false);
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Female",
    phone: "",
    email: "",
    preferredWindow: "morning" as PreferredWindow,
  });

  const enterPatient = (id: string, name: string) => {
    setSession({ role: "patient", patientId: id, name });
    navigate({ to: "/patient" });
  };

  return (
    <div className="min-h-screen">
      <section className="gradient-hero relative overflow-hidden text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-foreground/15">
                <HeartPulse className="size-6" />
              </span>
              <div>
                <p className="font-display text-lg leading-none font-bold">MediCare</p>
                <p className="text-xs opacity-80">Multispeciality Hospital · Bengaluru</p>
              </div>
            </div>

            <h1 className="mt-8 max-w-xl text-4xl leading-[1.1] font-bold sm:text-5xl">
              Smarter hospital appointments, less time in the waiting room.
            </h1>
            <p className="mt-4 max-w-xl text-base opacity-90">
              MediCare uses AI to match patients with the right slot, forecast OPD demand, resolve
              scheduling conflicts and instantly reuse cancelled appointments.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {aiHighlights.map((h) => (
                <li key={h.text} className="flex items-start gap-2 text-sm opacity-95">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-primary-foreground/15">
                    {h.icon}
                  </span>
                  {h.text}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="font-display text-2xl font-bold">6</p>
                <p className="opacity-80">Departments</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold">8</p>
                <p className="opacity-80">Specialists</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold">32%</p>
                <p className="opacity-80">Lower average wait</p>
              </div>
            </div>
          </div>

          <Card className="self-start shadow-float">
            <CardContent className="p-5">
              <h2 className="font-display text-lg font-semibold">Sign in to the prototype</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a role to explore the full workflow with realistic sample data.
              </p>

              <Tabs defaultValue="patient" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="patient">Patient</TabsTrigger>
                  <TabsTrigger value="doctor">Doctor</TabsTrigger>
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                </TabsList>

                <TabsContent value="patient" className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Registered patient</Label>
                    <Select value={patientId} onValueChange={setPatientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} · {p.age}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      const p = patients.find((x) => x.id === patientId);
                      if (p) enterPatient(p.id, p.name);
                    }}
                  >
                    <Users className="size-4" /> Continue as patient
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setRegOpen(true)}>
                    New patient registration
                  </Button>
                </TabsContent>

                <TabsContent value="doctor" className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Doctor account</Label>
                    <Select value={doctorId} onValueChange={setDoctorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      const d = doctors.find((x) => x.id === doctorId);
                      if (!d) return;
                      setSession({ role: "doctor", doctorId: d.id, name: d.name });
                      navigate({ to: "/doctor" });
                    }}
                  >
                    <Stethoscope className="size-4" /> Continue as doctor
                  </Button>
                </TabsContent>

                <TabsContent value="admin" className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Hospital administrator access to doctors, departments, analytics and AI demand
                    forecasting.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSession({ role: "admin", name: "Priya Raghavan" });
                      navigate({ to: "/admin" });
                    }}
                  >
                    <ShieldCheck className="size-4" /> Continue as admin
                  </Button>
                </TabsContent>
              </Tabs>

              <p className="mt-4 text-[11px] text-muted-foreground">
                Academic prototype — no real medical advice, diagnosis or treatment.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog open={regOpen} onOpenChange={setRegOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Patient registration</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Full name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Nikhil Rao"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Age</Label>
              <Input
                value={form.age}
                inputMode="numeric"
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Female", "Male", "Other"].map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Preferred appointment time</Label>
              <Select
                value={form.preferredWindow}
                onValueChange={(v) => setForm({ ...form, preferredWindow: v as PreferredWindow })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (before 12 PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12 – 4 PM)</SelectItem>
                  <SelectItem value="evening">Evening (after 4 PM)</SelectItem>
                  <SelectItem value="any">No preference</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="mt-2 w-full"
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Please enter the patient name");
                return;
              }
              const p = registerPatient({
                name: form.name.trim(),
                age: Number(form.age) || 30,
                gender: form.gender,
                phone: form.phone || "+91 90000 00000",
                email: form.email || "patient@example.com",
                preferredWindow: form.preferredWindow,
              });
              toast.success("Registration complete");
              setRegOpen(false);
              enterPatient(p.id, p.name);
            }}
          >
            Register & continue
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
