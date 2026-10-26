"use client";


import AppShell from "@/components/layout/AppShell";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  FileText,
  Globe,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { apiJson } from "@/lib/api";

type SourceType = "text" | "faq" | "clinic_details" | "website";
type SourceStatus = "draft" | "needs_review" | "approved";

type KnowledgeSource = {
  id: string;
  title: string;
  category?: string | null;
  source_type?: SourceType | string | null;
  content?: string | null;
  source_url?: string | null;
  original_filename?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  status?: SourceStatus | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SourceForm = {
  title: string;
  category: string;
  source_type: SourceType;
  content: string;
  source_url: string;
  status: "draft" | "needs_review";
};

const EMPTY_FORM: SourceForm = {
  title: "",
  category: "General information",
  source_type: "text",
  content: "",
  source_url: "",
  status: "needs_review",
};

const SOURCE_TYPES: {
  value: SourceType;
  label: string;
  description: string;
}[] = [
  {
    value: "text",
    label: "Text document",
    description: "Clinic information and policies",
  },
  {
    value: "faq",
    label: "FAQ",
    description: "Questions and approved answers",
  },
  {
    value: "clinic_details",
    label: "Clinic details",
    description: "Hours, services and contact information",
  },
  {
    value: "website",
    label: "Website",
    description: "Website information and source URL",
  },
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function formatBytes(value?: number | null): string {
  if (value == null || value < 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function normaliseSources(data: unknown): KnowledgeSource[] {
  if (Array.isArray(data)) return data as KnowledgeSource[];

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return record.items as KnowledgeSource[];
    }
    if (Array.isArray(record.sources)) {
      return record.sources as KnowledgeSource[];
    }
    if (Array.isArray(record.data)) {
      return record.data as KnowledgeSource[];
    }
  }

  return [];
}

function sourceTypeLabel(type?: string | null): string {
  return SOURCE_TYPES.find((item) => item.value === type)?.label ?? type ?? "Source";
}

function statusLabel(status?: string | null): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "draft":
      return "Draft";
    case "needs_review":
      return "Needs review";
    default:
      return status || "Unknown";
  }
}

function StatusBadge({ status }: { status?: string | null }) {
  const classes =
    status === "approved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "draft"
        ? "border-slate-200 bg-slate-100 text-slate-600"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      {statusLabel(status)}
    </span>
  );
}

