"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { apiJson, getOrganizationId } from "@/lib/api";

interface Patient {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  created_at?: string | null;
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function PatientsPage() {
  const organizationId = getOrganizationId();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");

  async function loadPatients() {
    if (!organizationId) {
      setError("Organization information is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await apiJson<unknown>(
        `/patients?organization_id=${organizationId}`
      );

      setPatients(extractArray<Patient>(response));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load patients."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    return patients
      .filter((patient) => {
        if (
          genderFilter !== "all" &&
          (patient.gender || "").toLowerCase() !==
            genderFilter.toLowerCase()
        ) {
          return false;
        }

        if (!search.trim()) return true;

        const text = [
          patient.full_name,
          patient.phone,
          patient.email,
          patient.gender,
          patient.address,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(search.toLowerCase());
      })
      .sort((a, b) =>
        a.full_name.localeCompare(b.full_name)
      );
  }, [patients, search, genderFilter]);

  const stats = useMemo(() => {
    return {
      total: patients.length,
      male: patients.filter(
        (patient) => patient.gender?.toLowerCase() === "male"
      ).length,
      female: patients.filter(
        (patient) => patient.gender?.toLowerCase() === "female"
      ).length,
      other: patients.filter(
        (patient) =>
          patient.gender &&
          !["male", "female"].includes(
            patient.gender.toLowerCase()
          )
      ).length,
    };
  }, [patients]);

  async function createPatient() {
    if (!fullName.trim()) {
      setError("Patient name is required.");
      return;
    }

    if (!organizationId) {
      setError("Organization information is missing.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await apiJson("/patients", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organizationId,
          full_name: fullName.trim(),
          phone: phone || null,
          email: email || null,
          gender: gender || null,
          date_of_birth: dateOfBirth || null,
          address: address || null,
        }),
      });

      setShowModal(false);

      setFullName("");
      setPhone("");
      setEmail("");
      setGender("");
      setDateOfBirth("");
      setAddress("");

      await loadPatients();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create patient."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Patient Management
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
                Patients
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Manage your clinic's patient database and contact information.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              + Add Patient
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total patients</p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.total}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Male patients</p>

              <p className="mt-2 text-3xl font-bold text-blue-600">
                {stats.male}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Female patients</p>

              <p className="mt-2 text-3xl font-bold text-purple-600">
                {stats.female}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Other</p>

              <p className="mt-2 text-3xl font-bold text-gray-700">
                {stats.other}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient name, phone, email..."
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">All genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Patient list */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Patient directory
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                {filteredPatients.length} patient
                {filteredPatients.length === 1 ? "" : "s"} shown
              </p>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-gray-500">
                Loading patients...
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                  👤
                </div>

                <h3 className="mt-4 font-semibold text-gray-900">
                  No patients found
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Add your first patient or change the search filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-4">Patient</th>
                      <th className="px-5 py-4">Contact</th>
                      <th className="px-5 py-4">Gender</th>
                      <th className="px-5 py-4">Date of birth</th>
                      <th className="px-5 py-4">Address</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredPatients.map((patient) => (
                      <tr
                        key={patient.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600">
                              {getInitials(
                                patient.full_name
                              )}
                            </div>

                            <div>
                              <div className="font-semibold text-gray-900">
                                {patient.full_name}
                              </div>

                              <div className="mt-1 text-xs text-gray-400">
                                Patient ID:{" "}
                                {patient.id.slice(0, 8)}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-sm text-gray-700">
                            {patient.phone || "—"}
                          </div>

                          <div className="mt-1 text-xs text-gray-500">
                            {patient.email || "No email"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm capitalize text-gray-700">
                          {patient.gender || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          {patient.date_of_birth
                            ? new Date(
                                patient.date_of_birth
                              ).toLocaleDateString("en-IN")
                            : "—"}
                        </td>

                        <td className="max-w-[200px] truncate px-5 py-4 text-sm text-gray-600">
                          {patient.address || "—"}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Add Patient Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Add patient
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Create a new patient profile.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 p-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Full name *
                  </label>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Patient full name"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Phone
                    </label>

                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Email
                    </label>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="patient@email.com"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Gender
                    </label>

                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Date of birth
                    </label>

                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) =>
                        setDateOfBirth(e.target.value)
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Address
                  </label>

                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    placeholder="Patient address"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={createPatient}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Add patient"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}