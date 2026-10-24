"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  Eye,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
  Users,
  X,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { apiJson } from "@/lib/api";

type Doctor = {
  id?: string | number | null;
  doctor_id?: string | number | null;
  organization_id?: string | null;
  full_name?: string | null;
  name?: string | null;
  specialization?: string | null;
  phone?: string | null;
  email?: string | null;
  bio?: string | null;
  is_active?: boolean | null;
  experience_years?: number | null;
};

type DoctorForm = {
  full_name: string;
  specialization: string;
  phone: string;
  email: string;
  bio: string;
};

function getDoctorId(doctor: Doctor): string {
  const value = doctor.id ?? doctor.doctor_id;
  return value == null ? "" : String(value).trim();
}

function getDoctorName(doctor: Doctor): string {
  return doctor.full_name?.trim() || doctor.name?.trim() || "Unnamed Doctor";
}

function extractDoctors(response: unknown): Doctor[] {
  if (Array.isArray(response)) {
    return response as Doctor[];
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const data = response as Record<string, unknown>;

  for (const key of ["items", "data", "results", "doctors"]) {
    const value = data[key];

    if (Array.isArray(value)) {
      return value as Doctor[];
    }

    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;

      for (const nestedKey of ["items", "results", "doctors"]) {
        if (Array.isArray(nested[nestedKey])) {
          return nested[nestedKey] as Doctor[];
        }
      }
    }
  }

  return [];
}

const EMPTY_FORM: DoctorForm = {
  full_name: "",
  specialization: "",
  phone: "",
  email: "",
  bio: "",
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<DoctorForm>(EMPTY_FORM);

  const loadDoctors = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await apiJson<unknown>("/doctors");
      const records = extractDoctors(response);

      setDoctors(records);

      if (records.length === 0) {
        console.info("GET /doctors returned no doctor records:", response);
      }

      records.forEach((doctor) => {
        if (!getDoctorId(doctor)) {
          console.warn("Doctor record is missing id/doctor_id:", doctor);
        }
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load doctors. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return doctors;

    return doctors.filter((doctor) => {
      const searchable = [
        getDoctorName(doctor),
        doctor.specialization,
        doctor.email,
        doctor.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [doctors, search]);

  const activeCount = doctors.filter(
    (doctor) => doctor.is_active !== false,
  ).length;

  const specializationCount = new Set(
    doctors
      .map((doctor) => doctor.specialization?.trim())
      .filter((value): value is string => Boolean(value)),
  ).size;

  async function handleAddDoctor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      await apiJson<unknown>("/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          specialization: form.specialization.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          bio: form.bio.trim() || null,
        }),
      });

      setShowAddModal(false);
      setForm(EMPTY_FORM);
      await loadDoctors(true);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Could not add doctor. Please check the details.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <Users className="h-4 w-4" />
              Clinic management
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Doctors
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage your doctors, contact details, and schedules.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadDoctors(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setFormError("");
                setShowAddModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Doctor
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Could not load doctors</p>
              <p className="mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadDoctors()}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total doctors"
            value={loading ? "—" : String(doctors.length)}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Active doctors"
            value={loading ? "—" : String(activeCount)}
            icon={<Stethoscope className="h-5 w-5" />}
          />
          <StatCard
            label="Specializations"
            value={loading ? "—" : String(specializationCount)}
            icon={<UserRound className="h-5 w-5" />}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Your medical team
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View doctor profiles and manage their schedules.
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, specialty, email..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="h-12 w-12 rounded-xl bg-slate-200" />
                <div className="mt-5 h-4 w-1/2 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-2/3 rounded bg-slate-100" />
                <div className="mt-8 h-10 rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Stethoscope className="h-7 w-7" />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              {search ? "No matching doctors" : "No doctors added yet"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {search
                ? "Try a different search term."
                : "Add your first doctor to manage their profile and appointment schedule."}
            </p>

            {!search && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add your first doctor
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredDoctors.map((doctor, index) => {
              const doctorId = getDoctorId(doctor);
              const name = getDoctorName(doctor);
              const initials = name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("");

              return (
                <article
                  key={doctorId || `doctor-${index}`}
                  className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-base font-bold text-blue-700">
                        {initials || <UserRound className="h-6 w-6" />}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">
                          {name}
                        </h3>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {doctor.specialization || "Specialization not set"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        doctor.is_active === false
                          ? "bg-slate-100 text-slate-600"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {doctor.is_active === false ? "Inactive" : "Active"}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-slate-600">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {doctor.email || "No email added"}
                      </span>
                    </div>

                    <div className="flex min-w-0 items-center gap-2.5">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {doctor.phone || "No phone added"}
                      </span>
                    </div>

                    {doctor.experience_years != null && (
                      <p className="text-xs text-slate-500">
                        {doctor.experience_years} years of experience
                      </p>
                    )}
                  </div>

                  {!doctorId && (
                    <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                      This record has no doctor ID. Check the GET /doctors API
                      response; profile and schedule links are disabled.
                    </div>
                  )}

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                    {doctorId ? (
                      <>
                        <Link
                          href={`/doctors/${encodeURIComponent(doctorId)}`}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Link>

                        <Link
                          href={`/doctors/${encodeURIComponent(doctorId)}/schedule`}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          <CalendarDays className="h-4 w-4" />
                          Schedule
                        </Link>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="col-span-2 cursor-not-allowed rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-400"
                      >
                        Doctor ID unavailable
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowAddModal(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-doctor-title"
            className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="add-doctor-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Add Doctor
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the doctor&apos;s professional and contact details.
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => setShowAddModal(false)}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddDoctor} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="full_name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Full name *
                </label>
                <input
                  id="full_name"
                  required
                  value={form.full_name}
                  onChange={(event) =>
                    setForm({ ...form, full_name: event.target.value })
                  }
                  placeholder="Dr. Amit Sharma"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="specialization"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Specialization
                </label>
                <input
                  id="specialization"
                  value={form.specialization}
                  onChange={(event) =>
                    setForm({ ...form, specialization: event.target.value })
                  }
                  placeholder="General Dentistry"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    placeholder="+91..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    placeholder="doctor@clinic.com"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="bio"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Bio / About
                </label>
                <textarea
                  id="bio"
                  rows={3}
                  value={form.bio}
                  onChange={(event) =>
                    setForm({ ...form, bio: event.target.value })
                  }
                  placeholder="Professional background and additional details..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !form.full_name.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                  {saving ? "Saving..." : "Save Doctor"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
