import {
  generateSlots,
  minutesOf,
  parseISODate,
  windowOf,
  type Appointment,
  type BlockedSlot,
  type Doctor,
  type Patient,
  type PreferredWindow,
} from "./data";

/** Deterministic pseudo-random in [0,1) from a string seed. */
function hash01(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export type SlotInfo = {
  time: string;
  status: "available" | "booked" | "blocked";
  predictedWait: number;
  loadScore: number;
};

export function bookedTimes(appointments: Appointment[], doctorId: string, date: string) {
  return appointments
    .filter(
      (a) =>
        a.doctorId === doctorId &&
        a.date === date &&
        (a.status === "confirmed" || a.status === "completed" || a.status === "rescheduled"),
    )
    .map((a) => a.time);
}

/**
 * AI wait-time model: queue build-up across the session + historical
 * peak-hour pressure + doctor consult duration variance.
 */
export function predictedWait(
  doctor: Doctor,
  date: string,
  time: string,
  appointments: Appointment[],
) {
  const slots = generateSlots(doctor, date);
  const index = Math.max(0, slots.indexOf(time));
  const booked = bookedTimes(appointments, doctor.id, date);
  const before = booked.filter((t) => minutesOf(t) < minutesOf(time)).length;
  const overrun = Math.max(0, doctor.avgConsultMinutes - doctor.slotMinutes + 4);
  const peak = peakPressure(time);
  const noise = hash01(`${doctor.id}${date}${time}`) * 6;
  const wait = before * overrun * 0.55 + index * 0.8 + peak * 9 + noise;
  return Math.round(Math.min(52, Math.max(2, wait)));
}

/** Historical hourly demand pressure (0–1) learned from arrival patterns. */
export function peakPressure(time: string) {
  const h = Math.floor(minutesOf(time) / 60);
  const curve: Record<number, number> = {
    8: 0.72,
    9: 0.95,
    10: 0.88,
    11: 0.7,
    12: 0.42,
    13: 0.3,
    14: 0.45,
    15: 0.6,
    16: 0.74,
    17: 0.66,
    18: 0.4,
  };
  return curve[h] ?? 0.35;
}

export function daySlotInfo(
  doctor: Doctor,
  date: string,
  appointments: Appointment[],
  blocked: BlockedSlot[],
): SlotInfo[] {
  const booked = new Set(bookedTimes(appointments, doctor.id, date));
  const blockedSet = new Set(
    blocked.filter((b) => b.doctorId === doctor.id && b.date === date).map((b) => b.time),
  );
  return generateSlots(doctor, date).map((time) => ({
    time,
    status: booked.has(time) ? "booked" : blockedSet.has(time) ? "blocked" : "available",
    predictedWait: predictedWait(doctor, date, time, appointments),
    loadScore: peakPressure(time),
  }));
}

export type Recommendation = {
  doctorId: string;
  date: string;
  time: string;
  predictedWait: number;
  score: number;
  reason: string;
};

/** Recommend the best appointment slots for a patient. */
export function recommendSlots(
  doctor: Doctor,
  dates: string[],
  preferred: PreferredWindow,
  appointments: Appointment[],
  blocked: BlockedSlot[],
  limit = 3,
): Recommendation[] {
  const candidates: Recommendation[] = [];
  dates.forEach((date, dayIdx) => {
    daySlotInfo(doctor, date, appointments, blocked)
      .filter((s) => s.status === "available")
      .forEach((s) => {
        const windowMatch = preferred === "any" || windowOf(s.time) === preferred ? 1 : 0;
        const score =
          100 - s.predictedWait * 1.6 - dayIdx * 5 + windowMatch * 22 - s.loadScore * 12;
        const bits: string[] = [];
        if (windowMatch) bits.push(`matches your ${preferred === "any" ? "flexible" : preferred} preference`);
        if (s.predictedWait <= 10) bits.push(`only ~${s.predictedWait} min predicted wait`);
        else bits.push(`~${s.predictedWait} min predicted wait`);
        if (s.loadScore < 0.5) bits.push("low OPD congestion");
        if (dayIdx === 0) bits.push("earliest availability");
        candidates.push({
          doctorId: doctor.id,
          date,
          time: s.time,
          predictedWait: s.predictedWait,
          score: Math.round(score),
          reason: bits.slice(0, 3).join(" · "),
        });
      });
  });
  return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Alternative slots when a doctor becomes unavailable or a conflict appears. */
export function alternativeSlots(
  doctor: Doctor,
  dates: string[],
  around: string,
  appointments: Appointment[],
  blocked: BlockedSlot[],
  limit = 4,
) {
  const target = minutesOf(around);
  return dates
    .flatMap((date) =>
      daySlotInfo(doctor, date, appointments, blocked)
        .filter((s) => s.status === "available")
        .map((s) => ({
          date,
          time: s.time,
          predictedWait: s.predictedWait,
          delta: Math.abs(minutesOf(s.time) - target),
        })),
    )
    .sort((a, b) => a.delta + a.predictedWait * 2 - (b.delta + b.predictedWait * 2))
    .slice(0, limit);
}

/** No-show risk from historical patterns. */
export function noShowRisk(patient: Patient, appointment: Appointment) {
  const historyRate = patient.pastVisits
    ? patient.pastNoShows / (patient.pastVisits + patient.pastNoShows)
    : 0.1;
  const windowPenalty = windowOf(appointment.time) === patient.preferredWindow ? -0.06 : 0.07;
  const earlyPenalty = minutesOf(appointment.time) < 9 * 60 ? 0.05 : 0;
  const leadTime =
    (parseISODate(appointment.date).getTime() - parseISODate(appointment.createdAt).getTime()) /
    86400000;
  const leadPenalty = leadTime > 10 ? 0.08 : 0;
  const noise = hash01(appointment.id) * 0.08;
  const risk = historyRate * 0.72 + windowPenalty + earlyPenalty + leadPenalty + noise + 0.06;
  return Math.round(Math.min(0.94, Math.max(0.03, risk)) * 100);
}

export function riskBand(risk: number) {
  if (risk >= 55) return { label: "High", tone: "destructive" as const };
  if (risk >= 30) return { label: "Medium", tone: "warning" as const };
  return { label: "Low", tone: "success" as const };
}

/** Predicted demand per hour across the hospital for a given date. */
export function demandForecast(
  date: string,
  doctorList: Doctor[],
  appointments: Appointment[],
): { hour: string; booked: number; predicted: number; capacity: number }[] {
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  return hours.map((h) => {
    const label = `${String(h).padStart(2, "0")}:00`;
    let capacity = 0;
    doctorList.forEach((d) => {
      capacity += generateSlots(d, date).filter((t) => Math.floor(minutesOf(t) / 60) === h).length;
    });
    const booked = appointments.filter(
      (a) =>
        a.date === date &&
        (a.status === "confirmed" || a.status === "completed") &&
        Math.floor(minutesOf(a.time) / 60) === h,
    ).length;
    const predicted = Math.round(
      Math.min(capacity || 1, booked + capacity * peakPressure(label) * 0.35 + hash01(date + h) * 2),
    );
    return { hour: label, booked, predicted, capacity };
  });
}

export type Conflict = {
  id: string;
  kind: "double-booked" | "blocked-slot" | "outside-hours" | "patient-overlap";
  message: string;
};

/** Detect scheduling conflicts across the schedule. */
export function detectConflicts(
  appointments: Appointment[],
  doctorList: Doctor[],
  blocked: BlockedSlot[],
  patientList: Patient[],
): Conflict[] {
  const active = appointments.filter((a) => a.status === "confirmed" || a.status === "rescheduled");
  const out: Conflict[] = [];
  const byDoctorSlot = new Map<string, Appointment[]>();
  const byPatientSlot = new Map<string, Appointment[]>();

  active.forEach((a) => {
    const dk = `${a.doctorId}|${a.date}|${a.time}`;
    byDoctorSlot.set(dk, [...(byDoctorSlot.get(dk) ?? []), a]);
    const pk = `${a.patientId}|${a.date}|${a.time}`;
    byPatientSlot.set(pk, [...(byPatientSlot.get(pk) ?? []), a]);
  });

  byDoctorSlot.forEach((list, key) => {
    if (list.length > 1) {
      const doctor = doctorList.find((d) => d.id === list[0]?.doctorId);
      out.push({
        id: `dbl-${key}`,
        kind: "double-booked",
        message: `${doctor?.name ?? "Doctor"} has ${list.length} appointments at the same slot (${list[0]?.date} ${list[0]?.time}).`,
      });
    }
  });

  byPatientSlot.forEach((list, key) => {
    if (list.length > 1) {
      const patient = patientList.find((p) => p.id === list[0]?.patientId);
      out.push({
        id: `pov-${key}`,
        kind: "patient-overlap",
        message: `${patient?.name ?? "Patient"} is booked with ${list.length} doctors at ${list[0]?.time} on ${list[0]?.date}.`,
      });
    }
  });

  active.forEach((a) => {
    const doctor = doctorList.find((d) => d.id === a.doctorId);
    if (!doctor) return;
    if (blocked.some((b) => b.doctorId === a.doctorId && b.date === a.date && b.time === a.time)) {
      out.push({
        id: `blk-${a.id}`,
        kind: "blocked-slot",
        message: `${doctor.name} blocked ${a.time} on ${a.date} but an appointment still exists.`,
      });
    }
    const m = minutesOf(a.time);
    if (
      m < minutesOf(doctor.workingHours.start) ||
      m >= minutesOf(doctor.workingHours.end) ||
      doctor.offDays.includes(parseISODate(a.date).getDay())
    ) {
      out.push({
        id: `oh-${a.id}`,
        kind: "outside-hours",
        message: `${doctor.name} has an appointment at ${a.time} on ${a.date}, outside declared working hours.`,
      });
    }
  });

  return out;
}

/** Optimisation advice to spread load evenly through the day. */
export function optimisationTips(
  date: string,
  doctorList: Doctor[],
  appointments: Appointment[],
): string[] {
  const forecast = demandForecast(date, doctorList, appointments);
  const tips: string[] = [];
  const busiest = [...forecast].sort((a, b) => b.predicted / (b.capacity || 1) - a.predicted / (a.capacity || 1))[0];
  const quietest = [...forecast]
    .filter((f) => f.capacity > 0)
    .sort((a, b) => a.predicted / (a.capacity || 1) - b.predicted / (b.capacity || 1))[0];
  if (busiest && quietest) {
    tips.push(
      `Shift ~${Math.max(1, Math.round((busiest.predicted - quietest.predicted) / 3))} routine follow-ups from ${busiest.hour} to ${quietest.hour} to cut average wait by an estimated 8 minutes.`,
    );
  }
  const heavy = doctorList
    .map((d) => ({
      d,
      load: appointments.filter((a) => a.doctorId === d.id && a.date === date && a.status === "confirmed")
        .length,
      cap: generateSlots(d, date).length,
    }))
    .filter((x) => x.cap > 0)
    .sort((a, b) => b.load / b.cap - a.load / a.cap);
  const top = heavy[0];
  const bottom = heavy[heavy.length - 1];
  if (top && bottom && top.d.id !== bottom.d.id) {
    tips.push(
      `${top.d.name} is at ${Math.round((top.load / top.cap) * 100)}% capacity while ${bottom.d.name} is at ${Math.round((bottom.load / bottom.cap) * 100)}%. Route new same-department requests to the lighter schedule.`,
    );
  }
  tips.push(
    "Reserve two buffer slots per doctor around the predicted peak hour to absorb walk-ins and late arrivals.",
  );
  return tips;
}
