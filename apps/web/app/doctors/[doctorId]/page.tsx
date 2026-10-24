
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  UserRound,
  Phone,
  Mail,
  Stethoscope,
  Clock,
  GraduationCap,
  Pencil,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { apiJson } from "@/lib/api";

type Doctor = {
  id: string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  specialization?: string | null;
  phone?: string | null;
  email?: string | null;
  bio?: string | null;
  experience_years?: number | null;
  education?: string | null;
  is_active?: boolean;
};

type DoctorForm = {
  full_name: string;
  specialization: string;
  phone: string;
  email: string;
  bio: string;
  experience_years: string;
  education: string;
  is_active: boolean;
};

const EMPTY_FORM: DoctorForm = {
  full_name: "",
  specialization: "",
  phone: "",
  email: "",
  bio: "",
  experience_years: "",
  education: "",
  is_active: true,
};

export default function DoctorDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const doctorId = String(params.doctorId ?? "");

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState<DoctorForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function getDoctorName(data: Doctor): string {
    return (
      data.full_name ||
      data.name ||
      [data.first_name, data.last_name].filter(Boolean).join(" ") ||
      "Doctor"
    );
  }

  function populateForm(data: Doctor) {
    setForm({
      full_name: getDoctorName(data),
      specialization: data.specialization ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      bio: data.bio ?? "",
      experience_years:
        data.experience_years == null
          ? ""
          : String(data.experience_years),
      education: data.education ?? "",
      is_active: data.is_active ?? true,
    });
  }

  async function loadDoctor() {
    if (!doctorId) {
      setError("Doctor ID is missing from the URL.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await apiJson<Doctor>(
        `/doctors/${encodeURIComponent(doctorId)}`
      );

      setDoctor(data);
      populateForm(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load doctor details."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDoctor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  function updateField<K extends keyof DoctorForm>(
    field: K,
    value: DoctorForm[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveDoctor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!doctorId || saving) return;

    const fullName = form.full_name.trim();

    if (!fullName) {
      setError("Doctor name cannot be empty.");
      return;
    }

    let experience: number | null = null;

    if (form.experience_years.trim() !== "") {
      experience = Number(form.experience_years);

      if (
        !Number.isInteger(experience) ||
        experience < 0 ||
        experience > 80
      ) {
        setError("Experience must be a whole number between 0 and 80.");
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        full_name: fullName,
        specialization: form.specialization.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        bio: form.bio.trim() || null,
        experience_years: experience,
        education: form.education.trim() || null,
        is_active: form.is_active,
      };

      const updated = await apiJson<Doctor>(
        `/doctors/${encodeURIComponent(doctorId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      setDoctor(updated);
      populateForm(updated);
      setEditing(false);
      setSuccess("Doctor details updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save doctor details."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-3 py-24 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading doctor details...
        </div>
      </main>
    );
  }

  if (error && !doctor) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/doctors"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Doctors
          </Link>

          <div className="rounded-2xl border border-red-200 bg-white p-6">
            <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
            <h1 className="text-xl font-semibold text-slate-900">
              Could not load doctor
            </h1>
            <p className="mt-2 break-words text-sm text-red-600">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadDoctor()}
              className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!doctor) return null;

  const doctorName = getDoctorName(doctor);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/doctors"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Doctors
          </Link>

          <Link
            href={`/doctors/${encodeURIComponent(doctorId)}/schedule`}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <CalendarDays className="h-4 w-4" />
            Manage Schedule
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-8 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white">
                  <Stethoscope className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Doctor Profile</p>
                  <h1 className="mt-1 text-2xl font-bold text-white">
                    {doctorName}
                  </h1>
                  <p className="mt-1 text-sm text-blue-100">
                    {doctor.specialization || "Specialization not added"}
                  </p>
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  doctor.is_active === false
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {doctor.is_active === false ? "Inactive" : "Active"}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Personal Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Doctor contact and professional details
                </p>
              </div>

              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    populateForm(doctor);
                    setError("");
                    setSuccess("");
                    setEditing(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Details
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={saveDoctor} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Full Name *
                    </span>
                    <input
                      required
                      value={form.full_name}
                      onChange={(e) =>
                        updateField("full_name", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Dr. Amit Sharma"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Specialization
                    </span>
                    <input
                      value={form.specialization}
                      onChange={(e) =>
                        updateField("specialization", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="General Dentistry"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Phone
                    </span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="+91..."
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Email
                    </span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="doctor@clinic.com"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Experience (years)
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="80"
                      step="1"
                      value={form.experience_years}
                      onChange={(e) =>
                        updateField("experience_years", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="e.g. 5"
                    />
                  </label>

                  <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 p-3">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        updateField("is_active", e.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Doctor is active
                    </span>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Education / Qualifications
                  </span>
                  <textarea
                    rows={2}
                    value={form.education}
                    onChange={(e) =>
                      updateField("education", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="BDS, MDS, college or university"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Bio / Notes
                  </span>
                  <textarea
                    rows={4}
                    value={form.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Professional background or additional notes..."
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      populateForm(doctor);
                      setEditing(false);
                      setError("");
                    }}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  icon={<UserRound className="h-5 w-5" />}
                  label="Full Name"
                  value={doctorName}
                />
                <InfoCard
                  icon={<Stethoscope className="h-5 w-5" />}
                  label="Specialization"
                  value={doctor.specialization || "Not provided"}
                />
                <InfoCard
                  icon={<Phone className="h-5 w-5" />}
                  label="Phone"
                  value={doctor.phone || "Not provided"}
                />
                <InfoCard
                  icon={<Mail className="h-5 w-5" />}
                  label="Email"
                  value={doctor.email || "Not provided"}
                />
                <InfoCard
                  icon={<Clock className="h-5 w-5" />}
                  label="Experience"
                  value={
                    doctor.experience_years == null
                      ? "Not provided"
                      : `${doctor.experience_years} years`
                  }
                />
                <InfoCard
                  icon={<GraduationCap className="h-5 w-5" />}
                  label="Education"
                  value={doctor.education || "Not provided"}
                />

                <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Bio / Notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {doctor.bio || "No additional information available."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => router.push("/doctors")}
            className="text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            Return to Doctors List
          </button>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-medium text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}
