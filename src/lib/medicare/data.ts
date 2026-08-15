export type Role = "patient" | "doctor" | "admin";

export type Department = {
  id: string;
  name: string;
  description: string;
  floor: string;
};

export type Doctor = {
  id: string;
  name: string;
  departmentId: string;
  specialization: string;
  qualification: string;
  experience: number;
  rating: number;
  fee: number;
  languages: string[];
  bio: string;
  workingHours: { start: string; end: string };
  offDays: number[]; // 0 = Sunday
  slotMinutes: number;
  avgConsultMinutes: number;
};

export type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  bloodGroup: string;
  pastNoShows: number;
  pastVisits: number;
  preferredWindow: PreferredWindow;
};

export type PreferredWindow = "morning" | "afternoon" | "evening" | "any";

export type AppointmentStatus =
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "no-show";

export type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  status: AppointmentStatus;
  reason: string;
  createdAt: string;
  source: "patient" | "ai-waitlist" | "front-desk";
};

export type BlockedSlot = { doctorId: string; date: string; time: string; note: string };

export type WaitlistEntry = {
  id: string;
  patientId: string;
  doctorId: string;
  preferredDate: string;
  preferredWindow: PreferredWindow;
  createdAt: string;
  status: "waiting" | "offered" | "booked";
};

export type Notification = {
  id: string;
  audience: Role;
  patientId?: string;
  doctorId?: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  kind: "info" | "ai" | "alert" | "success";
};

export const departments: Department[] = [
  {
    id: "dep-cardio",
    name: "Cardiology",
    description: "Heart, blood vessels and interventional cardiac care.",
    floor: "Block A · Floor 3",
  },
  {
    id: "dep-ortho",
    name: "Orthopaedics",
    description: "Bones, joints, sports injuries and replacement surgery.",
    floor: "Block B · Floor 2",
  },
  {
    id: "dep-neuro",
    name: "Neurology",
    description: "Brain, spine and nervous system disorders.",
    floor: "Block A · Floor 5",
  },
  {
    id: "dep-peds",
    name: "Paediatrics",
    description: "Newborn, child and adolescent health.",
    floor: "Block C · Floor 1",
  },
  {
    id: "dep-derma",
    name: "Dermatology",
    description: "Skin, hair and nail treatments including cosmetology.",
    floor: "Block C · Floor 2",
  },
  {
    id: "dep-gen",
    name: "General Medicine",
    description: "Primary care, fever clinic and preventive health checks.",
    floor: "Block A · Floor 1",
  },
];