export default function KnowledgeBasePage() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSource, setEditingSource] =
    useState<KnowledgeSource | null>(null);
  const [form, setForm] = useState<SourceForm>(EMPTY_FORM);

  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSources = useCallback(async (quiet = false) => {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setPageError("");

    try {
      const data = await apiJson<unknown>("/knowledge-base/sources");
      setSources(normaliseSources(data));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredSources = sources.filter((source) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [
        source.title,
        source.category,
        source.content,
        source.source_url,
        source.original_filename,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

    const matchesType =
      typeFilter === "all" || source.source_type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || source.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const approvedCount = sources.filter(
    (source) => source.status === "approved",
  ).length;
  const reviewCount = sources.filter(
    (source) => source.status === "needs_review",
  ).length;
  const draftCount = sources.filter(
    (source) => source.status === "draft",
  ).length;

  function openCreateModal(type: SourceType = "text") {
    setEditingSource(null);
    setForm({ ...EMPTY_FORM, source_type: type });
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(source: KnowledgeSource) {
    setEditingSource(source);
    setForm({
      title: source.title ?? "",
      category: source.category ?? "General information",
      source_type:
        source.source_type === "faq" ||
        source.source_type === "clinic_details" ||
        source.source_type === "website"
          ? source.source_type
          : "text",
      content: source.content ?? "",
      source_url: source.source_url ?? "",
      status:
        source.status === "draft" ? "draft" : "needs_review",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const title = form.title.trim();
    if (!title) {
      setFormError("Please enter a title.");
      return;
    }

    if (title.length > 200) {
      setFormError("The title must be 200 characters or fewer.");
      return;
    }

    if (form.category.trim().length > 100) {
      setFormError("The category must be 100 characters or fewer.");
      return;
    }

    const sourceUrl = form.source_url.trim();
    if (sourceUrl && sourceUrl.length > 2048) {
      setFormError("The URL must be 2048 characters or fewer.");
      return;
    }

    const payload = {
      title,
      category: form.category.trim() || "General information",
      content: form.content,
      source_url: sourceUrl || null,
      status: form.status,
      ...(!editingSource ? { source_type: form.source_type } : {}),
    };

    setSaving(true);

    try {
      if (editingSource) {
        await apiJson(
          `/knowledge-base/sources/${encodeURIComponent(editingSource.id)}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );
        setNotice("Knowledge source updated.");
      } else {
        await apiJson("/knowledge-base/sources", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Knowledge source created.");
      }

      setModalOpen(false);
      setEditingSource(null);
      setForm(EMPTY_FORM);
      await loadSources(true);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) return;

    const maxSize = 20 * 1024 * 1024;
    const tooLarge = files.find((file) => file.size > maxSize);

    if (tooLarge) {
      setPageError(
        `${tooLarge.name} exceeds the 20 MB frontend limit. Check your backend upload limit before uploading larger files.`,
      );
      return;
    }

    const body = new FormData();
    files.forEach((file) => body.append("files", file));

    setUploading(true);
    setPageError("");

    try {
      const result = await apiJson<unknown>(
        "/knowledge-base/sources/upload?category=Documents",
        {
          method: "POST",
          body,
        },
      );

      const record =
        result && typeof result === "object"
          ? (result as Record<string, unknown>)
          : null;
      const count =
        typeof record?.count === "number"
          ? record.count
          : files.length;

      setNotice(
        `Upload request completed. ${count} file${count === 1 ? "" : "s"} processed.`,
      );
      await loadSources(true);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  async function handleStatusChange(
    source: KnowledgeSource,
    status: SourceStatus,
  ) {
    setPageError("");

    try {
      await apiJson(
        `/knowledge-base/sources/${encodeURIComponent(source.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );
      setNotice(`Source marked ${statusLabel(status).toLowerCase()}.`);
      await loadSources(true);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  async function handleDelete(source: KnowledgeSource) {
    const confirmed = window.confirm(
      `Delete "${source.title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(source.id);
    setPageError("");

    try {
      await apiJson(
        `/knowledge-base/sources/${encodeURIComponent(source.id)}`,
        { method: "DELETE" },
      );
      setSources((current) =>
        current.filter((item) => item.id !== source.id),
      );
      setNotice("Knowledge source deleted.");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell>
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">
              <BookOpen size={16} />
              AI Reception & Automation
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Knowledge Base
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Manage the clinic information your AI receptionist can use to
              answer patient questions. Changes are saved to your backend.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadSources(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus size={17} />
              Add source
            </button>
          </div>
        </header>

        {notice && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <Check size={17} />
            {notice}
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
              className="ml-auto rounded p-1 hover:bg-emerald-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {pageError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 break-words">{pageError}</div>
            <button
              type="button"
              onClick={() => setPageError("")}
              aria-label="Dismiss error"
              className="rounded p-1 hover:bg-red-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total sources"
            value={loading ? "—" : sources.length}
            subtitle="Saved in your clinic workspace"
            icon={<BookOpen size={19} />}
          />
          <StatCard
            title="Approved"
            value={loading ? "—" : approvedCount}
            subtitle="Marked approved in the API"
            icon={<Check size={19} />}
            iconClass="bg-emerald-50 text-emerald-700"
          />
          <StatCard
            title="Needs review"
            value={loading ? "—" : reviewCount}
            subtitle="Waiting for your review"
            icon={<CircleHelp size={19} />}
            iconClass="bg-amber-50 text-amber-700"
          />
          <StatCard
            title="Drafts"
            value={loading ? "—" : draftCount}
            subtitle="Not yet approved"
            icon={<FileText size={19} />}
            iconClass="bg-slate-100 text-slate-700"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search titles, content, categories or URLs..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative">
                <span className="sr-only">Filter by type</span>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm outline-none focus:border-indigo-400 sm:w-48"
                >
                  <option value="all">All types</option>
                  {SOURCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </label>

              <label className="relative">
                <span className="sr-only">Filter by status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm outline-none focus:border-indigo-400 sm:w-44"
                >
                  <option value="all">All statuses</option>
                  <option value="approved">Approved</option>
                  <option value="needs_review">Needs review</option>
                  <option value="draft">Draft</option>
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
              {loading
                ? "Loading sources..."
                : `Showing ${filteredSources.length} of ${sources.length} sources`}
            </span>
            {(search || typeFilter !== "all" || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                }}
                className="font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold">Your sources</h2>
              <p className="mt-1 text-xs text-slate-500">
                Create and manage clinic knowledge records.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openCreateModal("faq")}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                <CircleHelp size={15} />
                Add FAQ
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                {uploading ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Upload size={15} />
                )}
                {uploading ? "Uploading..." : "Upload files"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md,.doc,.docx,.csv"
                onChange={(event) => void handleUpload(event)}
                className="hidden"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-slate-500">
              <LoaderCircle className="animate-spin" size={20} />
              Loading knowledge sources...
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <BookOpen size={25} />
              </div>
              <h3 className="font-semibold">
                {sources.length === 0
                  ? "No knowledge sources yet"
                  : "No sources match your filters"}
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {sources.length === 0
                  ? "Add clinic information, FAQs, policies or website details so your AI receptionist has information to work with."
                  : "Try a different search term or clear the selected filters."}
              </p>
              {sources.length === 0 ? (
                <button
                  type="button"
                  onClick={() => openCreateModal()}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Plus size={16} />
                  Create your first source
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("all");
                    setStatusFilter("all");
                  }}
                  className="mt-5 text-sm font-semibold text-indigo-600"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSources.map((source) => (
                <article
                  key={source.id}
                  className="flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-start"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    {source.source_type === "website" ? (
                      <Globe size={20} />
                    ) : source.source_type === "clinic_details" ? (
                      <Stethoscope size={20} />
                    ) : source.source_type === "faq" ? (
                      <CircleHelp size={20} />
                    ) : (
                      <FileText size={20} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-semibold text-slate-900">
                        {source.title}
                      </h3>
                      <StatusBadge status={source.status} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{sourceTypeLabel(source.source_type)}</span>
                      <span className="text-slate-300">•</span>
                      <span>{source.category || "General information"}</span>
                      <span className="text-slate-300">•</span>
                      <span>Updated {formatDate(source.updated_at ?? source.created_at)}</span>
                    </div>

                    {source.content && (
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                        {source.content.length > 280
                          ? `${source.content.slice(0, 280)}…`
                          : source.content}
                      </p>
                    )}

                    {source.source_url && (
                      <a
                        href={source.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block max-w-full break-all text-sm text-indigo-600 hover:underline"
                      >
                        {source.source_url}
                      </a>
                    )}

                    {source.original_filename && (
                      <p className="mt-2 break-words text-xs text-slate-500">
                        {source.original_filename}
                        {source.size_bytes != null
                          ? ` · ${formatBytes(source.size_bytes)}`
                          : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    {source.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleStatusChange(source, "approved")
                        }
                        title="Mark as approved"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <Check size={14} />
                        Approve
                      </button>
                    )}

                    {source.status === "approved" && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleStatusChange(source, "needs_review")
                        }
                        title="Send back for review"
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                      >
                        Needs review
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(source)}
                      title="Edit source"
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-white hover:text-indigo-600"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(source)}
                      disabled={deletingId === source.id}
                      title="Delete source"
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      {deletingId === source.id ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs leading-5 text-slate-500">
          Approval records the source status in your backend. It does not by
          itself guarantee that a document has been indexed or that the AI
          receptionist can retrieve it; that depends on your backend processing.
        </p>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="source-modal-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 id="source-modal-title" className="text-lg font-bold">
                  {editingSource ? "Edit knowledge source" : "Add knowledge source"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingSource
                    ? "Update the saved record in your clinic workspace."
                    : "Create a source for your AI receptionist."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-5 sm:p-6">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span className="break-words">{formError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="source-title"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="source-title"
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g. Clinic opening hours"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {form.title.length}/200
                </p>
              </div>

              {!editingSource && (
                <div>
                  <label
                    htmlFor="source-type"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Source type
                  </label>
                  <select
                    id="source-type"
                    value={form.source_type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        source_type: event.target.value as SourceType,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                  >
                    {SOURCE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label} — {type.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="source-category"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Category
                </label>
                <input
                  id="source-category"
                  maxLength={100}
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  placeholder="General information"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {form.source_type === "website" && !editingSource && (
                <div>
                  <label
                    htmlFor="source-url"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Website URL
                  </label>
                  <input
                    id="source-url"
                    type="url"
                    maxLength={2048}
                    value={form.source_url}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        source_url: event.target.value,
                      }))
                    }
                    placeholder="https://example.com"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Saving the URL does not necessarily crawl the website. That
                    depends on your backend implementation.
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="source-content"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  {form.source_type === "faq"
                    ? "Question and answer"
                    : "Content"}
                </label>
                <textarea
                  id="source-content"
                  rows={8}
                  maxLength={500000}
                  value={form.content}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  placeholder={
                    form.source_type === "faq"
                      ? "Q: What are your clinic hours?\nA: We are open Monday to Saturday..."
                      : "Enter the information your AI receptionist should use..."
                  }
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-6 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label
                  htmlFor="source-status"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Status
                </label>
                <select
                  id="source-status"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as "draft" | "needs_review",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="needs_review">Needs review</option>
                  <option value="draft">Draft</option>
                </select>
                {editingSource?.status === "approved" && (
                  <p className="mt-1.5 text-xs text-amber-700">
                    Saving this form will set the selected status. To keep the
                    source approved, select Needs review only if it needs
                    another review.
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {saving
                    ? "Saving..."
                    : editingSource
                      ? "Save changes"
                      : "Create source"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconClass = "bg-indigo-50 text-indigo-600",
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  iconClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}
