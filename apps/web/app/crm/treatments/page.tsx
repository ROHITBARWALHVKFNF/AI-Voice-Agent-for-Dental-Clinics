
"use client";

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  apiJson,
  getOrganizationId,
} from "@/lib/api";

// --------------------------------------------------
// Types
// --------------------------------------------------

type Treatment = {
  id: string;
  organization_id: string;
  treatment_code: string | null;
  name: string;
  category: string | null;
  description: string | null;
  default_price: number | string | null;
  estimated_duration_minutes: number | null;
  tax_percent: number | string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type TreatmentPlan = {
  id: string;
  organization_id: string;
  patient_id: string;
  doctor_id: string | null;
  name: string;
  status: string;
  notes: string | null;
  estimated_total: number | string | null;
  created_at: string;
  updated_at: string;
};

type PatientTreatment = {
  id: string;
  organization_id: string;
  patient_id: string;
  treatment_plan_id: string | null;
  treatment_id: string;
  doctor_id: string | null;
  status: string;
  price: number | string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Patient = {
  id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
};

type Doctor = {
  id: string;
  full_name: string;
};

type Tab = "plans" | "patient-treatments" | "catalog";

const PLAN_STATUSES = [
  "planned",
  "active",
  "completed",
  "cancelled",
];

const TREATMENT_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
  "on_hold",
];

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function money(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return `₹${numberValue.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function dateTime(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusLabel(status: string): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700";

    case "in_progress":
    case "active":
      return "bg-blue-100 text-blue-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    case "on_hold":
      return "bg-amber-100 text-amber-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function getPatientName(patient: Patient): string {
  return (
    patient.full_name ||
    `${patient.first_name || ""} ${patient.last_name || ""}`.trim() ||
    "Unknown Patient"
  );
}

// --------------------------------------------------
// Main page
// --------------------------------------------------

export default function TreatmentManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>("plans");

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [patientTreatments, setPatientTreatments] = useState<
    PatientTreatment[]
  >([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPatientTreatmentModal, setShowPatientTreatmentModal] =
    useState(false);

  // --------------------------------------------------
  // Load all treatment-management data
  // --------------------------------------------------

  const loadData = useCallback(async () => {
    const organizationId = getOrganizationId();

    if (!organizationId) {
      setError("Your clinic session is missing. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const organizationQuery = new URLSearchParams({
      organization_id: organizationId,
    }).toString();

    try {
      const [
        treatmentsData,
        plansData,
        patientTreatmentsData,
        patientsData,
        doctorsData,
      ] = await Promise.all([
        apiJson<Treatment[]>(
          `/treatments/catalog?${organizationQuery}&include_inactive=true`
        ),
        apiJson<Treatment[] extends never ? never : TreatmentPlan[]>(
          `/treatments/plans?${organizationQuery}`
        ),
        apiJson<PatientTreatment[]>(
          `/treatments/patient-treatments?${organizationQuery}`
        ),
        apiJson<Patient[]>(
          `/patients?${organizationQuery}`
        ),
        apiJson<Doctor[]>(
          `/doctors?${organizationQuery}`
        ),
      ]);

      if (
        !Array.isArray(treatmentsData) ||
        !Array.isArray(plansData) ||
        !Array.isArray(patientTreatmentsData) ||
        !Array.isArray(patientsData) ||
        !Array.isArray(doctorsData)
      ) {
        throw new Error(
          "The API returned an unexpected response. Check the treatment, patient and doctor endpoints."
        );
      }

      setTreatments(treatmentsData);
      setPlans(plansData);
      setPatientTreatments(patientTreatmentsData);

      setPatients(
        patientsData.map((patient) => ({
          ...patient,
          full_name: getPatientName(patient),
        }))
      );

      setDoctors(doctorsData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // --------------------------------------------------
  // Lookup maps
  // --------------------------------------------------

  const patientMap = useMemo(
    () =>
      new Map(
        patients.map((patient) => [
          patient.id,
          patient.full_name,
        ])
      ),
    [patients]
  );

  const doctorMap = useMemo(
    () =>
      new Map(
        doctors.map((doctor) => [
          doctor.id,
          doctor.full_name,
        ])
      ),
    [doctors]
  );

  const treatmentMap = useMemo(
    () =>
      new Map(
        treatments.map((treatment) => [
          treatment.id,
          treatment.name,
        ])
      ),
    [treatments]
  );

  // --------------------------------------------------
  // Dashboard statistics
  // --------------------------------------------------

  const plannedCount = patientTreatments.filter(
    (item) => item.status === "planned"
  ).length;

  const inProgressCount = patientTreatments.filter(
    (item) => item.status === "in_progress"
  ).length;

  const completedCount = patientTreatments.filter(
    (item) => item.status === "completed"
  ).length;

  const treatmentValue = patientTreatments.reduce((total, item) => {
    const price = Number(item.price ?? 0);
    return total + (Number.isFinite(price) ? price : 0);
  }, 0);

  // --------------------------------------------------
  // Search
  // --------------------------------------------------

  const normalizedSearch = search.trim().toLowerCase();

  const filteredTreatments = treatments.filter((treatment) => {
    const text = [
      treatment.name,
      treatment.treatment_code,
      treatment.category,
      treatment.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(normalizedSearch);
  });

  const filteredPlans = plans.filter((plan) => {
    const text = [
      plan.name,
      patientMap.get(plan.patient_id) || "",
      doctorMap.get(plan.doctor_id || "") || "",
      plan.status,
      plan.notes || "",
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(normalizedSearch);
  });

  const filteredPatientTreatments = patientTreatments.filter((item) => {
    const text = [
      patientMap.get(item.patient_id) || "",
      treatmentMap.get(item.treatment_id) || "",
      doctorMap.get(item.doctor_id || "") || "",
      item.status,
      item.notes || "",
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(normalizedSearch);
  });

  // --------------------------------------------------
  // Create treatment catalog entry
  // --------------------------------------------------

  async function createTreatment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const organizationId = getOrganizationId();

    if (!organizationId) {
      setError("Your clinic session is missing. Please log in again.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();

    if (!name) {
      setError("Treatment name is required.");
      return;
    }

    const priceValue = String(form.get("default_price") || "").trim();
    const durationValue = String(form.get("duration") || "").trim();
    const taxValue = String(form.get("tax_percent") || "").trim();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await apiJson<Treatment>("/treatments/catalog", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organizationId,
          treatment_code:
            String(form.get("treatment_code") || "").trim() || null,
          name,
          category:
            String(form.get("category") || "").trim() || null,
          description:
            String(form.get("description") || "").trim() || null,
          default_price:
            priceValue !== "" ? Number(priceValue) : null,
          estimated_duration_minutes:
            durationValue !== "" ? Number(durationValue) : null,
          tax_percent:
            taxValue !== "" ? Number(taxValue) : null,
          is_active: form.get("is_active") === "on",
        }),
      });

      setShowTreatmentModal(false);
      setSuccess("Treatment added to the clinic catalog.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // Create treatment plan
  // --------------------------------------------------

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const organizationId = getOrganizationId();

    if (!organizationId) {
      setError("Your clinic session is missing. Please log in again.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const patientId = String(form.get("patient_id") || "");
    const name = String(form.get("name") || "").trim();
    const totalValue = String(form.get("estimated_total") || "").trim();

    if (!patientId || !name) {
      setError("Please select a patient and enter a plan name.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await apiJson<TreatmentPlan>("/treatments/plans", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organizationId,
          patient_id: patientId,
          doctor_id: String(form.get("doctor_id") || "") || null,
          name,
          status: String(form.get("status") || "planned"),
          notes: String(form.get("notes") || "").trim() || null,
          estimated_total:
            totalValue !== "" ? Number(totalValue) : null,
        }),
      });

      setShowPlanModal(false);
      setSuccess("Treatment plan created successfully.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // Assign treatment to patient
  // --------------------------------------------------

  async function createPatientTreatment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const organizationId = getOrganizationId();

    if (!organizationId) {
      setError("Your clinic session is missing. Please log in again.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const patientId = String(form.get("patient_id") || "");
    const treatmentId = String(form.get("treatment_id") || "");
    const priceValue = String(form.get("price") || "").trim();

    if (!patientId || !treatmentId) {
      setError("Please select a patient and a treatment.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await apiJson<PatientTreatment>(
        "/treatments/patient-treatments",
        {
          method: "POST",
          body: JSON.stringify({
            organization_id: organizationId,
            patient_id: patientId,
            treatment_id: treatmentId,
            treatment_plan_id:
              String(form.get("treatment_plan_id") || "") || null,
            doctor_id: String(form.get("doctor_id") || "") || null,
            status: String(form.get("status") || "planned"),
            price: priceValue !== "" ? Number(priceValue) : null,
            notes: String(form.get("notes") || "").trim() || null,
          }),
        }
      );

      setShowPatientTreatmentModal(false);
      setSuccess("Treatment assigned to the patient.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // Update plan status
  // --------------------------------------------------

  async function updatePlanStatus(planId: string, status: string) {
    const organizationId = getOrganizationId();

    if (!organizationId) {
      setError("Your clinic session is missing. Please log in again.");
      return;
    }

    setUpdatingId(planId);
    setError("");
    setSuccess("");

    try {
      const params = new URLSearchParams({
        organization_id: organizationId,
      });

      await apiJson<TreatmentPlan>(
        `/treatments/plans/${planId}?${params.toString()}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

      setSuccess("Treatment plan status updated.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  // --------------------------------------------------
  // Update patient treatment status
  // --------------------------------------------------

  async function updatePatientTreatmentStatus(
    treatmentId: string,
    status: string
  ) {
    const organizationId = getOrganizationId();

    if (!organizationId) {
      setError("Your clinic session is missing. Please log in again.");
      return;
    }

    setUpdatingId(treatmentId);
    setError("");
    setSuccess("");

    try {
      const params = new URLSearchParams({
        organization_id: organizationId,
      });

      await apiJson<PatientTreatment>(
        `/treatments/patient-treatments/${treatmentId}?${params.toString()}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

      setSuccess("Patient treatment status updated.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  // --------------------------------------------------
  // Page UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-700">
              CRM / Treatments
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Treatment Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage the treatment catalog, patient treatment plans and
              ongoing procedures.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                setShowTreatmentModal(true);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              + Catalog Treatment
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                setShowPlanModal(true);
              }}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Treatment Plan
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                setShowPatientTreatmentModal(true);
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              + Patient Treatment
            </button>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="break-words">{error}</p>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="shrink-0 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <p>{success}</p>

            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
              className="shrink-0 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Planned" value={plannedCount} />
          <StatCard title="In Progress" value={inProgressCount} />
          <StatCard title="Completed" value={completedCount} />
          <StatCard title="Treatment Value" value={money(treatmentValue)} />
        </div>

        {/* Search */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label
            htmlFor="treatment-search"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Search current records
          </label>

          <input
            id="treatment-search"
            type="search"
            placeholder="Search treatments, patients or plans..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Tabs */}
        <div className="mb-4 flex overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <TabButton
            active={activeTab === "plans"}
            onClick={() => setActiveTab("plans")}
          >
            Treatment Plans ({plans.length})
          </TabButton>

          <TabButton
            active={activeTab === "patient-treatments"}
            onClick={() => setActiveTab("patient-treatments")}
          >
            Patient Treatments ({patientTreatments.length})
          </TabButton>

          <TabButton
            active={activeTab === "catalog"}
            onClick={() => setActiveTab("catalog")}
          >
            Treatment Catalog ({treatments.length})
          </TabButton>
        </div>

        {/* Main content */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading treatment data...
            </div>
          ) : (
            <>
              {activeTab === "plans" && (
                <TreatmentPlansTable
                  plans={filteredPlans}
                  patientMap={patientMap}
                  doctorMap={doctorMap}
                  updatingId={updatingId}
                  onStatusChange={updatePlanStatus}
                />
              )}

              {activeTab === "patient-treatments" && (
                <PatientTreatmentsTable
                  items={filteredPatientTreatments}
                  patientMap={patientMap}
                  doctorMap={doctorMap}
                  treatmentMap={treatmentMap}
                  updatingId={updatingId}
                  onStatusChange={updatePatientTreatmentStatus}
                />
              )}

              {activeTab === "catalog" && (
                <TreatmentCatalogTable
                  treatments={filteredTreatments}
                />
              )}
            </>
          )}
        </section>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh data"}
          </button>
        </div>
      </div>

      {/* Catalog treatment modal */}
      {showTreatmentModal && (
        <Modal
          title="Add Treatment to Clinic Catalog"
          onClose={() => {
            if (!saving) setShowTreatmentModal(false);
          }}
        >
          <form onSubmit={createTreatment} className="space-y-4">
            <Input
              name="treatment_code"
              label="Treatment Code"
              placeholder="RCT-001"
            />

            <Input
              name="name"
              label="Treatment Name"
              placeholder="Root Canal Treatment"
              required
            />

            <Input
              name="category"
              label="Category"
              placeholder="Endodontics"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                name="default_price"
                label="Clinic Price (₹)"
                type="number"
                min="0"
                step="0.01"
                placeholder="4500"
              />

              <Input
                name="tax_percent"
                label="Tax (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
              />
            </div>

            <Input
              name="duration"
              label="Estimated Duration (minutes)"
              type="number"
              min="5"
              max="480"
              placeholder="60"
            />

            <Textarea
              name="description"
              label="Description"
              placeholder="Describe this treatment..."
            />

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300"
              />
              Active treatment
            </label>

            <ModalActions
              onCancel={() => setShowTreatmentModal(false)}
              saving={saving}
              submitText="Create Treatment"
            />
          </form>
        </Modal>
      )}

      {/* Treatment plan modal */}
      {showPlanModal && (
        <Modal
          title="Create Treatment Plan"
          onClose={() => {
            if (!saving) setShowPlanModal(false);
          }}
        >
          <form onSubmit={createPlan} className="space-y-4">
            <Select
              name="patient_id"
              label="Patient"
              required
              options={patients.map((patient) => ({
                value: patient.id,
                label: patient.full_name,
              }))}
              placeholder="Select patient"
            />

            <Select
              name="doctor_id"
              label="Doctor"
              options={doctors.map((doctor) => ({
                value: doctor.id,
                label: doctor.full_name,
              }))}
              placeholder="No doctor assigned"
            />

            <Input
              name="name"
              label="Plan Name"
              placeholder="Complete Dental Treatment"
              required
            />

            <Select
              name="status"
              label="Status"
              options={PLAN_STATUSES.map((status) => ({
                value: status,
                label: statusLabel(status),
              }))}
            />

            <Input
              name="estimated_total"
              label="Estimated Total (₹)"
              type="number"
              min="0"
              step="0.01"
              placeholder="25000"
            />

            <Textarea
              name="notes"
              label="Notes"
              placeholder="Treatment plan notes..."
            />

            {patients.length === 0 && (
              <p className="text-sm text-amber-700">
                No patients are available. Add a patient before creating
                a plan.
              </p>
            )}

            <ModalActions
              onCancel={() => setShowPlanModal(false)}
              saving={saving}
              submitText="Create Plan"
            />
          </form>
        </Modal>
      )}

      {/* Patient treatment modal */}
      {showPatientTreatmentModal && (
        <Modal
          title="Assign Treatment to Patient"
          onClose={() => {
            if (!saving) setShowPatientTreatmentModal(false);
          }}
        >
          <form
            onSubmit={createPatientTreatment}
            className="space-y-4"
          >
            <Select
              name="patient_id"
              label="Patient"
              required
              options={patients.map((patient) => ({
                value: patient.id,
                label: patient.full_name,
              }))}
              placeholder="Select patient"
            />

            <Select
              name="treatment_id"
              label="Treatment"
              required
              options={treatments
                .filter((treatment) => treatment.is_active)
                .map((treatment) => ({
                  value: treatment.id,
                  label: `${treatment.name} — ${money(treatment.default_price)}`,
                }))}
              placeholder="Select treatment"
            />

            <Select
              name="treatment_plan_id"
              label="Treatment Plan"
              options={plans.map((plan) => ({
                value: plan.id,
                label: `${patientMap.get(plan.patient_id) || "Patient"} — ${plan.name}`,
              }))}
              placeholder="No treatment plan"
            />

            <Select
              name="doctor_id"
              label="Doctor"
              options={doctors.map((doctor) => ({
                value: doctor.id,
                label: doctor.full_name,
              }))}
              placeholder="No doctor assigned"
            />

            <Select
              name="status"
              label="Status"
              options={TREATMENT_STATUSES.map((status) => ({
                value: status,
                label: statusLabel(status),
              }))}
            />

            <Input
              name="price"
              label="Patient Price (₹)"
              type="number"
              min="0"
              step="0.01"
              placeholder="Use catalog price if left empty"
            />

            <Textarea
              name="notes"
              label="Notes"
              placeholder="Patient treatment notes..."
            />

            {(patients.length === 0 ||
              treatments.filter((item) => item.is_active).length === 0) && (
              <p className="text-sm text-amber-700">
                You need at least one patient and one active catalog
                treatment before assigning a treatment.
              </p>
            )}

            <ModalActions
              onCancel={() => setShowPatientTreatmentModal(false)}
              saving={saving}
              submitText="Assign Treatment"
            />
          </form>
        </Modal>
      )}
    </main>
  );
}

// --------------------------------------------------
// Reusable UI components
// --------------------------------------------------

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap px-5 py-4 text-sm font-semibold transition ${
        active
          ? "border-b-2 border-blue-600 text-blue-700"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function TreatmentPlansTable({
  plans,
  patientMap,
  doctorMap,
  updatingId,
  onStatusChange,
}: {
  plans: TreatmentPlan[];
  patientMap: Map<string, string>;
  doctorMap: Map<string, string>;
  updatingId: string | null;
  onStatusChange: (planId: string, status: string) => void;
}) {
  if (plans.length === 0) {
    return <EmptyState text="No treatment plans found." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-4">Plan</th>
            <th className="px-5 py-4">Patient</th>
            <th className="px-5 py-4">Doctor</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Estimated Total</th>
            <th className="px-5 py-4">Created</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {plans.map((plan) => (
            <tr key={plan.id} className="hover:bg-slate-50">
              <td className="px-5 py-4">
                <p className="font-semibold text-slate-900">{plan.name}</p>
                {plan.notes && (
                  <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                    {plan.notes}
                  </p>
                )}
              </td>

              <td className="px-5 py-4">
                {patientMap.get(plan.patient_id) || "Unknown patient"}
              </td>

              <td className="px-5 py-4">
                {plan.doctor_id
                  ? doctorMap.get(plan.doctor_id) || "Unknown doctor"
                  : "—"}
              </td>

              <td className="px-5 py-4">
                <select
                  aria-label={`Status for ${plan.name}`}
                  value={plan.status}
                  disabled={updatingId === plan.id}
                  onChange={(event) =>
                    onStatusChange(plan.id, event.target.value)
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold outline-none disabled:opacity-50 ${statusClass(plan.status)}`}
                >
                  {PLAN_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </td>

              <td className="px-5 py-4 font-semibold">
                {money(plan.estimated_total)}
              </td>

              <td className="px-5 py-4 text-slate-500">
                {dateTime(plan.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PatientTreatmentsTable({
  items,
  patientMap,
  doctorMap,
  treatmentMap,
  updatingId,
  onStatusChange,
}: {
  items: PatientTreatment[];
  patientMap: Map<string, string>;
  doctorMap: Map<string, string>;
  treatmentMap: Map<string, string>;
  updatingId: string | null;
  onStatusChange: (treatmentId: string, status: string) => void;
}) {
  if (items.length === 0) {
    return <EmptyState text="No patient treatments found." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[950px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-4">Patient</th>
            <th className="px-5 py-4">Treatment</th>
            <th className="px-5 py-4">Doctor</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Price</th>
            <th className="px-5 py-4">Started</th>
            <th className="px-5 py-4">Completed</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="px-5 py-4 font-medium text-slate-900">
                {patientMap.get(item.patient_id) || "Unknown patient"}
              </td>

              <td className="px-5 py-4">
                {treatmentMap.get(item.treatment_id) || "Unknown treatment"}
              </td>

              <td className="px-5 py-4">
                {item.doctor_id
                  ? doctorMap.get(item.doctor_id) || "Unknown doctor"
                  : "—"}
              </td>

              <td className="px-5 py-4">
                <select
                  aria-label={`Status for ${treatmentMap.get(item.treatment_id) || "treatment"}`}
                  value={item.status}
                  disabled={updatingId === item.id}
                  onChange={(event) =>
                    onStatusChange(item.id, event.target.value)
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold outline-none disabled:opacity-50 ${statusClass(item.status)}`}
                >
                  {TREATMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </td>

              <td className="px-5 py-4 font-semibold">
                {money(item.price)}
              </td>

              <td className="px-5 py-4 text-slate-500">
                {dateTime(item.started_at)}
              </td>

              <td className="px-5 py-4 text-slate-500">
                {dateTime(item.completed_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TreatmentCatalogTable({
  treatments,
}: {
  treatments: Treatment[];
}) {
  if (treatments.length === 0) {
    return <EmptyState text="No treatments in the clinic catalog." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-4">Code</th>
            <th className="px-5 py-4">Treatment</th>
            <th className="px-5 py-4">Category</th>
            <th className="px-5 py-4">Duration</th>
            <th className="px-5 py-4">Clinic Price</th>
            <th className="px-5 py-4">Tax</th>
            <th className="px-5 py-4">Status</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {treatments.map((treatment) => (
            <tr key={treatment.id} className="hover:bg-slate-50">
              <td className="px-5 py-4 font-mono text-xs">
                {treatment.treatment_code || "—"}
              </td>

              <td className="px-5 py-4">
                <p className="font-semibold text-slate-900">
                  {treatment.name}
                </p>
                {treatment.description && (
                  <p className="mt-1 max-w-sm truncate text-xs text-slate-500">
                    {treatment.description}
                  </p>
                )}
              </td>

              <td className="px-5 py-4">
                {treatment.category || "—"}
              </td>

              <td className="px-5 py-4">
                {treatment.estimated_duration_minutes
                  ? `${treatment.estimated_duration_minutes} min`
                  : "—"}
              </td>

              <td className="px-5 py-4 font-semibold">
                {money(treatment.default_price)}
              </td>

              <td className="px-5 py-4">
                {treatment.tax_percent !== null &&
                treatment.tax_percent !== undefined
                  ? `${treatment.tax_percent}%`
                  : "—"}
              </td>

              <td className="px-5 py-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    treatment.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {treatment.is_active ? "Active" : "Inactive"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        🦷
      </div>
      <p className="mt-4 text-sm font-medium text-slate-600">{text}</p>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="my-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="p-6">{children}</div>
      </section>
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-semibold text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function Textarea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <textarea
        id={name}
        name={name}
        rows={3}
        maxLength={2000}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function Select({
  label,
  name,
  options,
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  options: {
    value: string;
    label: string;
  }[];
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-semibold text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <select
        id={name}
        name={name}
        required={required}
        defaultValue=""
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">{placeholder || "Select an option"}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ModalActions({
  onCancel,
  saving,
  submitText,
}: {
  onCancel: () => void;
  saving: boolean;
  submitText: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : submitText}
      </button>
    </div>
  );
}