export const doctors: Doctor[] = [
  {
    id: "doc-1",
    name: "Dr. Ramesh Iyer",
    departmentId: "dep-cardio",
    specialization: "Interventional Cardiologist",
    qualification: "MBBS, MD, DM (Cardiology)",
    experience: 18,
    rating: 4.8,
    fee: 900,
    languages: ["English", "Tamil", "Hindi"],
    bio: "Specialises in angioplasty, heart failure management and preventive cardiology with over 6,000 procedures.",
    workingHours: { start: "09:00", end: "15:00" },
    offDays: [0],
    slotMinutes: 30,
    avgConsultMinutes: 22,
  },
  {
    id: "doc-2",
    name: "Dr. Sneha Kulkarni",
    departmentId: "dep-cardio",
    specialization: "Paediatric Cardiologist",
    qualification: "MBBS, MD, Fellowship (Paed. Cardiology)",
    experience: 11,
    rating: 4.7,
    fee: 750,
    languages: ["English", "Marathi", "Hindi"],
    bio: "Focuses on congenital heart disease, foetal echocardiography and child cardiac rehabilitation.",
    workingHours: { start: "10:00", end: "16:00" },
    offDays: [0, 3],
    slotMinutes: 20,
    avgConsultMinutes: 16,
  },
  {
    id: "doc-3",
    name: "Dr. Arjun Menon",
    departmentId: "dep-ortho",
    specialization: "Joint Replacement Surgeon",
    qualification: "MBBS, MS (Ortho), FRCS",
    experience: 15,
    rating: 4.6,
    fee: 800,
    languages: ["English", "Malayalam"],
    bio: "Robotic knee and hip replacement, sports injury reconstruction and arthroscopy.",
    workingHours: { start: "08:30", end: "13:30" },
    offDays: [0, 6],
    slotMinutes: 30,
    avgConsultMinutes: 25,
  },
  {
    id: "doc-4",
    name: "Dr. Fatima Sheikh",
    departmentId: "dep-neuro",
    specialization: "Neurologist · Epilepsy",
    qualification: "MBBS, MD, DM (Neurology)",
    experience: 13,
    rating: 4.9,
    fee: 950,
    languages: ["English", "Urdu", "Hindi"],
    bio: "Epilepsy, stroke and movement disorder clinic with advanced EEG interpretation.",
    workingHours: { start: "11:00", end: "17:00" },
    offDays: [0],
    slotMinutes: 30,
    avgConsultMinutes: 26,
  },
  {
    id: "doc-5",
    name: "Dr. Meera Nair",
    departmentId: "dep-peds",
    specialization: "Paediatrician · Neonatology",
    qualification: "MBBS, MD (Paediatrics)",
    experience: 9,
    rating: 4.8,
    fee: 600,
    languages: ["English", "Malayalam", "Hindi"],
    bio: "Newborn care, immunisation schedules and childhood nutrition counselling.",
    workingHours: { start: "09:00", end: "14:00" },
    offDays: [0],
    slotMinutes: 20,
    avgConsultMinutes: 14,
  },
  {
    id: "doc-6",
    name: "Dr. Vikram Desai",
    departmentId: "dep-derma",
    specialization: "Dermatologist · Cosmetology",
    qualification: "MBBS, MD (DVL)",
    experience: 7,
    rating: 4.5,
    fee: 650,
    languages: ["English", "Gujarati", "Hindi"],
    bio: "Acne, pigmentation, hair restoration and laser procedures.",
    workingHours: { start: "12:00", end: "18:00" },
    offDays: [0, 2],
    slotMinutes: 20,
    avgConsultMinutes: 15,
  },
  {
    id: "doc-7",
    name: "Dr. Kavita Rao",
    departmentId: "dep-gen",
    specialization: "General Physician · Diabetology",
    qualification: "MBBS, MD (General Medicine)",
    experience: 12,
    rating: 4.6,
    fee: 500,
    languages: ["English", "Kannada", "Hindi"],
    bio: "Diabetes, hypertension, thyroid disorders and annual preventive health checks.",
    workingHours: { start: "08:00", end: "14:00" },
    offDays: [0],
    slotMinutes: 15,
    avgConsultMinutes: 12,
  },
  {
    id: "doc-8",
    name: "Dr. Aditya Bansal",
    departmentId: "dep-ortho",
    specialization: "Spine Surgeon",
    qualification: "MBBS, MS (Ortho), Fellowship (Spine)",
    experience: 16,
    rating: 4.7,
    fee: 850,
    languages: ["English", "Hindi"],
    bio: "Minimally invasive spine surgery, disc replacement and scoliosis correction.",
    workingHours: { start: "10:00", end: "16:00" },
    offDays: [0, 5],
    slotMinutes: 30,
    avgConsultMinutes: 24,
  },
];

export const patients: Patient[] = [
  {
    id: "pat-1",
    name: "Ananya Sharma",
    age: 29,
    gender: "Female",
    phone: "+91 9845 210 118",
    email: "ananya.sharma@example.com",
    bloodGroup: "O+",
    pastNoShows: 0,
    pastVisits: 6,
    preferredWindow: "morning",
  },
  {
    id: "pat-2",
    name: "Rohit Verma",
    age: 41,
    gender: "Male",
    phone: "+91 99880 44120",
    email: "rohit.verma@example.com",
    bloodGroup: "B+",
    pastNoShows: 2,
    pastVisits: 9,
    preferredWindow: "evening",
  },
  {
    id: "pat-3",
    name: "Lakshmi Pillai",
    age: 63,
    gender: "Female",
    phone: "+91 90071 77234",
    email: "lakshmi.pillai@example.com",
    bloodGroup: "A+",
    pastNoShows: 1,
    pastVisits: 14,
    preferredWindow: "morning",
  },
  {
    id: "pat-4",
    name: "Imran Qureshi",
    age: 35,
    gender: "Male",
    phone: "+91 97411 66290",
    email: "imran.q@example.com",
    bloodGroup: "AB+",
    pastNoShows: 3,
    pastVisits: 5,
    preferredWindow: "afternoon",
  },
  {
    id: "pat-5",
    name: "Divya Menon",
    age: 7,
    gender: "Female",
    phone: "+91 96320 51188",
    email: "menon.family@example.com",
    bloodGroup: "O-",
    pastNoShows: 0,
    pastVisits: 11,
    preferredWindow: "morning",
  },
  {
    id: "pat-6",
    name: "Suresh Babu",
    age: 52,
    gender: "Male",
    phone: "+91 93450 71002",
    email: "suresh.babu@example.com",
    bloodGroup: "B-",
    pastNoShows: 1,
    pastVisits: 8,
    preferredWindow: "any",
  },
];

