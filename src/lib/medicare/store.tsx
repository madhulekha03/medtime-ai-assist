import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addDays,
  departments as seedDepartments,
  doctors as seedDoctors,
  patients as seedPatients,
  seedAppointments,
  seedBlocked,
  seedNotifications,
  seedWaitlist,
  toISODate,
  type Appointment,
  type AppointmentStatus,
  type BlockedSlot,
  type Department,
  type Doctor,
  type Notification,
  type Patient,
  type PreferredWindow,
  type Role,
  type WaitlistEntry,
} from "./data";

type Session = { role: Role; patientId?: string; doctorId?: string; name: string };

type State = {
  departments: Department[];
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  blocked: BlockedSlot[];
  waitlist: WaitlistEntry[];
  notifications: Notification[];
  session: Session | null;
};

const STORAGE_KEY = "medicare-state-v1";

function initialState(): State {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    departments: seedDepartments,
    doctors: seedDoctors,
    patients: seedPatients,
    appointments: seedAppointments(today),
    blocked: seedBlocked(today),
    waitlist: seedWaitlist(today),
    notifications: seedNotifications(),
    session: null,
  };
}

type Ctx = State & {
  today: string;
  next14: string[];
  setSession: (s: Session | null) => void;
  currentPatient: Patient | null;
  currentDoctor: Doctor | null;
  registerPatient: (input: {
    name: string;
    age: number;
    gender: string;
    phone: string;
    email: string;
    preferredWindow: PreferredWindow;
  }) => Patient;
  book: (input: {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    reason: string;
    source?: Appointment["source"];
  }) => Appointment;
  cancel: (id: string) => void;
  reschedule: (id: string, date: string, time: string, by?: "patient" | "doctor") => void;
  setStatus: (id: string, status: AppointmentStatus) => void;
  toggleBlock: (doctorId: string, date: string, time: string) => void;
  setWorkingHours: (doctorId: string, start: string, end: string, offDays: number[]) => void;
  joinWaitlist: (input: {
    patientId: string;
    doctorId: string;
    preferredDate: string;
    preferredWindow: PreferredWindow;
  }) => void;
  offerWaitlistSlot: (entryId: string, date: string, time: string) => void;
  removeWaitlist: (entryId: string) => void;
  addDoctor: (d: Omit<Doctor, "id">) => void;
  removeDoctor: (id: string) => void;
  addDepartment: (d: Omit<Department, "id">) => void;
  removeDepartment: (id: string) => void;
  notify: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markAllRead: (audience: Role, id?: string) => void;
  resetDemo: () => void;
  patientName: (id: string) => string;
  doctorName: (id: string) => string;
  departmentName: (id: string) => string;
};

const StoreContext = createContext<Ctx | null>(null);

