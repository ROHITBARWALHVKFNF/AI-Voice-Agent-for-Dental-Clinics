
"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  LoaderCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import {
  apiJson,
  getOrganizationId,
} from "@/lib/api";

// --------------------------------------------------
// Types
// --------------------------------------------------

type FollowUpStatus = "pending" | "completed" | "cancelled";

type FollowUpType =
  | "general"
  | "appointment"
  | "treatment"
  | "payment"
  | "recall"
  | "post_treatment"
  | "missed_appointment"
  | "lead";

interface Patient {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
}

interface FollowUp {
  id: string;
  organization_id: string;
  patient_id: string;
  assigned_to_user_id?: string | null;
  follow_up_type: FollowUpType;
  due_at: string;
  status: FollowUpStatus;
  notes?: string | null;
  completed_at?: string | null;
  patient_name: string;
}

interface FollowUpForm {
  patient_id: string;
  follow_up_type: FollowUpType;
  due_at: string;
  notes: string;
}

type StatusFilter = "all" | FollowUpStatus;

// --------------------------------------------------
// Constants and helpers
// --------------------------------------------------

const FOLLOW_UP_TYPES: {
  value: FollowUpType;
  label: string;
}[] = [
  { value: "general", label: "General" },
  { value: "appointment", label: "Appointment" },
  { value: "treatment", label: "Treatment" },
  { value: "payment", label: "Payment" },
  { value: "recall", label: "Patient recall" },
  { value: "post_treatment", label: "Post-treatment" },
  { value: "missed_appointment", label: "Missed appointment" },
  { value: "lead", label: "New patient lead" },
];

const STATUS_FILTERS: {
  value: StatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All follow-ups" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function getDefaultDueDate(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30);

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );

  return localDate.toISOString().slice(0, 16);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isOverdue(item: FollowUp): boolean {
  return (
    item.status === "pending" &&
    new Date(item.due_at).getTime() < Date.now()
  );
}