export const reasons = [
  "Follow-up consultation",
  "Chest discomfort review",
  "Knee pain evaluation",
  "Headache & dizziness",
  "Child vaccination",
  "Skin allergy",
  "Diabetes review",
  "Annual health check",
  "Back pain assessment",
  "Report discussion",
];

/* ---------- date helpers ---------- */

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseISODate(iso: string) {
  const [y = 1970, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function prettyDate(iso: string) {
  return parseISODate(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function prettyTime(time: string) {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function minutesOf(time: string) {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
}

export function timeOf(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function windowOf(time: string): Exclude<PreferredWindow, "any"> {
  const m = minutesOf(time);
  if (m < 12 * 60) return "morning";
  if (m < 16 * 60) return "afternoon";
  return "evening";
}

export function generateSlots(doctor: Doctor, date: string): string[] {
  const day = parseISODate(date).getDay();
  if (doctor.offDays.includes(day)) return [];
  const out: string[] = [];
  for (
    let m = minutesOf(doctor.workingHours.start);
    m + doctor.slotMinutes <= minutesOf(doctor.workingHours.end);
    m += doctor.slotMinutes
  ) {
    out.push(timeOf(m));
  }
  return out;
}

/* ---------- seed appointments ---------- */

export function seedAppointments(today: Date): Appointment[] {
  const list: Appointment[] = [];
  let n = 1;
  const push = (
    patientId: string,
    doctorId: string,
    dayOffset: number,
    time: string,
    status: AppointmentStatus,
    reason: string,
  ) => {
    list.push({
      id: `apt-${String(n++).padStart(3, "0")}`,
      patientId,
      doctorId,
      date: toISODate(addDays(today, dayOffset)),
      time,
      status,
      reason,
      createdAt: toISODate(addDays(today, dayOffset - 6)),
      source: "patient",
    });
  };

  // history
  push("pat-1", "doc-7", -21, "09:15", "completed", "Annual health check");
  push("pat-1", "doc-1", -12, "10:00", "completed", "Chest discomfort review");
  push("pat-1", "doc-6", -6, "13:20", "cancelled", "Skin allergy");
  push("pat-2", "doc-3", -9, "09:00", "no-show", "Knee pain evaluation");
  push("pat-3", "doc-4", -14, "11:30", "completed", "Headache & dizziness");
  push("pat-4", "doc-8", -4, "10:30", "no-show", "Back pain assessment");
  push("pat-5", "doc-5", -8, "09:40", "completed", "Child vaccination");
  push("pat-6", "doc-7", -3, "08:30", "completed", "Diabetes review");

  // today
  push("pat-3", "doc-1", 0, "09:00", "confirmed", "Follow-up consultation");
  push("pat-2", "doc-1", 0, "09:30", "confirmed", "Chest discomfort review");
  push("pat-6", "doc-1", 0, "11:00", "confirmed", "Report discussion");
  push("pat-4", "doc-1", 0, "11:30", "confirmed", "Follow-up consultation");
  push("pat-5", "doc-5", 0, "09:20", "confirmed", "Child vaccination");
  push("pat-1", "doc-7", 0, "08:45", "completed", "Diabetes review");
  push("pat-2", "doc-6", 0, "12:40", "confirmed", "Skin allergy");
  push("pat-3", "doc-4", 0, "11:30", "confirmed", "Headache & dizziness");

  // upcoming
  push("pat-1", "doc-1", 2, "10:00", "confirmed", "Follow-up consultation");
  push("pat-1", "doc-4", 5, "11:30", "confirmed", "Headache & dizziness");
  push("pat-2", "doc-3", 1, "09:30", "confirmed", "Knee pain evaluation");
  push("pat-4", "doc-8", 3, "10:30", "confirmed", "Back pain assessment");
  push("pat-6", "doc-7", 1, "08:15", "confirmed", "Diabetes review");
  push("pat-5", "doc-5", 4, "10:00", "confirmed", "Child vaccination");
  push("pat-3", "doc-1", 1, "09:00", "confirmed", "Report discussion");
  push("pat-2", "doc-1", 1, "10:30", "confirmed", "Follow-up consultation");
  push("pat-4", "doc-1", 2, "09:30", "confirmed", "Chest discomfort review");
  push("pat-6", "doc-4", 2, "11:00", "confirmed", "Report discussion");
  push("pat-5", "doc-6", 2, "12:20", "confirmed", "Skin allergy");
  push("pat-3", "doc-7", 3, "08:00", "confirmed", "Diabetes review");
  push("pat-2", "doc-7", 3, "08:15", "cancelled", "Annual health check");
  push("pat-4", "doc-5", 5, "09:00", "confirmed", "Child vaccination");

  return list;
}

export function seedBlocked(today: Date): BlockedSlot[] {
  return [
    { doctorId: "doc-1", date: toISODate(addDays(today, 0)), time: "13:00", note: "Cath lab procedure" },
    { doctorId: "doc-1", date: toISODate(addDays(today, 0)), time: "13:30", note: "Cath lab procedure" },
    { doctorId: "doc-4", date: toISODate(addDays(today, 2)), time: "16:00", note: "EEG review" },
    { doctorId: "doc-3", date: toISODate(addDays(today, 1)), time: "12:00", note: "OT block" },
  ];
}

export function seedWaitlist(today: Date): WaitlistEntry[] {
  return [
    {
      id: "wl-1",
      patientId: "pat-6",
      doctorId: "doc-1",
      preferredDate: toISODate(addDays(today, 0)),
      preferredWindow: "morning",
      createdAt: toISODate(addDays(today, -1)),
      status: "waiting",
    },
    {
      id: "wl-2",
      patientId: "pat-4",
      doctorId: "doc-4",
      preferredDate: toISODate(addDays(today, 1)),
      preferredWindow: "afternoon",
      createdAt: toISODate(addDays(today, -1)),
      status: "waiting",
    },
    {
      id: "wl-3",
      patientId: "pat-2",
      doctorId: "doc-3",
      preferredDate: toISODate(addDays(today, 2)),
      preferredWindow: "morning",
      createdAt: toISODate(today),
      status: "waiting",
    },
  ];
}

export function seedNotifications(): Notification[] {
  const now = new Date();
  const t = (mins: number) => new Date(now.getTime() - mins * 60000).toISOString();
  return [
    {
      id: "ntf-1",
      audience: "patient",
      patientId: "pat-1",
      title: "Appointment confirmed",
      message: "Your appointment with Dr. Ramesh Iyer is confirmed. Please arrive 10 minutes early.",
      createdAt: t(90),
      read: false,
      kind: "success",
    },
    {
      id: "ntf-2",
      audience: "patient",
      patientId: "pat-1",
      title: "AI slot suggestion",
      message:
        "A 10:00 AM slot with Dr. Fatima Sheikh has a predicted wait of only 6 minutes — the best match for your morning preference.",
      createdAt: t(240),
      read: false,
      kind: "ai",
    },
    {
      id: "ntf-3",
      audience: "doctor",
      doctorId: "doc-1",
      title: "High patient load predicted",
      message: "Tomorrow 09:00–11:00 is forecast at 92% capacity. Consider opening two extra slots.",
      createdAt: t(300),
      read: false,
      kind: "alert",
    },
    {
      id: "ntf-4",
      audience: "admin",
      title: "Waiting list matched",
      message: "2 cancelled slots were auto-offered to waiting-list patients this morning.",
      createdAt: t(420),
      read: true,
      kind: "ai",
    },
  ];
}
