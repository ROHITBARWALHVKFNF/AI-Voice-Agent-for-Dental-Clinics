"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJson } from "@/lib/api";
import {
  addDays,
  formatDay,
  formatMoney,
  formatMonth,
  isoDate,
  methodLabel,
} from "@/lib/money";

interface DaySummary {
  date: string;
  collected: number;
  expenses: number;
  profit: number;
  billed: number;
  appointments: { total: number; completed: number; upcoming: number };
}

interface Snapshot {
  currency: string;
  yesterday: DaySummary;
  today: DaySummary;
  tomorrow: {
    date: string;
    appointments_booked: number;
    expected_revenue: number;
    unpriced_appointments: number;
    invoices_due: number;
  };
}

interface Overview {
  group_by: "day" | "month";
  currency: string;
  totals: {
    revenue: number;
    expenses: number;
    profit: number;
    billed: number;
    invoice_count: number;
    outstanding_total: number;
    new_patients: number;
    appointments: { total: number; completed: number; cancelled: number; no_show: number };
  };
  previous: { revenue: number; expenses: number; profit: number };
  series: { key: string; revenue: number; expenses: number; profit: number }[];
  by_method: { name: string; amount: number }[];
  by_category: { name: string; amount: number }[];
  top_services: { name: string; amount: number; count: number }[];
}

type Preset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom" },
];

function rangeFor(preset: Preset, customStart: string, customEnd: string): [string, string] {
  const now = new Date();
  const today = isoDate(now);

  switch (preset) {
    case "today":
      return [today, today];
    case "yesterday": {
      const y = isoDate(addDays(now, -1));
      return [y, y];
    }
    case "last7":
      return [isoDate(addDays(now, -6)), today];
    case "last30":
      return [isoDate(addDays(now, -29)), today];
    case "this_month":
      return [isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), today];
    case "last_month":
      return [
        isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        isoDate(new Date(now.getFullYear(), now.getMonth(), 0)),
      ];
    case "this_year":
      return [isoDate(new Date(now.getFullYear(), 0, 1)), today];
    default:
      return [customStart, customEnd];
  }
}

