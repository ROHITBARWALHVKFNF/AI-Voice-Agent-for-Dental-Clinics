"use client";

import AppShell from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiJson } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";

interface CurrentUserResponse {
  user?: {
    id: string;
    organization_id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    country: string;
    timezone: string;
    currency: string;
    description?: string | null;
  };
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  status: string;
  appointment_type?: string | null;
  notes?: string | null;
}

interface Patient {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  lead_stage: string;
  is_active: boolean;
}

export default function DashboardPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<CurrentUserResponse | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const session = getAuthSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const userResponse =
          await apiJson<CurrentUserResponse>(
            "/organizations/me/user"
          );

        setCurrentUser(userResponse);

        try {
          const appointmentResponse =
            await apiJson<Appointment[]>("/appointments");

          setAppointments(
            Array.isArray(appointmentResponse)
              ? appointmentResponse
              : []
          );
        } catch {
          setAppointments([]);
        }

        try {
          const patientResponse =
            await apiJson<Patient[]>(
              `/patients?organization_id=${session.organizationId}`
            );

          setPatients(
            Array.isArray(patientResponse)
              ? patientResponse
              : []
          );
        } catch {
          setPatients([]);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 text-sm text-slate-500">
              Loading your clinic...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-6">
          <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
              Unable to load dashboard
            </h1>

            <p className="mt-3 text-sm text-slate-600">
              {error}
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Return to login
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const today = new Date();

  const todayAppointments = appointments.filter(
    (appointment) => {
      const appointmentDate = new Date(
        appointment.start_time
      );

      return (
        appointmentDate.getFullYear() === today.getFullYear() &&
        appointmentDate.getMonth() === today.getMonth() &&
        appointmentDate.getDate() === today.getDate()
      );
    }
  );

  const scheduledAppointments = appointments.filter(
    (appointment) =>
      ["scheduled", "confirmed", "pending"].includes(
        appointment.status
      )
  );

  const newLeads = patients.filter(
    (patient) => patient.lead_stage === "new_lead"
  );

  const followUps = patients.filter(
    (patient) =>
      patient.lead_stage === "follow_up" ||
      patient.lead_stage === "recall"
  );

  const displayName =
    currentUser?.user?.full_name || "Clinic Admin";

  return (
    <AppShell>
      <div className="min-h-full bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Welcome */}
          <section>
            <p className="text-sm font-medium text-blue-600">
              Good to see you
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Welcome, {displayName}
            </h1>

            <p className="mt-2 text-slate-500">
              Here's what's happening in your clinic today.
            </p>
          </section>

          {/* Stats */}
          <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Today's appointments"
              value={String(todayAppointments.length)}
              description="Scheduled for today"
            />

            <StatCard
              label="Total appointments"
              value={String(scheduledAppointments.length)}
              description="Active appointments"
            />

            <StatCard
              label="Patients"
              value={String(patients.length)}
              description="Active patients"
            />

            <StatCard
              label="New leads"
              value={String(newLeads.length)}
              description="Needs attention"
            />
          </section>

          {/* Main grid */}
          <section className="mt-8 grid gap-6 xl:grid-cols-3">
            {/* Appointments */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Upcoming appointments
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Your latest scheduled appointments
                  </p>
                </div>

                <Link
                  href="/appointments"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  View all
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {appointments.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="font-semibold text-slate-900">
                      No appointments yet
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Your upcoming appointments will appear here.
                    </p>

                    <Link
                      href="/appointments"
                      className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Create appointment
                    </Link>
                  </div>
                ) : (
                  appointments
                    .slice(0, 6)
                    .map((appointment) => (
                      <AppointmentRow
                        key={appointment.id}
                        appointment={appointment}
                      />
                    ))
                )}
              </div>
            </div>

            {/* Follow-ups */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-bold text-slate-900">
                  Patient follow-ups
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Patients requiring attention
                </p>
              </div>

              <div className="p-6">
                {followUps.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600">
                      ✓
                    </div>

                    <p className="mt-4 font-semibold text-slate-900">
                      All caught up
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      No follow-ups currently require attention.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followUps
                      .slice(0, 5)
                      .map((patient) => (
                        <div
                          key={patient.id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <p className="font-semibold text-slate-900">
                            {patient.full_name}
                          </p>

                          <p className="mt-1 text-xs capitalize text-slate-500">
                            {patient.lead_stage.replaceAll(
                              "_",
                              " "
                            )}
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                <Link
                  href="/crm"
                  className="mt-5 block rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open CRM
                </Link>
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <section className="mt-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="font-bold text-slate-900">
                  Quick actions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Manage your clinic from one place.
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <QuickAction
                  title="New appointment"
                  description="Book a patient"
                  href="/appointments"
                />

                <QuickAction
                  title="Patients"
                  description="View patient CRM"
                  href="/patients"
                />

                <QuickAction
                  title="Doctors"
                  description="Manage doctors"
                  href="/doctors"
                />

                <QuickAction
                  title="Calendar"
                  description="View clinic schedule"
                  href="/calendar"
                />
              </div>
            </div>
          </section>

          {/* AI banner */}
          <section className="mt-8">
            <div className="overflow-hidden rounded-2xl bg-slate-950 p-6 text-white sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    AI layer ready
                  </div>

                  <h2 className="mt-4 text-2xl font-bold">
                    Let AI handle repetitive front-desk work.
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Voice, WhatsApp, appointment automation,
                    reminders and patient reactivation will all
                    connect to the same clinic operating system.
                  </p>
                </div>

                <Link
                  href="/crm"
                  className="shrink-0 rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-slate-100"
                >
                  Explore CRM
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function AppointmentRow({
  appointment,
}: {
  appointment: Appointment;
}) {
  const start = new Date(appointment.start_time);

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600">
          {start.getDate()}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            Appointment
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {start.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}{" "}
            ·{" "}
            {start.toLocaleTimeString("en-IN", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              timeZone: "Asia/Kolkata",
            })}
          </p>
        </div>
      </div>

      <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
        {appointment.status.replaceAll("_", " ")}
      </span>
    </div>
  );
}

function QuickAction({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/50"
    >
      <p className="font-semibold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </Link>
  );
}