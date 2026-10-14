"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { apiJson } from "@/lib/api";

interface Doctor {
  id: string;
  organization_id: string;
  full_name: string;
  specialization: string | null;
  phone: string | null;
  email: string | null;
  bio: string | null;
  is_active: boolean;
}

function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === "object") {
    const object = data as Record<string, unknown>;

    if (Array.isArray(object.items)) {
      return object.items as T[];
    }

    if (Array.isArray(object.data)) {
      return object.data as T[];
    }

    if (Array.isArray(object.results)) {
      return object.results as T[];
    }
  }

  return [];
}

export default function DoctorsPage() {
  const router = useRouter();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    specialization: "",
    phone: "",
    email: "",
    bio: "",
  });

  async function loadDoctors() {
    try {
      setLoading(true);

      const data = await apiJson<unknown>("/doctors");

      const doctorList = extractArray<Doctor>(data);

      setDoctors(doctorList);
    } catch (error) {
      console.error("Failed to load doctors:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load doctors."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return doctors;
    }

    return doctors.filter((doctor) => {
      return (
        doctor.full_name.toLowerCase().includes(query) ||
        doctor.specialization
          ?.toLowerCase()
          .includes(query) ||
        doctor.email
          ?.toLowerCase()
          .includes(query) ||
        doctor.phone
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [doctors, search]);

  async function handleAddDoctor(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.full_name.trim()) {
      alert("Please enter the doctor's name.");
      return;
    }

    try {
      setSaving(true);

      await apiJson<Doctor>("/doctors", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          specialization:
            form.specialization.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          bio: form.bio.trim() || null,
        }),
      });

      setForm({
        full_name: "",
        specialization: "",
        phone: "",
        email: "",
        bio: "",
      });

      setShowAddModal(false);

      await loadDoctors();
    } catch (error) {
      console.error("Failed to create doctor:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to create doctor."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Clinic Management
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
                Doctors
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Manage doctors and their appointment schedules.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              + Add Doctor
            </button>
          </div>

          {/* Statistics */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Total Doctors
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {doctors.length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Active Doctors
              </p>

              <p className="mt-2 text-3xl font-bold text-green-600">
                {doctors.filter(
                  (doctor) => doctor.is_active
                ).length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Specializations
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-600">
                {
                  new Set(
                    doctors
                      .map(
                        (doctor) =>
                          doctor.specialization
                      )
                      .filter(Boolean)
                  ).size
                }
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search doctors by name, specialization, email or phone..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                Loading doctors...
              </p>
            </div>
          )}

          {/* Empty */}
          {!loading && filteredDoctors.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
                🦷
              </div>

              <h2 className="mt-5 text-lg font-semibold text-gray-900">
                No doctors found
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Add your first doctor to start managing
                appointments.
              </p>

              <button
                type="button"
                onClick={() =>
                  setShowAddModal(true)
                }
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Add Doctor
              </button>
            </div>
          )}

          {/* Doctor Cards */}
          {!loading && filteredDoctors.length > 0 && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredDoctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  {/* Doctor heading */}
                  <div className="flex items-start justify-between gap-4">

                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                        {doctor.full_name
                          .split(" ")
                          .map(
                            (name) => name[0]
                          )
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>

                      <div>
                        <h2 className="font-semibold text-gray-900">
                          {doctor.full_name}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          {doctor.specialization ||
                            "Dental Doctor"}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                      Active
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-6 space-y-3 border-t border-gray-100 pt-5">

                    {doctor.email && (
                      <div>
                        <p className="text-xs text-gray-400">
                          Email
                        </p>

                        <p className="mt-1 truncate text-sm font-medium text-gray-800">
                          {doctor.email}
                        </p>
                      </div>
                    )}

                    {doctor.phone && (
                      <div>
                        <p className="text-xs text-gray-400">
                          Phone
                        </p>

                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {doctor.phone}
                        </p>
                      </div>
                    )}

                    {doctor.bio && (
                      <div>
                        <p className="text-xs text-gray-400">
                          Bio
                        </p>

                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                          {doctor.bio}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Schedule button */}
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/doctors/${doctor.id}/schedule`
                      )
                    }
                    className="mt-6 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Manage Schedule
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Add Doctor
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Add a doctor to your clinic.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddModal(false)
                }
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleAddDoctor}
              className="space-y-5 p-6"
            >

              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Full Name
                </label>

                <input
                  required
                  value={form.full_name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      full_name:
                        event.target.value,
                    })
                  }
                  placeholder="Dr. Rahul Sharma"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Specialization */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Specialization
                </label>

                <input
                  value={form.specialization}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      specialization:
                        event.target.value,
                    })
                  }
                  placeholder="General Dentistry"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                  placeholder="doctor@example.com"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Phone
                </label>

                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone: event.target.value,
                    })
                  }
                  placeholder="+91 9876543210"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Bio
                </label>

                <textarea
                  rows={3}
                  value={form.bio}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      bio: event.target.value,
                    })
                  }
                  placeholder="Short doctor profile..."
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setShowAddModal(false)
                  }
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Adding..."
                    : "Add Doctor"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}