function Delta({ current, previous, goodWhenUp = true }: { current: number; previous: number; goodWhenUp?: boolean }) {
  if (!previous) return <span className="text-xs text-gray-400">no earlier data</span>;

  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const up = pct >= 0;
  const good = up === goodWhenUp;

  return (
    <span className={`text-xs font-medium ${good ? "text-green-600" : "text-red-600"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% vs previous period
    </span>
  );
}

function Breakdown({ title, rows, currency, empty }: { title: string; rows: { name: string; amount: number }[]; currency: string; empty: string }) {
  const max = Math.max(...rows.map((r) => r.amount), 1);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-700">{row.name}</span>
                <span className="font-medium text-gray-900">{formatMoney(row.amount, currency)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(row.amount / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RevenueOverview({ showHeader = true }: { showHeader?: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [preset, setPreset] = useState<Preset>("this_month");
  const [customStart, setCustomStart] = useState(isoDate(addDays(new Date(), -29)));
  const [customEnd, setCustomEnd] = useState(isoDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [start, end] = useMemo(
    () => rangeFor(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  );

  const load = useCallback(async () => {
    if (!start || !end || end < start) {
      setError("Choose a valid date range (end date must not be before the start date).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [snap, over] = await Promise.all([
        apiJson<Snapshot>("/analytics/snapshot"),
        apiJson<Overview>(`/analytics/overview?start_date=${start}&end_date=${end}`),
      ]);
      setSnapshot(snap);
      setOverview(over);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load revenue data.");
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = overview?.currency ?? snapshot?.currency ?? "INR";
  const maxBar = Math.max(...(overview?.series ?? []).flatMap((s) => [s.revenue, s.expenses]), 1);
  const labelEvery = Math.max(1, Math.ceil((overview?.series.length ?? 1) / 8));

  return (
    <section className="space-y-6">
      {showHeader && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Revenue & profit</h2>
          <p className="text-sm text-gray-500">
            Revenue is money actually received. Profit is revenue minus the expenses you record.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={load} className="rounded-lg border border-red-300 px-3 py-1 font-medium hover:bg-red-100">
            Try again
          </button>
        </div>
      )}

      {/* Yesterday / Today / Tomorrow */}
      {snapshot && (
        <div className="grid gap-4 md:grid-cols-3">
          {([
            ["Yesterday", snapshot.yesterday],
            ["Today", snapshot.today],
          ] as const).map(([label, day]) => (
            <div key={label} className={`rounded-2xl border bg-white p-5 shadow-sm ${label === "Today" ? "border-blue-300" : "border-gray-200"}`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
                <span className="text-xs text-gray-400">{formatDay(day.date)}</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{formatMoney(day.collected, currency)}</p>
              <p className="mb-3 text-xs text-gray-500">collected</p>
              <div className="grid grid-cols-2 gap-y-1 text-sm">
                <span className="text-gray-500">Expenses</span>
                <span className="text-right text-gray-800">{formatMoney(day.expenses, currency)}</span>
                <span className="text-gray-500">Profit</span>
                <span className={`text-right font-medium ${day.profit < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatMoney(day.profit, currency)}
                </span>
                <span className="text-gray-500">Billed</span>
                <span className="text-right text-gray-800">{formatMoney(day.billed, currency)}</span>
                <span className="text-gray-500">Appointments</span>
                <span className="text-right text-gray-800">
                  {day.appointments.completed}/{day.appointments.total} done
                </span>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Tomorrow</h3>
              <span className="text-xs text-gray-400">{formatDay(snapshot.tomorrow.date)}</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{snapshot.tomorrow.appointments_booked}</p>
            <p className="mb-3 text-xs text-gray-500">appointments booked</p>
            <div className="grid grid-cols-2 gap-y-1 text-sm">
              <span className="text-gray-500">Expected income</span>
              <span className="text-right text-gray-800">{formatMoney(snapshot.tomorrow.expected_revenue, currency)}</span>
              <span className="text-gray-500">Invoices due</span>
              <span className="text-right text-gray-800">{formatMoney(snapshot.tomorrow.invoices_due, currency)}</span>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Expected income is an estimate from service prices
              {snapshot.tomorrow.unpriced_appointments > 0
                ? `; ${snapshot.tomorrow.unpriced_appointments} appointment(s) did not match a priced service.`
                : "."}
            </p>
          </div>
        </div>
      )}

      {/* Range picker */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                preset === p.value ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-gray-600">
              From
              <input type="date" value={customStart} max={customEnd} onChange={(e) => setCustomStart(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1.5" />
            </label>
            <label className="flex items-center gap-2 text-gray-600">
              To
              <input type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1.5" />
            </label>
          </div>
        )}
      </div>

      {loading && !overview && <p className="text-sm text-gray-500">Loading revenue data...</p>}

      {overview && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Revenue collected</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatMoney(overview.totals.revenue, currency)}</p>
              <Delta current={overview.totals.revenue} previous={overview.previous.revenue} />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Expenses</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatMoney(overview.totals.expenses, currency)}</p>
              <Delta current={overview.totals.expenses} previous={overview.previous.expenses} goodWhenUp={false} />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Profit</p>
              <p className={`mt-1 text-2xl font-semibold ${overview.totals.profit < 0 ? "text-red-600" : "text-green-600"}`}>
                {formatMoney(overview.totals.profit, currency)}
              </p>
              <Delta current={overview.totals.profit} previous={overview.previous.profit} />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Outstanding (all time)</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatMoney(overview.totals.outstanding_total, currency)}</p>
              <span className="text-xs text-gray-400">unpaid invoice balances</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Billed in period", formatMoney(overview.totals.billed, currency)],
              ["Invoices sent", String(overview.totals.invoice_count)],
              ["Appointments", `${overview.totals.appointments.completed} done / ${overview.totals.appointments.total}`],
              ["New patients", String(overview.totals.new_patients)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Revenue vs expenses ({overview.group_by === "day" ? "per day" : "per month"})
              </h3>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Revenue</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Expenses</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="flex h-44 items-end gap-1" style={{ minWidth: `${Math.max(overview.series.length * 14, 300)}px` }}>
                {overview.series.map((point) => (
                  <div
                    key={point.key}
                    className="flex h-full flex-1 items-end justify-center gap-0.5"
                    title={`${overview.group_by === "day" ? formatDay(point.key) : formatMonth(point.key)}\nRevenue: ${formatMoney(point.revenue, currency)}\nExpenses: ${formatMoney(point.expenses, currency)}\nProfit: ${formatMoney(point.profit, currency)}`}
                  >
                    <div className="w-full max-w-[14px] rounded-t bg-blue-500" style={{ height: `${(point.revenue / maxBar) * 100}%`, minHeight: point.revenue > 0 ? 2 : 0 }} />
                    <div className="w-full max-w-[14px] rounded-t bg-amber-400" style={{ height: `${(point.expenses / maxBar) * 100}%`, minHeight: point.expenses > 0 ? 2 : 0 }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-1 text-[10px] text-gray-400" style={{ minWidth: `${Math.max(overview.series.length * 14, 300)}px` }}>
                {overview.series.map((point, i) => (
                  <div key={point.key} className="flex-1 text-center">
                    {i % labelEvery === 0 ? (overview.group_by === "day" ? formatDay(point.key) : formatMonth(point.key)) : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Breakdown title="Payments by method" rows={overview.by_method.map((r) => ({ ...r, name: methodLabel(r.name) }))} currency={currency} empty="No payments in this period." />
            <Breakdown title="Expenses by category" rows={overview.by_category} currency={currency} empty="No expenses recorded in this period." />
            <Breakdown title="Top services (completed treatments)" rows={overview.top_services} currency={currency} empty="No completed treatments in this period." />
          </div>
        </>
      )}
    </section>
  );
}
