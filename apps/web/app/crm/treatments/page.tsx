
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DollarSign,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { apiJson, getOrganizationId } from "@/lib/api";

type CatalogTreatment = {
  id: string;
  organization_id: string;
  treatment_code?: string | null;
  name: string;
  category?: string | null;
  description?: string | null;
  default_price?: number | string | null;
  estimated_duration_minutes?: number | null;
  tax_percent?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type TreatmentPlan = {
  id: string;
  organization_id: string;
  patient_id: string;
  doctor_id?: string | null;
  name: string;
  status: "planned" | "active" | "completed" | "cancelled";
  notes?: string | null;
  estimated_total?: number | string | null;
  created_at?: string;
  updated_at?: string;
};

type PatientTreatment = {
  id: string;
  organization_id: string;
  patient_id: string;
  treatment_plan_id?: string | null;
  treatment_id: string;
  doctor_id?: string | null;
  status: "planned" | "in_progress" | "completed" | "cancelled" | "on_hold";
  price?: number | string | null;
  notes?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type Patient = {
  id: string;
  full_name?: string;
  name?: string;
  phone?: string;
  email?: string;
};

type Doctor = {
  id: string;
  full_name?: string;
  name?: string;
  doctor_name?: string;
  specialization?: string;
};

type Tab = "catalog" | "plans" | "patient-treatments";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50";

function records<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    for (const key of [
      "items",
      "results",
      "data",
      "patients",
      "doctors",
      "treatments",
      "plans",
      "patient_treatments",
    ]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }

  return [];
}

function toNumber(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number | string | null | undefined): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function personName(person?: Patient | Doctor | null): string {
  if (!person) return "Unassigned";
  return (
    person.full_name ||
    person.name ||
    ("doctor_name" in person ? person.doctor_name : undefined) ||
    person.id
  );
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700";
    case "active":
    case "in_progress":
      return "bg-blue-50 text-blue-700";
    case "cancelled":
      return "bg-rose-50 text-rose-700";
    case "on_hold":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <ClipboardList className="h-6 w-6 text-slate-500" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function TreatmentsPage() {
  const [tab, setTab] = useState<Tab>("catalog");
  const [catalog, setCatalog] = useState<CatalogTreatment[]>([]);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [patientTreatments, setPatientTreatments] = useState<PatientTreatment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);

  const [editingTreatment, setEditingTreatment] =
    useState<CatalogTreatment | null>(null);

  const [catalogForm, setCatalogForm] = useState({
    treatment_code: "",
    name: "",
    category: "",
    description: "",
    default_price: "",
    estimated_duration_minutes: "30",
    tax_percent: "0",
    is_active: true,
  });

  const [planForm, setPlanForm] = useState({
    patient_id: "",
    doctor_id: "",
    name: "",
    status: "planned",
    notes: "",
    estimated_total: "",
  });

  const [assignmentForm, setAssignmentForm] = useState({
    patient_id: "",
    treatment_plan_id: "",
    treatment_id: "",
    doctor_id: "",
    status: "planned",
    price: "",
    notes: "",
  });

  const [editingAssignment, setEditingAssignment] =
    useState<PatientTreatment | null>(null);

  const organizationId = useMemo(() => getOrganizationId(), []);

  const patientMap = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );

  const doctorMap = useMemo(
    () => new Map(doctors.map((doctor) => [doctor.id, doctor])),
    [doctors],
  );

  const catalogMap = useMemo(
    () => new Map(catalog.map((item) => [item.id, item])),
    [catalog],
  );

  const planMap = useMemo(
    () => new Map(plans.map((plan) => [plan.id, plan])),
    [plans],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      if (!organizationId) {
        throw new Error(
          "Your organization ID is missing. Please sign in again and reopen Treatments.",
        );
      }

      const orgQuery = `organization_id=${encodeURIComponent(organizationId)}`;

      const [
        catalogResult,
        plansResult,
        patientTreatmentsResult,
        patientsResult,
        doctorsResult,
      ] = await Promise.all([
        apiJson<unknown>(`/treatments/catalog?${orgQuery}&include_inactive=true`),
        apiJson<unknown>(`/treatments/plans?${orgQuery}`),
        apiJson<unknown>(`/treatments/patient-treatments?${orgQuery}`),
        apiJson<unknown>("/patients"),
        apiJson<unknown>("/doctors"),
      ]);

      setCatalog(records<CatalogTreatment>(catalogResult));
      setPlans(records<TreatmentPlan>(plansResult));
      setPatientTreatments(records<PatientTreatment>(patientTreatmentsResult));

      const normalizedPatients = records<Record<string, unknown>>(patientsResult)
        .map((item) => {
          const id = item.id ?? item.patient_id;
          if (id == null) return null;

          return {
            ...item,
            id: String(id),
            full_name:
              typeof item.full_name === "string" ? item.full_name : undefined,
            name: typeof item.name === "string" ? item.name : undefined,
            phone: typeof item.phone === "string" ? item.phone : undefined,
            email: typeof item.email === "string" ? item.email : undefined,
          } as Patient;
        })
        .filter((item): item is Patient => item !== null);

      const normalizedDoctors = records<Record<string, unknown>>(doctorsResult)
        .map((item) => {
          const id = item.id ?? item.doctor_id;
          if (id == null) return null;

          return {
            ...item,
            id: String(id),
            full_name:
              typeof item.full_name === "string" ? item.full_name : undefined,
            name: typeof item.name === "string" ? item.name : undefined,
            doctor_name:
              typeof item.doctor_name === "string"
                ? item.doctor_name
                : undefined,
            specialization:
              typeof item.specialization === "string"
                ? item.specialization
                : undefined,
          } as Doctor;
        })
        .filter((item): item is Doctor => item !== null);

      setPatients(normalizedPatients);
      setDoctors(normalizedDoctors);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load treatment data.",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLowerCase();

    return catalog.filter((item) => {
      const matchesSearch =
        !query ||
        [item.name, item.category, item.treatment_code, item.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.is_active) ||
        (statusFilter === "inactive" && !item.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [catalog, search, statusFilter]);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return plans.filter((plan) => {
      const patient = personName(patientMap.get(plan.patient_id));
      const matchesSearch =
        !query ||
        plan.name.toLowerCase().includes(query) ||
        patient.toLowerCase().includes(query);

      return (
        matchesSearch &&
        (statusFilter === "all" || plan.status === statusFilter)
      );
    });
  }, [plans, search, statusFilter, patientMap]);

  const filteredPatientTreatments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return patientTreatments.filter((item) => {
      const patient = personName(patientMap.get(item.patient_id));
      const treatmentName = catalogMap.get(item.treatment_id)?.name || "";

      const matchesSearch =
        !query ||
        patient.toLowerCase().includes(query) ||
        treatmentName.toLowerCase().includes(query) ||
        (item.notes || "").toLowerCase().includes(query);

      return (
        matchesSearch &&
        (statusFilter === "all" || item.status === statusFilter)
      );
    });
  }, [patientTreatments, search, statusFilter, patientMap, catalogMap]);

  const activeCatalogCount = catalog.filter((item) => item.is_active).length;
  const activePlanCount = plans.filter((item) => item.status === "active").length;
  const inProgressCount = patientTreatments.filter(
    (item) => item.status === "in_progress",
  ).length;
  const completedCount = patientTreatments.filter(
    (item) => item.status === "completed",
  ).length;

  const plannedValue = patientTreatments
    .filter((item) => item.status === "planned" || item.status === "in_progress")
    .reduce((sum, item) => sum + toNumber(item.price), 0);

  function openNewCatalogForm() {
    setEditingTreatment(null);
    setCatalogForm({
      treatment_code: "",
      name: "",
      category: "",
      description: "",
      default_price: "",
      estimated_duration_minutes: "30",
      tax_percent: "0",
      is_active: true,
    });
    setShowCatalogForm(true);
  }

  function openEditCatalogForm(item: CatalogTreatment) {
    setEditingTreatment(item);
    setCatalogForm({
      treatment_code: item.treatment_code || "",
      name: item.name,
      category: item.category || "",
      description: item.description || "",
      default_price:
        item.default_price == null ? "" : String(item.default_price),
      estimated_duration_minutes:
        item.estimated_duration_minutes == null
          ? "30"
          : String(item.estimated_duration_minutes),
      tax_percent: String(item.tax_percent ?? 0),
      is_active: item.is_active,
    });
    setShowCatalogForm(true);
  }

  async function saveCatalogTreatment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const body = {
        organization_id: organizationId,
        treatment_code: catalogForm.treatment_code.trim() || null,
        name: catalogForm.name.trim(),
        category: catalogForm.category.trim() || null,
        description: catalogForm.description.trim() || null,
        default_price:
          catalogForm.default_price.trim() === ""
            ? null
            : Number(catalogForm.default_price),
        estimated_duration_minutes:
          catalogForm.estimated_duration_minutes.trim() === ""
            ? null
            : Number(catalogForm.estimated_duration_minutes),
        tax_percent: Number(catalogForm.tax_percent || 0),
        is_active: catalogForm.is_active,
      };

      if (!body.name) throw new Error("Enter a treatment name.");

      if (
        body.default_price != null &&
        (!Number.isFinite(body.default_price) || body.default_price < 0)
      ) {
        throw new Error("Enter a valid non-negative price.");
      }

      if (
        body.estimated_duration_minutes != null &&
        (!Number.isFinite(body.estimated_duration_minutes) ||
          body.estimated_duration_minutes <= 0)
      ) {
        throw new Error("Duration must be greater than zero.");
      }

      if (editingTreatment) {
        await apiJson<unknown>(
          `/treatments/catalog/${encodeURIComponent(editingTreatment.id)}?organization_id=${encodeURIComponent(organizationId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          },
        );
        setNotice("Treatment updated successfully.");
      } else {
        await apiJson<unknown>("/treatments/catalog", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setNotice("Treatment added to the catalog.");
      }

      setShowCatalogForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save treatment.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCatalogTreatment(item: CatalogTreatment) {
    if (!organizationId) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await apiJson<unknown>(
        `/treatments/catalog/${encodeURIComponent(item.id)}?organization_id=${encodeURIComponent(organizationId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: !item.is_active }),
        },
      );

      setNotice(
        item.is_active
          ? "Treatment deactivated. Existing patient records are preserved."
          : "Treatment activated.",
      );

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update treatment.");
    } finally {
      setSaving(false);
    }
  }

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (!planForm.patient_id) throw new Error("Select a patient.");
      if (!planForm.name.trim()) throw new Error("Enter a plan name.");

      const body = {
        organization_id: organizationId,
        patient_id: planForm.patient_id,
        doctor_id: planForm.doctor_id || null,
        name: planForm.name.trim(),
        status: planForm.status,
        notes: planForm.notes.trim() || null,
        estimated_total:
          planForm.estimated_total.trim() === ""
            ? null
            : Number(planForm.estimated_total),
      };

      if (
        body.estimated_total != null &&
        (!Number.isFinite(body.estimated_total) || body.estimated_total < 0)
      ) {
        throw new Error("Enter a valid estimated total.");
      }

      await apiJson<unknown>("/treatments/plans", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setShowPlanForm(false);
      setPlanForm({
        patient_id: "",
        doctor_id: "",
        name: "",
        status: "planned",
        notes: "",
        estimated_total: "",
      });

      setNotice("Treatment plan created.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create plan.");
    } finally {
      setSaving(false);
    }
  }

  function openAssignmentForm() {
    setEditingAssignment(null);
    setAssignmentForm({
      patient_id: "",
      treatment_plan_id: "",
      treatment_id: "",
      doctor_id: "",
      status: "planned",
      price: "",
      notes: "",
    });
    setShowAssignmentForm(true);
  }

  function openEditAssignment(item: PatientTreatment) {
    setEditingAssignment(item);
    setAssignmentForm({
      patient_id: item.patient_id,
      treatment_plan_id: item.treatment_plan_id || "",
      treatment_id: item.treatment_id,
      doctor_id: item.doctor_id || "",
      status: item.status,
      price: item.price == null ? "" : String(item.price),
      notes: item.notes || "",
    });
    setShowAssignmentForm(true);
  }

  async function saveAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (!editingAssignment && !assignmentForm.patient_id) {
        throw new Error("Select a patient.");
      }
      if (!assignmentForm.treatment_id) throw new Error("Select a treatment.");

      const body = {
        organization_id: organizationId,
        ...(editingAssignment
          ? {}
          : {
              patient_id: assignmentForm.patient_id,
              treatment_id: assignmentForm.treatment_id,
            }),
        treatment_plan_id: assignmentForm.treatment_plan_id || null,
        doctor_id: assignmentForm.doctor_id || null,
        status: assignmentForm.status,
        price:
          assignmentForm.price.trim() === ""
            ? null
            : Number(assignmentForm.price),
        notes: assignmentForm.notes.trim() || null,
      };

      if (
        body.price != null &&
        (!Number.isFinite(body.price) || body.price < 0)
      ) {
        throw new Error("Enter a valid non-negative price.");
      }

      if (editingAssignment) {
        await apiJson<unknown>(
          `/treatments/patient-treatments/${encodeURIComponent(editingAssignment.id)}?organization_id=${encodeURIComponent(organizationId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          },
        );
        setNotice("Patient treatment updated.");
      } else {
        await apiJson<unknown>("/treatments/patient-treatments", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setNotice("Treatment assigned to the patient.");
      }

      setShowAssignmentForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save patient treatment.");
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "catalog", label: "Treatment Catalog", count: catalog.length },
    { id: "plans", label: "Treatment Plans", count: plans.length },
    {
      id: "patient-treatments",
      label: "Patient Treatments",
      count: patientTreatments.length,
    },
  ];

  const currentSearchPlaceholder =
    tab === "catalog"
      ? "Search treatments, codes or categories..."
      : tab === "plans"
        ? "Search plans or patients..."
        : "Search patients or treatments...";

  return (
    <AppShell>
      <main className="min-h-screen bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Stethoscope className="h-4 w-4" />
                Patient Management
                <span>/</span>
                <span className="font-medium text-slate-700">Treatments</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Treatments
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage your clinic&apos;s treatment catalog, patient plans and
                treatment progress.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading || saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              {tab === "catalog" && (
                <button
                  type="button"
                  onClick={openNewCatalogForm}
                  className={buttonClass}
                >
                  <Plus className="h-4 w-4" />
                  Add Treatment
                </button>
              )}
              {tab === "plans" && (
                <button
                  type="button"
                  onClick={() => setShowPlanForm(true)}
                  className={buttonClass}
                >
                  <Plus className="h-4 w-4" />
                  Create Plan
                </button>
              )}
              {tab === "patient-treatments" && (
                <button
                  type="button"
                  onClick={openAssignmentForm}
                  className={buttonClass}
                >
                  <Plus className="h-4 w-4" />
                  Assign Treatment
                </button>
              )}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Something went wrong</p>
                <p className="mt-1 break-words">{error}</p>
              </div>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {notice && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{notice}</span>
              <button
                type="button"
                className="ml-auto"
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Active Treatments
                </span>
                <div className="rounded-xl bg-teal-50 p-2.5">
                  <Stethoscope className="h-5 w-5 text-teal-700" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {loading ? "—" : activeCatalogCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Available in your clinic catalog
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Active Plans
                </span>
                <div className="rounded-xl bg-blue-50 p-2.5">
                  <ClipboardList className="h-5 w-5 text-blue-700" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {loading ? "—" : activePlanCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Plans currently marked active
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  In Progress
                </span>
                <div className="rounded-xl bg-amber-50 p-2.5">
                  <Activity className="h-5 w-5 text-amber-700" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {loading ? "—" : inProgressCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Patient treatments underway
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Planned Value
                </span>
                <div className="rounded-xl bg-violet-50 p-2.5">
                  <DollarSign className="h-5 w-5 text-violet-700" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-900">
                {loading ? "—" : money(plannedValue)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Planned and in-progress treatment prices
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 pt-2 sm:px-6">
              <div className="flex gap-5 overflow-x-auto">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTab(item.id);
                      setSearch("");
                      setStatusFilter("all");
                      setError("");
                      setNotice("");
                    }}
                    className={`relative flex shrink-0 items-center gap-2 py-4 text-sm font-semibold transition ${
                      tab === item.id
                        ? "text-teal-800"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {item.label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        tab === item.id
                          ? "bg-teal-100 text-teal-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.count}
                    </span>
                    {tab === item.id && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-700" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={currentSearchPlaceholder}
                  className={`${inputClass} pl-9`}
                  aria-label="Search treatments"
                />
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="treatment-status-filter"
                  className="whitespace-nowrap text-sm text-slate-500"
                >
                  Status
                </label>
                <select
                  id="treatment-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={`${inputClass} min-w-36`}
                >
                  <option value="all">All statuses</option>
                  {(
                    tab === "catalog"
                      ? ["active", "inactive"]
                      : tab === "plans"
                        ? ["planned", "active", "completed", "cancelled"]
                        : [
                            "planned",
                            "in_progress",
                            "completed",
                            "cancelled",
                            "on_hold",
                          ]
                  ).map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 px-5 py-16 text-sm text-slate-500">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Loading treatment records...
              </div>
            ) : tab === "catalog" ? (
              filteredCatalog.length === 0 ? (
                <EmptyState
                  title={search ? "No matching treatments" : "Your catalog is empty"}
                  description={
                    search
                      ? "Try a different search term or filter."
                      : "Add your clinic's services, prices and estimated durations to get started."
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-6 py-3.5 font-semibold">Treatment</th>
                        <th className="px-5 py-3.5 font-semibold">Category</th>
                        <th className="px-5 py-3.5 font-semibold">Duration</th>
                        <th className="px-5 py-3.5 font-semibold">Price</th>
                        <th className="px-5 py-3.5 font-semibold">Status</th>
                        <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCatalog.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">{item.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.treatment_code || "No code"}
                              {item.description ? ` · ${item.description}` : ""}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {item.category || "—"}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 className="h-4 w-4 text-slate-400" />
                              {item.estimated_duration_minutes
                                ? `${item.estimated_duration_minutes} min`
                                : "—"}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {money(item.default_price)}
                            {toNumber(item.tax_percent) > 0 && (
                              <p className="mt-1 text-xs font-normal text-slate-500">
                                Tax: {item.tax_percent}%
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <StatusPill status={item.is_active ? "active" : "inactive"} />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditCatalogForm(item)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void toggleCatalogTreatment(item)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                              >
                                {item.is_active ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : tab === "plans" ? (
              filteredPlans.length === 0 ? (
                <EmptyState
                  title={search ? "No matching plans" : "No treatment plans yet"}
                  description="Create a treatment plan for a patient to organize their care."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-6 py-3.5 font-semibold">Plan</th>
                        <th className="px-5 py-3.5 font-semibold">Patient</th>
                        <th className="px-5 py-3.5 font-semibold">Doctor</th>
                        <th className="px-5 py-3.5 font-semibold">Estimated total</th>
                        <th className="px-5 py-3.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPlans.map((plan) => (
                        <tr key={plan.id} className="hover:bg-slate-50/70">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">{plan.name}</p>
                            {plan.notes && (
                              <p className="mt-1 max-w-sm truncate text-xs text-slate-500">
                                {plan.notes}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {personName(patientMap.get(plan.patient_id))}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {personName(
                              plan.doctor_id ? doctorMap.get(plan.doctor_id) : null,
                            )}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {money(plan.estimated_total)}
                          </td>
                          <td className="px-5 py-4">
                            <StatusPill status={plan.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : filteredPatientTreatments.length === 0 ? (
              <EmptyState
                title={search ? "No matching patient treatments" : "No patient treatments yet"}
                description="Assign a treatment from the catalog to begin tracking patient progress."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Patient / Treatment</th>
                      <th className="px-5 py-3.5 font-semibold">Plan</th>
                      <th className="px-5 py-3.5 font-semibold">Doctor</th>
                      <th className="px-5 py-3.5 font-semibold">Price</th>
                      <th className="px-5 py-3.5 font-semibold">Status</th>
                      <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatientTreatments.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">
                            {personName(patientMap.get(item.patient_id))}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {catalogMap.get(item.treatment_id)?.name ||
                              "Unknown treatment"}
                          </p>
                          {item.notes && (
                            <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                              {item.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {item.treatment_plan_id
                            ? planMap.get(item.treatment_plan_id)?.name || "Plan"
                            : "—"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {personName(
                            item.doctor_id ? doctorMap.get(item.doctor_id) : null,
                          )}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {money(item.price)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusPill status={item.status} />
                          {item.started_at && (
                            <p className="mt-1 text-xs text-slate-400">
                              Started {new Date(item.started_at).toLocaleDateString("en-IN")}
                            </p>
                          )}
                          {item.completed_at && (
                            <p className="mt-1 text-xs text-slate-400">
                              Completed {new Date(item.completed_at).toLocaleDateString("en-IN")}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEditAssignment(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {tab === "catalog"
                  ? `${filteredCatalog.length} catalog treatments`
                  : tab === "plans"
                    ? `${filteredPlans.length} treatment plans`
                    : `${filteredPatientTreatments.length} patient treatments`}
              </span>
              <span>
                {completedCount} completed patient treatments across all records
              </span>
            </div>
          </div>
        </div>

        {showCatalogForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingTreatment ? "Edit Treatment" : "Add Treatment"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Define a service offered by your clinic.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCatalogForm(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close form"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={saveCatalogTreatment} className="space-y-5 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Treatment name *
                    <input
                      required
                      className={inputClass}
                      value={catalogForm.name}
                      onChange={(e) =>
                        setCatalogForm({ ...catalogForm, name: e.target.value })
                      }
                      placeholder="e.g. Dental cleaning"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Treatment code
                    <input
                      className={inputClass}
                      value={catalogForm.treatment_code}
                      onChange={(e) =>
                        setCatalogForm({
                          ...catalogForm,
                          treatment_code: e.target.value,
                        })
                      }
                      placeholder="e.g. CLEAN-01"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Category
                    <input
                      className={inputClass}
                      value={catalogForm.category}
                      onChange={(e) =>
                        setCatalogForm({ ...catalogForm, category: e.target.value })
                      }
                      placeholder="e.g. Preventive"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Default price (₹)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      value={catalogForm.default_price}
                      onChange={(e) =>
                        setCatalogForm({
                          ...catalogForm,
                          default_price: e.target.value,
                        })
                      }
                      placeholder="e.g. 1500"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Estimated duration (minutes)
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className={inputClass}
                      value={catalogForm.estimated_duration_minutes}
                      onChange={(e) =>
                        setCatalogForm({
                          ...catalogForm,
                          estimated_duration_minutes: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Tax (%)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      value={catalogForm.tax_percent}
                      onChange={(e) =>
                        setCatalogForm({
                          ...catalogForm,
                          tax_percent: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                  Description
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={catalogForm.description}
                    onChange={(e) =>
                      setCatalogForm({
                        ...catalogForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe this treatment..."
                  />
                </label>

                <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={catalogForm.is_active}
                    onChange={(e) =>
                      setCatalogForm({
                        ...catalogForm,
                        is_active: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-teal-700"
                  />
                  Available for new patient treatments
                </label>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCatalogForm(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className={buttonClass}>
                    {saving ? "Saving..." : editingTreatment ? "Save Changes" : "Add Treatment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showPlanForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Create Treatment Plan</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Organize a patient&apos;s planned care.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlanForm(false)}
                  aria-label="Close form"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={savePlan} className="space-y-5 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Patient *
                    <select
                      required
                      className={inputClass}
                      value={planForm.patient_id}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, patient_id: e.target.value })
                      }
                    >
                      <option value="">Select patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {personName(patient)}
                          {patient.phone ? ` · ${patient.phone}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Assigned doctor
                    <select
                      className={inputClass}
                      value={planForm.doctor_id}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, doctor_id: e.target.value })
                      }
                    >
                      <option value="">Not assigned</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {personName(doctor)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                    Plan name *
                    <input
                      required
                      className={inputClass}
                      value={planForm.name}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, name: e.target.value })
                      }
                      placeholder="e.g. Initial dental care plan"
                    />
                  </label>

                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Status
                    <select
                      className={inputClass}
                      value={planForm.status}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, status: e.target.value })
                      }
                    >
                      <option value="planned">Planned</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>

                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Estimated total (₹)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      value={planForm.estimated_total}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          estimated_total: e.target.value,
                        })
                      }
                      placeholder="e.g. 8000"
                    />
                  </label>
                </div>

                <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                  Notes
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={planForm.notes}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, notes: e.target.value })
                    }
                    placeholder="Plan notes..."
                  />
                </label>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPlanForm(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className={buttonClass}>
                    {saving ? "Creating..." : "Create Plan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAssignmentForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingAssignment ? "Update Patient Treatment" : "Assign Patient Treatment"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Track the treatment, responsible doctor and progress.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAssignmentForm(false)}
                  aria-label="Close form"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={saveAssignment} className="space-y-5 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {!editingAssignment && (
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Patient *
                      <select
                        required
                        className={inputClass}
                        value={assignmentForm.patient_id}
                        onChange={(e) =>
                          setAssignmentForm({
                            ...assignmentForm,
                            patient_id: e.target.value,
                            treatment_plan_id: "",
                          })
                        }
                      >
                        <option value="">Select patient</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {personName(patient)}
                            {patient.phone ? ` · ${patient.phone}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Treatment *
                    <select
                      required
                      disabled={Boolean(editingAssignment)}
                      className={inputClass}
                      value={assignmentForm.treatment_id}
                      onChange={(e) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          treatment_id: e.target.value,
                          price:
                            catalogMap.get(e.target.value)?.default_price == null
                              ? ""
                              : String(catalogMap.get(e.target.value)?.default_price),
                        })
                      }
                    >
                      <option value="">Select treatment</option>
                      {catalog
                        .filter((item) => item.is_active || item.id === editingAssignment?.treatment_id)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} — {money(item.default_price)}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Treatment plan
                    <select
                      className={inputClass}
                      value={assignmentForm.treatment_plan_id}
                      onChange={(e) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          treatment_plan_id: e.target.value,
                        })
                      }
                    >
                      <option value="">No plan linked</option>
                      {plans
                        .filter(
                          (plan) =>
                            plan.status !== "cancelled" &&
                            (!assignmentForm.patient_id ||
                              plan.patient_id === assignmentForm.patient_id),
                        )
                        .map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Assigned doctor
                    <select
                      className={inputClass}
                      value={assignmentForm.doctor_id}
                      onChange={(e) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          doctor_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Not assigned</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {personName(doctor)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Price (₹)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      value={assignmentForm.price}
                      onChange={(e) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          price: e.target.value,
                        })
                      }
                      placeholder="Leave blank to use catalog price"
                    />
                  </label>

                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Treatment status
                    <select
                      className={inputClass}
                      value={assignmentForm.status}
                      onChange={(e) =>
                        setAssignmentForm({
                          ...assignmentForm,
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="planned">Planned</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>
                </div>

                <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                  Notes
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={assignmentForm.notes}
                    onChange={(e) =>
                      setAssignmentForm({ ...assignmentForm, notes: e.target.value })
                    }
                    placeholder="Progress notes..."
                  />
                </label>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAssignmentForm(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className={buttonClass}>
                    {saving
                      ? "Saving..."
                      : editingAssignment
                        ? "Save Changes"
                        : "Assign Treatment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
