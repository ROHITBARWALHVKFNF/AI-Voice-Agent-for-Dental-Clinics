"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { apiJson, getOrganizationId } from "@/lib/api";

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  status?: string;
  notes?: string | null;
}

interface Patient {
  id: string;
  full_name: string;
  phone?: string | null;
}

interface Doctor {
  id: string;
  full_name: string;
}

interface Slot {
  start_time: string;
  end_time: string;
  available?: boolean;
  capacity?: number;
  booked?: number;
  remaining?: number;
  reason?: string | null;
}

function extractArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
    if (Array.isArray(obj.slots)) return obj.slots as T[];
  }

  return [];
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(value: string) {
  // Handles both ISO date-times and time-only strings.
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const [hours, minutes] = value.split(":").map(Number);
    const time = new Date();
    time.setHours(hours, minutes, 0, 0);

    return time.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CalendarPage() {
  const organizationId = getOrganizationId();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Always display seven dates centered on the selected date.
  const days = useMemo(() => {
    const result: Date[] = [];
    const start = new Date(selectedDate);

    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() - 3);

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      result.push(day);
    }

    return result;
  }, [selectedDate]);

  const patientMap = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  );

  const doctorMap = useMemo(
    () => new Map(doctors.map((doctor) => [doctor.id, doctor])),
    [doctors]
  );

  async function loadData() {
    if (!organizationId) {
      setError("Organization information is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        appointmentsResponse,
        patientsResponse,
        doctorsResponse,
      ] = await Promise.all([
        apiJson<unknown>("/appointments"),
        apiJson<unknown>(
          `/patients?organization_id=${encodeURIComponent(organizationId)}`
        ),
        apiJson<unknown>("/doctors"),
      ]);

      setAppointments(extractArray<Appointment>(appointmentsResponse));
      setPatients(extractArray<Patient>(patientsResponse));
      setDoctors(extractArray<Doctor>(doctorsResponse));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load calendar."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // Load initial calendar data when the page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load availability for the selected date and doctor.
  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      if (!doctors.length) {
        setSlots([]);
        setLoadingSlots(false);
        return;
      }

      const doctorId =
        selectedDoctor === "all"
          ? doctors[0]?.id
          : selectedDoctor;

      if (!doctorId) {
        setSlots([]);
        setLoadingSlots(false);
        return;
      }

      try {
        setLoadingSlots(true);

        const response = await apiJson<unknown>(
          `/availability/slots/${encodeURIComponent(doctorId)}` +
            `?requested_date=${dateKey(selectedDate)}` +
            "&slot_duration_minutes=30"
        );

        if (!cancelled) {
          setSlots(extractArray<Slot>(response));
        }
      } catch {
        if (!cancelled) {
          setSlots([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    }

    void loadSlots();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedDoctor, doctors]);

  // Appointments for the selected calendar date.
  const dayAppointments = useMemo(() => {
    const selected = dateKey(selectedDate);

    return appointments
      .filter((appointment) => {
        const appointmentDate = dateKey(
          new Date(appointment.start_time)
        );

        if (appointmentDate !== selected) {
          return false;
        }

        if (
          selectedDoctor !== "all" &&
          appointment.doctor_id !== selectedDoctor
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() -
          new Date(b.start_time).getTime()
      );
  }, [appointments, selectedDate, selectedDoctor]);

  const todayCount = useMemo(() => {
    const today = dateKey(new Date());

    return appointments.filter(
      (appointment) =>
        dateKey(new Date(appointment.start_time)) === today
    ).length;
  }, [appointments]);

  // Navigate relative to the currently selected date.
  function changeWeek(amount: number) {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount * 7);
      return next;
    });
  }

  function goToToday() {
    setSelectedDate(new Date());
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Clinic Management
              </p>

              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                Calendar
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                View your clinic schedule and available appointment slots.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-500">Today</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {todayCount} appointments
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Date navigation */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Weekly schedule
                </h2>

                <p className="text-xs text-gray-500">
                  Select a date to view appointments.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeWeek(-1)}
                  aria-label="Previous week"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  ← Previous
                </button>

                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => changeWeek(1)}
                  aria-label="Next week"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  Next →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {days.map((day) => {
                const active =
                  dateKey(day) === dateKey(selectedDate);

                return (
                  <button
                    key={dateKey(day)}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    aria-pressed={active}
                    className={[
                      "rounded-xl border p-3 text-left transition",
                      active
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <div className="text-xs font-medium opacity-80">
                      {day.toLocaleDateString("en-IN", {
                        weekday: "short",
                      })}
                    </div>

                    <div className="mt-1 text-lg font-bold">
                      {day.getDate()}
                    </div>

                    <div className="text-xs opacity-70">
                      {day.toLocaleDateString("en-IN", {
                        month: "short",
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main grid */}
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Appointments */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {formatDay(selectedDate)}
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    {dayAppointments.length} scheduled appointment
                    {dayAppointments.length === 1 ? "" : "s"}
                  </p>
                </div>

                <select
                  value={selectedDoctor}
                  onChange={(event) =>
                    setSelectedDoctor(event.target.value)
                  }
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  aria-label="Filter appointments by doctor"
                >
                  <option value="all">All doctors</option>

                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="p-10 text-center text-sm text-gray-500">
                  Loading calendar...
                </div>
              ) : dayAppointments.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                    📅
                  </div>

                  <h3 className="mt-4 font-semibold text-gray-900">
                    No appointments
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    There are no appointments scheduled for this day.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {dayAppointments.map((appointment) => {
                    const patient = patientMap.get(
                      appointment.patient_id
                    );

                    const doctor = doctorMap.get(
                      appointment.doctor_id
                    );

                    return (
                      <div
                        key={appointment.id}
                        className="flex flex-col gap-4 p-5 transition hover:bg-gray-50 sm:flex-row sm:items-center"
                      >
                        <div className="w-24 shrink-0">
                          <div className="text-sm font-bold text-gray-900">
                            {formatTime(appointment.start_time)}
                          </div>

                          <div className="mt-1 text-xs text-gray-500">
                            {formatTime(appointment.end_time)}
                          </div>
                        </div>

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600">
                          {(patient?.full_name || "P")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900">
                            {patient?.full_name || "Unknown patient"}
                          </div>

                          <div className="mt-1 text-xs text-gray-500">
                            Dr. {doctor?.full_name || "Unknown doctor"}
                          </div>

                          {patient?.phone && (
                            <div className="mt-1 text-xs text-gray-400">
                              {patient.phone}
                            </div>
                          )}

                          {appointment.notes && (
                            <div className="mt-1 text-xs text-gray-500">
                              {appointment.notes}
                            </div>
                          )}
                        </div>

                        <span className="w-fit rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium capitalize text-gray-700">
                          {appointment.status || "scheduled"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Availability */}
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="font-semibold text-gray-900">
                  Available slots
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {formatDay(selectedDate)}
                </p>

                {selectedDoctor === "all" && doctors.length > 1 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Showing availability for {doctors[0]?.full_name}.
                    Select a doctor to view their slots.
                  </p>
                )}
              </div>

              <div className="p-5">
                {loadingSlots ? (
                  <p className="text-sm text-gray-500">
                    Checking availability...
                  </p>
                ) : slots.length === 0 ? (
                  <div className="rounded-xl bg-gray-50 p-5 text-center">
                    <p className="text-sm font-medium text-gray-700">
                      No available slots
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Try another doctor or date.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {slots.map((slot, index) => {
                      const available = slot.available !== false;

                      return (
                        <div
                          key={`${slot.start_time}-${index}`}
                          className={[
                            "rounded-xl border px-3 py-3 text-sm transition",
                            available
                              ? "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                              : "border-gray-200 bg-gray-100 text-gray-400",
                          ].join(" ")}
                          title={
                            slot.reason ||
                            (available
                              ? "Available"
                              : "Unavailable")
                          }
                        >
                          <div className="font-medium">
                            {formatTime(slot.start_time)}
                          </div>

                          {slot.remaining !== undefined && (
                            <div className="mt-1 text-xs">
                              {slot.remaining} remaining
                            </div>
                          )}

                          {slot.available === false && (
                            <div className="mt-1 text-xs">
                              {slot.reason || "Unavailable"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
