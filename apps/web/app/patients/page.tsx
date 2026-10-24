
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  UserRound,
  Phone,
  Mail,
  RefreshCw,
  Eye,
  AlertCircle,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";

type Patient = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  age?: number | null;
  created_at?: string | null;
  dentist?: string | null;
  doctor_name?: string | null;
  specialty?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  appointment_type?: string | null;
  status?: string | null;
};

function getPatientName(patient: Patient) {
  return patient.full_name || patient.name || "Unnamed patient";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "P";
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/patients");

      if (!response.ok) {
        throw new Error(`Could not load patients (${response.status}).`);
      }

      const data: unknown = await response.json();

      const rows = Array.isArray(data)
        ? data
        : data &&
            typeof data === "object" &&
            "items" in data &&
            Array.isArray(data.items)
          ? data.items
          : data &&
              typeof data === "object" &&
              "patients" in data &&
              Array.isArray(data.patients)
            ? data.patients
            : [];

      setPatients(rows as Patient[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading patients."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return patients;

    return patients.filter((patient) =>
      [
        getPatientName(patient),
        patient.phone,
        patient.email,
        patient.dentist,
        patient.doctor_name,
        patient.specialty,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [patients, search]);

  return (
    <AppShell>
      <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Clinic management
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Patients
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                View and manage your clinic&apos;s patient records.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadPatients()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </header>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total patients
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {loading ? "—" : patients.length}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Search results
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {loading ? "—" : filteredPatients.length}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <UserRound className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 sm:p-5">
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, phone, email or dentist..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {error && (
              <div className="m-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Unable to load patients</p>
                  <p className="mt-1">{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadPatients()}
                    className="mt-2 font-semibold underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-14 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : !error && filteredPatients.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-slate-900">
                  {search ? "No matching patients" : "No patients yet"}
                </h2>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  {search
                    ? "Try a different name, phone number, email or dentist."
                    : "Patient records will appear here when available in your clinic."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Patient</th>
                        <th className="px-5 py-4 font-semibold">Contact</th>
                        <th className="px-5 py-4 font-semibold">Dentist</th>
                        <th className="px-5 py-4 font-semibold">Appointment</th>
                        <th className="px-5 py-4 font-semibold">Status</th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredPatients.map((patient) => {
                        const name = getPatientName(patient);

                        return (
                          <tr
                            key={patient.id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                                  {getInitials(name)}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {name}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {patient.age != null
                                      ? `${patient.age} years`
                                      : patient.gender || "Patient"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="space-y-1.5">
                                <p className="flex items-center gap-2 text-slate-700">
                                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                                  {patient.phone || "—"}
                                </p>
                                <p className="flex items-center gap-2 text-xs text-slate-500">
                                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                  {patient.email || "—"}
                                </p>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-medium text-slate-800">
                                {patient.dentist ||
                                  patient.doctor_name ||
                                  "—"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {patient.specialty || "—"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-medium text-slate-800">
                                {formatDate(patient.appointment_date)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {patient.appointment_time || "—"}
                                {patient.appointment_type
                                  ? ` · ${patient.appointment_type}`
                                  : ""}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                                {patient.status || "Registered"}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedPatient(patient)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
                  Showing {filteredPatients.length} of {patients.length} patients
                </div>
              </>
            )}
          </section>
        </div>

        {selectedPatient && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onClick={() => setSelectedPatient(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="patient-detail-title"
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Patient record
                  </p>
                  <h2
                    id="patient-detail-title"
                    className="mt-1 text-xl font-bold text-slate-900"
                  >
                    {getPatientName(selectedPatient)}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  aria-label="Close patient details"
                  className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <dl className="mt-6 space-y-4">
                {[
                  ["Patient ID", selectedPatient.id],
                  ["Phone", selectedPatient.phone || "—"],
                  ["Email", selectedPatient.email || "—"],
                  ["Gender", selectedPatient.gender || "—"],
                  [
                    "Age",
                    selectedPatient.age != null
                      ? String(selectedPatient.age)
                      : "—",
                  ],
                  [
                    "Dentist",
                    selectedPatient.dentist ||
                      selectedPatient.doctor_name ||
                      "—",
                  ],
                  ["Specialty", selectedPatient.specialty || "—"],
                  [
                    "Appointment date",
                    formatDate(selectedPatient.appointment_date),
                  ],
                  [
                    "Appointment time",
                    selectedPatient.appointment_time || "—",
                  ],
                  [
                    "Appointment type",
                    selectedPatient.appointment_type || "—",
                  ],
                  ["Status", selectedPatient.status || "Registered"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-3 gap-3 border-b border-slate-100 pb-3 last:border-0"
                  >
                    <dt className="text-sm text-slate-500">{label}</dt>
                    <dd className="col-span-2 break-words text-sm font-medium text-slate-800">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </section>
          </div>
        )}
      </main>
    </AppShell>
  );
}
