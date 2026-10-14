"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { apiJson, getOrganizationId } from "@/lib/api";

interface Patient {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  status?: string;
}

interface FollowUp {
  id: string;
  patient_id?: string | null;
  appointment_id?: string | null;
  due_date?: string | null;
  status?: string | null;
  notes?: string | null;
}

interface Treatment {
  id: string;
  patient_id?: string | null;
  name?: string | null;
  status?: string | null;
  treatment_name?: string | null;
}

function extractArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }

  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CRMPage() {
  const organizationId = getOrganizationId();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCRM() {
    if (!organizationId) {
      setError("Organization information is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        patientsResponse,
        appointmentsResponse,
        followUpsResponse,
        treatmentsResponse,
      ] = await Promise.all([
        apiJson<unknown>(
          `/patients?organization_id=${organizationId}`
        ),
        apiJson<unknown>("/appointments"),
        apiJson<unknown>("/follow-ups"),
        apiJson<unknown>("/treatments"),
      ]);

      setPatients(extractArray<Patient>(patientsResponse));
      setAppointments(
        extractArray<Appointment>(appointmentsResponse)
      );
      setFollowUps(extractArray<FollowUp>(followUpsResponse));
      setTreatments(extractArray<Treatment>(treatmentsResponse));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load CRM information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCRM();
  }, []);

  const patientMap = useMemo(
    () =>
      new Map(
        patients.map((patient) => [patient.id, patient])
      ),
    [patients]
  );

  const pendingFollowUps = useMemo(
    () =>
      followUps.filter(
        (followUp) =>
          !followUp.status ||
          !["completed", "done", "cancelled"].includes(
            followUp.status.toLowerCase()
          )
      ),
    [followUps]
  );

  const activeTreatments = useMemo(
    () =>
      treatments.filter(
        (treatment) =>
          !treatment.status ||
          !["completed", "cancelled"].includes(
            treatment.status.toLowerCase()
          )
      ),
    [treatments]
  );

  const upcomingAppointments = useMemo(() => {
    const now = Date.now();

    return appointments
      .filter(
        (appointment) =>
          new Date(appointment.start_time).getTime() >= now
      )
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() -
          new Date(b.start_time).getTime()
      )
      .slice(0, 5);
  }, [appointments]);

  const todayAppointments = useMemo(() => {
    const now = new Date();

    return appointments.filter((appointment) => {
      const date = new Date(appointment.start_time);

      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    });
  }, [appointments]);

  const completedAppointments = appointments.filter(
    (appointment) =>
      appointment.status?.toLowerCase() === "completed"
  ).length;

  return (
    <AppShell>
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <p className="text-sm font-medium text-blue-600">
              Patient Relationship Management
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
              CRM Overview
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Track patient relationships, follow-ups, treatments and
              the complete patient journey from enquiry to recall.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Main CRM stats */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Total patients
                </p>

                <span className="rounded-xl bg-blue-50 px-3 py-2 text-lg">
                  👥
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold text-gray-900">
                {patients.length}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Active patient database
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Today's appointments
                </p>

                <span className="rounded-xl bg-green-50 px-3 py-2 text-lg">
                  📅
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold text-gray-900">
                {todayAppointments.length}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Scheduled for today
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Pending follow-ups
                </p>

                <span className="rounded-xl bg-orange-50 px-3 py-2 text-lg">
                  🔔
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold text-orange-500">
                {pendingFollowUps.length}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Need attention
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Active treatments
                </p>

                <span className="rounded-xl bg-purple-50 px-3 py-2 text-lg">
                  🦷
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold text-purple-600">
                {activeTreatments.length}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Treatments in progress
              </p>
            </div>
          </div>

          {/* Patient journey */}
          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="font-semibold text-gray-900">
                Patient journey
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Your clinic's relationship pipeline.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
              {[
                ["New leads", "new_lead", "bg-blue-50"],
                ["Contacted", "contacted", "bg-indigo-50"],
                [
                  "Appointment",
                  "appointment_booked",
                  "bg-purple-50",
                ],
                ["Visited", "visited", "bg-cyan-50"],
                [
                  "Treatment",
                  "treatment_started",
                  "bg-orange-50",
                ],
                [
                  "Completed",
                  "treatment_completed",
                  "bg-green-50",
                ],
                ["Recall", "recall", "bg-pink-50"],
              ].map(([label, key, bg]) => (
                <div
                  key={key}
                  className={`rounded-xl ${bg} p-4`}
                >
                  <p className="text-xs font-medium text-gray-500">
                    {label}
                  </p>

                  <p className="mt-2 text-xl font-bold text-gray-900">
                    —
                  </p>

                  <p className="mt-1 text-[11px] text-gray-500">
                    Pipeline stage
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Main CRM grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Follow ups */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Follow-ups
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Patients requiring follow-up.
                  </p>
                </div>

                <Link
                  href="/crm/follow-ups"
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  View all →
                </Link>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  Loading...
                </div>
              ) : pendingFollowUps.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
                    ✓
                  </div>

                  <p className="mt-3 text-sm font-medium text-gray-900">
                    No pending follow-ups
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Your follow-up queue is clear.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pendingFollowUps.slice(0, 5).map((followUp) => {
                    const patient = followUp.patient_id
                      ? patientMap.get(followUp.patient_id)
                      : undefined;

                    return (
                      <div
                        key={followUp.id}
                        className="flex items-center gap-3 p-4"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xs font-bold text-orange-600">
                          {(patient?.full_name || "P")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {patient?.full_name ||
                              "Unknown patient"}
                          </p>

                          <p className="mt-1 truncate text-xs text-gray-500">
                            {followUp.notes ||
                              "Follow-up required"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-medium text-gray-700">
                            {formatDate(followUp.due_date)}
                          </p>

                          <span className="mt-1 inline-block rounded-full bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700">
                            Pending
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Upcoming appointments */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Upcoming appointments
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Next patient visits.
                  </p>
                </div>

                <Link
                  href="/appointments"
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  View all →
                </Link>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  Loading...
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                    📅
                  </div>

                  <p className="mt-3 text-sm font-medium text-gray-900">
                    No upcoming appointments
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Your upcoming schedule is empty.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingAppointments.map((appointment) => {
                    const patient = patientMap.get(
                      appointment.patient_id
                    );

                    const appointmentDate = new Date(
                      appointment.start_time
                    );

                    return (
                      <div
                        key={appointment.id}
                        className="flex items-center gap-3 p-4"
                      >
                        <div className="w-12 shrink-0 rounded-xl bg-blue-50 p-2 text-center">
                          <p className="text-[10px] font-medium uppercase text-blue-600">
                            {appointmentDate.toLocaleDateString(
                              "en-IN",
                              {
                                month: "short",
                              }
                            )}
                          </p>

                          <p className="text-lg font-bold text-blue-700">
                            {appointmentDate.getDate()}
                          </p>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {patient?.full_name ||
                              "Unknown patient"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {appointmentDate.toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>

                        <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-medium capitalize text-gray-600">
                          {appointment.status ||
                            "scheduled"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Treatments */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Active treatments
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Patients currently undergoing treatment.
                  </p>
                </div>

                <Link
                  href="/crm/treatments"
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  View all →
                </Link>
              </div>

              {activeTreatments.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
                    🦷
                  </div>

                  <p className="mt-3 text-sm font-medium text-gray-900">
                    No active treatments
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activeTreatments.slice(0, 5).map((treatment) => {
                    const patient = treatment.patient_id
                      ? patientMap.get(treatment.patient_id)
                      : undefined;

                    return (
                      <div
                        key={treatment.id}
                        className="flex items-center gap-3 p-4"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xs font-bold text-purple-600">
                          🦷
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {patient?.full_name ||
                              "Unknown patient"}
                          </p>

                          <p className="mt-1 truncate text-xs text-gray-500">
                            {treatment.name ||
                              treatment.treatment_name ||
                              "Treatment"}
                          </p>
                        </div>

                        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-medium capitalize text-purple-700">
                          {treatment.status || "Active"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* CRM actions */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">
                CRM workspace
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Jump directly to the workflow you want to manage.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/crm/follow-ups"
                  className="rounded-xl border border-gray-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <div className="text-xl">🔔</div>

                  <p className="mt-3 text-sm font-semibold text-gray-900">
                    Follow-ups
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Manage callbacks and patient reminders.
                  </p>
                </Link>

                <Link
                  href="/crm/treatments"
                  className="rounded-xl border border-gray-200 p-4 transition hover:border-purple-200 hover:bg-purple-50"
                >
                  <div className="text-xl">🦷</div>

                  <p className="mt-3 text-sm font-semibold text-gray-900">
                    Treatments
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Track treatment plans and progress.
                  </p>
                </Link>

                <Link
                  href="/patients"
                  className="rounded-xl border border-gray-200 p-4 transition hover:border-green-200 hover:bg-green-50"
                >
                  <div className="text-xl">👥</div>

                  <p className="mt-3 text-sm font-semibold text-gray-900">
                    Patients
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Open the complete patient database.
                  </p>
                </Link>

                <Link
                  href="/appointments"
                  className="rounded-xl border border-gray-200 p-4 transition hover:border-orange-200 hover:bg-orange-50"
                >
                  <div className="text-xl">📅</div>

                  <p className="mt-3 text-sm font-semibold text-gray-900">
                    Appointments
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Manage your clinic schedule.
                  </p>
                </Link>
              </div>

              <div className="mt-5 rounded-xl bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Completed appointments
                  </span>

                  <span className="text-sm font-bold text-gray-900">
                    {completedAppointments}
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width:
                        appointments.length > 0
                          ? `${Math.min(
                              100,
                              (completedAppointments /
                                appointments.length) *
                                100
                            )}%`
                          : "0%",
                    }}
                  />
                </div>

                <p className="mt-2 text-[11px] text-gray-400">
                  Appointment completion rate
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}