function getTypeLabel(type: FollowUpType): string {
  return (
    FOLLOW_UP_TYPES.find((item) => item.value === type)?.label ??
    "General"
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

// --------------------------------------------------
// Page
// --------------------------------------------------

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [pageError, setPageError] = useState("");
  const [patientError, setPatientError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] =
    useState<FollowUp | null>(null);

  const [form, setForm] = useState<FollowUpForm>({
    patient_id: "",
    follow_up_type: "general",
    due_at: "",
    notes: "",
  });

  // --------------------------------------------------
  // Load follow-ups
  // --------------------------------------------------

  const loadFollowUps = useCallback(async () => {
    const organizationId = getOrganizationId();

    if (!organizationId) {
      setPageError(
        "Your clinic session is missing. Please log in again."
      );
      setFollowUps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError("");

    try {
      const params = new URLSearchParams({
        organization_id: organizationId,
      });

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const data = await apiJson<FollowUp[]>(
        `/follow-ups?${params.toString()}`
      );

      if (!Array.isArray(data)) {
        throw new Error(
          "The server returned an unexpected follow-up response."
        );
      }

      setFollowUps(data);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // --------------------------------------------------
  // Load patients
  // --------------------------------------------------

  const loadPatients = useCallback(async () => {
    const organizationId = getOrganizationId();

    if (!organizationId) {
      setPatientError(
        "Your clinic session is missing. Please log in again."
      );
      setPatients([]);
      setPatientsLoading(false);
      return;
    }

    setPatientsLoading(true);
    setPatientError("");

    try {
      const params = new URLSearchParams({
        organization_id: organizationId,
      });

      const data = await apiJson<Patient[]>(
        `/patients?${params.toString()}`
      );

      if (!Array.isArray(data)) {
        throw new Error(
          "The server returned an unexpected patient response."
        );
      }

      setPatients(data);
    } catch (error) {
      setPatientError(getErrorMessage(error));
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFollowUps();
  }, [loadFollowUps]);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  // --------------------------------------------------
  // Derived data
  // --------------------------------------------------

  const counts = useMemo(() => {
    return {
      total: followUps.length,
      pending: followUps.filter(
        (item) => item.status === "pending"
      ).length,
      completed: followUps.filter(
        (item) => item.status === "completed"
      ).length,
      cancelled: followUps.filter(
        (item) => item.status === "cancelled"
      ).length,
      overdue: followUps.filter(isOverdue).length,
    };
  }, [followUps]);

  const filteredFollowUps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return followUps;
    }

    return followUps.filter((item) => {
      const searchable = [
        item.patient_name,
        item.notes ?? "",
        getTypeLabel(item.follow_up_type),
        item.status,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [followUps, searchQuery]);

  // --------------------------------------------------
  // Create follow-up
  // --------------------------------------------------

  function openCreateModal() {
    setSuccessMessage("");
    setPageError("");
    setPatientError("");
    setForm({
      patient_id: "",
      follow_up_type: "general",
      due_at: getDefaultDueDate(),
      notes: "",
    });

    setCreateModalOpen(true);

    if (patients.length === 0 && !patientsLoading) {
      void loadPatients();
    }
  }

  async function createFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const organizationId = getOrganizationId();

    if (!organizationId) {
      setPageError(
        "Your clinic session is missing. Please log in again."
      );
      return;
    }

    if (!form.patient_id) {
      setPatientError("Please select a patient.");
      return;
    }

    if (!form.due_at) {
      setPageError("Please choose a due date and time.");
      return;
    }

    const dueDate = new Date(form.due_at);

    if (Number.isNaN(dueDate.getTime())) {
      setPageError("Please enter a valid due date and time.");
      return;
    }

    setSubmitting(true);
    setPageError("");
    setPatientError("");
    setSuccessMessage("");

    try {
      await apiJson<FollowUp>("/follow-ups", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organizationId,
          patient_id: form.patient_id,
          follow_up_type: form.follow_up_type,
          due_at: dueDate.toISOString(),
          notes: form.notes.trim() || null,
        }),
      });

      setCreateModalOpen(false);
      setSuccessMessage("Follow-up created successfully.");

      await Promise.all([loadFollowUps(), loadPatients()]);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  // --------------------------------------------------
  // Update status
  // --------------------------------------------------

  async function updateFollowUpStatus(
    followUp: FollowUp,
    status: "completed" | "cancelled"
  ) {
    if (followUp.status !== "pending") {
      return;
    }

    setActionId(followUp.id);
    setPageError("");
    setSuccessMessage("");

    try {
      await apiJson<FollowUp>(`/follow-ups/${followUp.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      if (selectedFollowUp?.id === followUp.id) {
        setSelectedFollowUp(null);
      }

      setSuccessMessage(
        status === "completed"
          ? "Follow-up marked as completed."
          : "Follow-up cancelled."
      );

      await loadFollowUps();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <Activity className="h-4 w-4" />
              CRM / Follow-ups
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Follow-ups
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Keep track of patient callbacks, treatment reminders,
              payments and recalls.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSuccessMessage("");
                void loadFollowUps();
                void loadPatients();
              }}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New follow-up
            </button>
          </div>
        </div>

        {/* Alerts */}
        {pageError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-1 break-words">{pageError}</p>
            </div>

            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setPageError("")}
              className="rounded-lg p-1 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="flex-1">{successMessage}</p>

            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setSuccessMessage("")}
              className="rounded-lg p-1 hover:bg-emerald-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Pending follow-ups"
            value={counts.pending}
            description="Awaiting action"
            icon={<Clock className="h-5 w-5" />}
            iconClass="bg-blue-50 text-blue-700"
          />

          <SummaryCard
            label="Overdue"
            value={counts.overdue}
            description="Past their due time"
            icon={<AlertCircle className="h-5 w-5" />}
            iconClass="bg-red-50 text-red-700"
          />

          <SummaryCard
            label="Completed"
            value={counts.completed}
            description="Successfully closed"
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconClass="bg-emerald-50 text-emerald-700"
          />

          <SummaryCard
            label="Total in this view"
            value={counts.total}
            description="Based on selected filter"
            icon={<CalendarClock className="h-5 w-5" />}
            iconClass="bg-violet-50 text-violet-700"
          />
        </div>

        {/* Main list */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Search and filters */}
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Follow-up queue
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review and manage your patient follow-ups.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <div className="relative min-w-0 flex-1 sm:min-w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) =>
                      setSearchQuery(event.target.value)
                    }
                    placeholder="Search patient or notes..."
                    aria-label="Search follow-ups"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as StatusFilter)
                    }
                    aria-label="Filter by status"
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:min-w-44"
                  >
                    {STATUS_FILTERS.map((filter) => (
                      <option
                        key={filter.value}
                        value={filter.value}
                      >
                        {filter.label}
                      </option>
                    ))}
                  </select>

                  <ArrowDownUp className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Queue content */}
          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-600">
                Loading follow-ups...
              </p>
            </div>
          ) : filteredFollowUps.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <CalendarClock className="h-7 w-7" />
              </div>

              <h3 className="text-base font-semibold text-slate-900">
                {searchQuery
                  ? "No matching follow-ups"
                  : statusFilter === "all"
                    ? "No follow-ups yet"
                    : `No ${statusFilter} follow-ups`}
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {searchQuery
                  ? "Try a different patient name, follow-up type or keyword."
                  : "Create a follow-up to track a patient callback, treatment reminder or payment."}
              </p>

              {!searchQuery && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create follow-up
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Patient</th>
                      <th className="px-5 py-4">Follow-up type</th>
                      <th className="px-5 py-4">Due date</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredFollowUps.map((item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedFollowUp(item)}
                            className="flex max-w-64 items-center gap-3 text-left"
                          >
                            <PatientAvatar name={item.patient_name} />

                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-900">
                                {item.patient_name}
                              </span>

                              <span className="mt-1 block text-xs text-slate-500">
                                {item.notes
                                  ? "View follow-up notes"
                                  : "No notes added"}
                              </span>
                            </span>
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <Stethoscope className="h-4 w-4 text-slate-400" />
                            {getTypeLabel(item.follow_up_type)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-slate-800">
                            {formatDate(item.due_at)}
                          </div>

                          <div
                            className={`mt-1 text-xs ${
                              isOverdue(item)
                                ? "font-semibold text-red-600"
                                : "text-slate-500"
                            }`}
                          >
                            {isOverdue(item)
                              ? "Overdue · "
                              : ""}
                            {new Intl.DateTimeFormat("en-IN", {
                              hour: "numeric",
                              minute: "2-digit",
                            }).format(new Date(item.due_at))}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={item.status}
                            overdue={isOverdue(item)}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedFollowUp(item)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Details
                            </button>

                            {item.status === "pending" && (
                              <button
                                type="button"
                                disabled={actionId === item.id}
                                onClick={() =>
                                  void updateFollowUpStatus(
                                    item,
                                    "completed"
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                              >
                                {actionId === item.id ? (
                                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                Complete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {filteredFollowUps.map((item) => (
                  <article
                    key={item.id}
                    className="space-y-4 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <PatientAvatar name={item.patient_name} />

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold">
                          {item.patient_name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {getTypeLabel(item.follow_up_type)}
                        </p>

                        <p
                          className={`mt-2 text-xs ${
                            isOverdue(item)
                              ? "font-semibold text-red-600"
                              : "text-slate-500"
                          }`}
                        >
                          Due {formatDateTime(item.due_at)}
                          {isOverdue(item) ? " · Overdue" : ""}
                        </p>
                      </div>

                      <StatusBadge
                        status={item.status}
                        overdue={isOverdue(item)}
                      />
                    </div>

                    {item.notes && (
                      <p className="line-clamp-2 text-sm leading-5 text-slate-600">
                        {item.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFollowUp(item)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        View details
                      </button>

                      {item.status === "pending" && (
                        <button
                          type="button"
                          disabled={actionId === item.id}
                          onClick={() =>
                            void updateFollowUpStatus(
                              item,
                              "completed"
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {actionId === item.id ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Mark completed
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
                Showing {filteredFollowUps.length} of{" "}
                {followUps.length} follow-ups
              </div>
            </>
          )}
        </section>
      </div>

      {/* Create follow-up modal */}
      {createModalOpen && (
        <Modal
          title="Create follow-up"
          description="Schedule a reminder for a patient."
          onClose={() => {
            if (!submitting) {
              setCreateModalOpen(false);
            }
          }}
        >
          <form onSubmit={createFollowUp} className="space-y-5">
            <div>
              <label
                htmlFor="patient_id"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Patient <span className="text-red-500">*</span>
              </label>

              <select
                id="patient_id"
                required
                value={form.patient_id}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    patient_id: event.target.value,
                  }));
                  setPatientError("");
                }}
                disabled={patientsLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              >
                <option value="">
                  {patientsLoading
                    ? "Loading patients..."
                    : "Select a patient"}
                </option>

                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name}
                    {patient.phone ? ` · ${patient.phone}` : ""}
                  </option>
                ))}
              </select>

              {patientError && (
                <p className="mt-2 text-xs text-red-600">
                  {patientError}
                </p>
              )}

              {!patientsLoading &&
                !patientError &&
                patients.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    No patients were found. Add a patient first or
                    refresh the patient list.
                  </p>
                )}

              {patients.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  {patients.length} patient
                  {patients.length === 1 ? "" : "s"} available
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="follow_up_type"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Follow-up type
              </label>

              <select
                id="follow_up_type"
                value={form.follow_up_type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    follow_up_type: event.target.value as FollowUpType,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {FOLLOW_UP_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="due_at"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Due date and time{" "}
                <span className="text-red-500">*</span>
              </label>

              <input
                id="due_at"
                type="datetime-local"
                required
                value={form.due_at}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    due_at: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                The selected local time will be sent to the API as an
                ISO timestamp.
              </p>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </label>

              <textarea
                id="notes"
                rows={4}
                maxLength={2000}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="E.g. Call the patient to confirm the next appointment..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {form.notes.length}/2000
              </p>
            </div>

            {pageError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {pageError}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  patientsLoading ||
                  patients.length === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {submitting ? "Creating..." : "Create follow-up"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Follow-up details modal */}
      {selectedFollowUp && (
        <Modal
          title="Follow-up details"
          description="Review the reminder and update its status."
          onClose={() => setSelectedFollowUp(null)}
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <PatientAvatar name={selectedFollowUp.patient_name} />

              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-slate-900">
                  {selectedFollowUp.patient_name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Patient follow-up
                </p>
              </div>

              <StatusBadge
                status={selectedFollowUp.status}
                overdue={isOverdue(selectedFollowUp)}
              />
            </div>

            <DetailRow
              icon={<Stethoscope className="h-4 w-4" />}
              label="Follow-up type"
              value={getTypeLabel(selectedFollowUp.follow_up_type)}
            />

            <DetailRow
              icon={<CalendarClock className="h-4 w-4" />}
              label="Due date"
              value={formatDateTime(selectedFollowUp.due_at)}
            />

            <DetailRow
              icon={<UserRound className="h-4 w-4" />}
              label="Patient ID"
              value={selectedFollowUp.patient_id}
            />

            {selectedFollowUp.completed_at && (
              <DetailRow
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Completed on"
                value={formatDateTime(selectedFollowUp.completed_at)}
              />
            )}

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                Notes
              </div>

              <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                {selectedFollowUp.notes || "No notes added."}
              </div>
            </div>

            {selectedFollowUp.status === "pending" && (
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  disabled={actionId === selectedFollowUp.id}
                  onClick={() =>
                    void updateFollowUpStatus(
                      selectedFollowUp,
                      "cancelled"
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel follow-up
                </button>

                <button
                  type="button"
                  disabled={actionId === selectedFollowUp.id}
                  onClick={() =>
                    void updateFollowUpStatus(
                      selectedFollowUp,
                      "completed"
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionId === selectedFollowUp.id ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Mark completed
                </button>
              </div>
            )}

            {selectedFollowUp.status !== "pending" && (
              <div className="border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedFollowUp(null)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// --------------------------------------------------
// Reusable components
// --------------------------------------------------

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconClass,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function PatientAvatar({ name }: { name: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "P";

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
      {initials}
    </div>
  );
}

function StatusBadge({
  status,
  overdue,
}: {
  status: FollowUpStatus;
  overdue: boolean;
}) {
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
        <AlertCircle className="h-3.5 w-3.5" />
        Overdue
      </span>
    );
  }

  const config: Record<
    FollowUpStatus,
    { label: string; className: string }
  > = {
    pending: {
      label: "Pending",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    completed: {
      label: "Completed",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-slate-100 text-slate-600 ring-slate-200",
    },
  };

  const item = config[status];

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${item.className}`}
    >
      {item.label}
    </span>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}