export function MediCareProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State & { seededOn?: string };
        if (parsed.seededOn === toISODate(new Date())) setState(parsed);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...state, seededOn: toISODate(new Date()) }),
      );
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const today = toISODate(new Date());
  const next14 = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => toISODate(addDays(base, i)));
  }, []);

  const notify = useCallback((n: Omit<Notification, "id" | "createdAt" | "read">) => {
    setState((s) => ({
      ...s,
      notifications: [
        { ...n, id: `ntf-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), read: false },
        ...s.notifications,
      ],
    }));
  }, []);

  const value: Ctx = {
    ...state,
    today,
    next14,
    setSession: (session) => setState((s) => ({ ...s, session })),
    currentPatient: state.patients.find((p) => p.id === state.session?.patientId) ?? null,
    currentDoctor: state.doctors.find((d) => d.id === state.session?.doctorId) ?? null,
    registerPatient: (input) => {
      const patient: Patient = {
        id: `pat-${Math.random().toString(36).slice(2, 7)}`,
        name: input.name,
        age: input.age,
        gender: input.gender,
        phone: input.phone,
        email: input.email,
        bloodGroup: "—",
        pastNoShows: 0,
        pastVisits: 0,
        preferredWindow: input.preferredWindow,
      };
      setState((s) => ({ ...s, patients: [...s.patients, patient] }));
      return patient;
    },
    book: ({ patientId, doctorId, date, time, reason, source = "patient" }) => {
      const apt: Appointment = {
        id: `apt-${Math.random().toString(36).slice(2, 8)}`,
        patientId,
        doctorId,
        date,
        time,
        status: "confirmed",
        reason,
        createdAt: toISODate(new Date()),
        source,
      };
      setState((s) => ({ ...s, appointments: [...s.appointments, apt] }));
      notify({
        audience: "patient",
        patientId,
        title: "Appointment confirmed",
        message: `Booked for ${date} at ${time}. A reminder will be sent 24 hours before.`,
        kind: "success",
      });
      notify({
        audience: "doctor",
        doctorId,
        title: "New appointment",
        message: `A new appointment was added on ${date} at ${time}.`,
        kind: "info",
      });
      return apt;
    },
    cancel: (id) => {
      setState((s) => {
        const apt = s.appointments.find((a) => a.id === id);
        if (!apt) return s;
        return {
          ...s,
          appointments: s.appointments.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)),
        };
      });
      notify({
        audience: "admin",
        title: "Appointment cancelled",
        message: "A slot was released and is now available for waiting-list matching.",
        kind: "alert",
      });
    },
    reschedule: (id, date, time, by = "patient") => {
      setState((s) => ({
        ...s,
        appointments: s.appointments.map((a) =>
          a.id === id ? { ...a, date, time, status: "rescheduled" } : a,
        ),
      }));
      const apt = state.appointments.find((a) => a.id === id);
      if (apt) {
        notify({
          audience: "patient",
          patientId: apt.patientId,
          title: by === "doctor" ? "Appointment moved by doctor" : "Appointment rescheduled",
          message: `New timing: ${date} at ${time}.`,
          kind: by === "doctor" ? "alert" : "info",
        });
      }
    },
    setStatus: (id, status) =>
      setState((s) => ({
        ...s,
        appointments: s.appointments.map((a) => (a.id === id ? { ...a, status } : a)),
      })),
    toggleBlock: (doctorId, date, time) =>
      setState((s) => {
        const exists = s.blocked.some(
          (b) => b.doctorId === doctorId && b.date === date && b.time === time,
        );
        return {
          ...s,
          blocked: exists
            ? s.blocked.filter(
                (b) => !(b.doctorId === doctorId && b.date === date && b.time === time),
              )
            : [...s.blocked, { doctorId, date, time, note: "Blocked by doctor" }],
        };
      }),
    setWorkingHours: (doctorId, start, end, offDays) =>
      setState((s) => ({
        ...s,
        doctors: s.doctors.map((d) =>
          d.id === doctorId ? { ...d, workingHours: { start, end }, offDays } : d,
        ),
      })),
    joinWaitlist: (input) => {
      setState((s) => ({
        ...s,
        waitlist: [
          ...s.waitlist,
          {
            ...input,
            id: `wl-${Math.random().toString(36).slice(2, 7)}`,
            createdAt: toISODate(new Date()),
            status: "waiting",
          },
        ],
      }));
      notify({
        audience: "patient",
        patientId: input.patientId,
        title: "Added to waiting list",
        message: "We'll offer you the first cancelled slot that matches your preference.",
        kind: "ai",
      });
    },
    offerWaitlistSlot: (entryId, date, time) => {
      const entry = state.waitlist.find((w) => w.id === entryId);
      setState((s) => ({
        ...s,
        waitlist: s.waitlist.map((w) => (w.id === entryId ? { ...w, status: "booked" } : w)),
        appointments: entry
          ? [
              ...s.appointments,
              {
                id: `apt-${Math.random().toString(36).slice(2, 8)}`,
                patientId: entry.patientId,
                doctorId: entry.doctorId,
                date,
                time,
                status: "confirmed" as AppointmentStatus,
                reason: "Waiting-list allocation",
                createdAt: toISODate(new Date()),
                source: "ai-waitlist" as const,
              },
            ]
          : s.appointments,
      }));
      if (entry) {
        notify({
          audience: "patient",
          patientId: entry.patientId,
          title: "Slot offered from waiting list",
          message: `A cancelled slot on ${date} at ${time} has been assigned to you.`,
          kind: "ai",
        });
      }
    },
    removeWaitlist: (entryId) =>
      setState((s) => ({ ...s, waitlist: s.waitlist.filter((w) => w.id !== entryId) })),
    addDoctor: (d) =>
      setState((s) => ({
        ...s,
        doctors: [...s.doctors, { ...d, id: `doc-${Math.random().toString(36).slice(2, 7)}` }],
      })),
    removeDoctor: (id) =>
      setState((s) => ({ ...s, doctors: s.doctors.filter((d) => d.id !== id) })),
    addDepartment: (d) =>
      setState((s) => ({
        ...s,
        departments: [...s.departments, { ...d, id: `dep-${Math.random().toString(36).slice(2, 7)}` }],
      })),
    removeDepartment: (id) =>
      setState((s) => ({ ...s, departments: s.departments.filter((d) => d.id !== id) })),
    notify,
    markAllRead: (audience, id) =>
      setState((s) => ({
        ...s,
        notifications: s.notifications.map((n) =>
          n.audience === audience &&
          (!id || n.patientId === id || n.doctorId === id || (!n.patientId && !n.doctorId))
            ? { ...n, read: true }
            : n,
        ),
      })),
    resetDemo: () => setState(initialState()),
    patientName: (id) => state.patients.find((p) => p.id === id)?.name ?? "Unknown patient",
    doctorName: (id) => state.doctors.find((d) => d.id === id)?.name ?? "Unknown doctor",
    departmentName: (id) => state.departments.find((d) => d.id === id)?.name ?? "General",
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useMediCare() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useMediCare must be used inside MediCareProvider");
  return ctx;
}
