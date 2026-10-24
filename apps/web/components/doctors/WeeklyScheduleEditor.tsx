"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";

type Schedule = {
  day_of_week: number;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
  slot_capacity: number;
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function buildRows(schedules: Schedule[]): Schedule[] {
  return DAYS.map((_, day) => {
    const saved = schedules.find((s) => s.day_of_week === day);

    if (saved) {
      return {
        ...saved,
        start_time: saved.start_time?.slice(0, 5) ?? "09:00",
        end_time: saved.end_time?.slice(0, 5) ?? "17:00",
      };
    }

    // Starting suggestion for days that were never saved.
    return {
      day_of_week: day,
      is_working: day < 6, // Mon-Sat working, Sunday off
      start_time: "09:00",
      end_time: "17:00",
      slot_capacity: 1,
    };
  });
}

export function WeeklyScheduleEditor({
  doctorId,
  schedules,
  onSaved,
}: {
  doctorId: string;
  schedules: Schedule[];
  onSaved: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<Schedule[]>(() => buildRows(schedules));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setRows(buildRows(schedules));
  }, [schedules]);

  function update(day: number, patch: Partial<Schedule>) {
    setRows((current) =>
      current.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r))
    );
  }

  function copyMondayToAll() {
    const monday = rows[0];

    setRows((current) =>
      current.map((r) =>
        r.day_of_week === 0 || !r.is_working
          ? r
          : {
              ...r,
              start_time: monday.start_time,
              end_time: monday.end_time,
              slot_capacity: monday.slot_capacity,
            }
      )
    );
  }

  async function save() {
    setError("");
    setMessage("");

    for (const r of rows) {
      if (
        r.is_working &&
        (!r.start_time || !r.end_time || r.start_time >= r.end_time)
      ) {
        setError(`${DAYS[r.day_of_week]}: end time must be after start time.`);
        return;
      }
    }

    setSaving(true);

    try {
      await apiJson(`/doctor-schedules/${doctorId}/week`, {
        method: "PUT",
        body: JSON.stringify({
          days: rows.map((r) => ({
            day_of_week: r.day_of_week,
            is_working: r.is_working,
            start_time: r.is_working ? r.start_time : null,
            end_time: r.is_working ? r.end_time : null,
            slot_capacity: r.slot_capacity,
          })),
        }),
      });

      setMessage(
        "Weekly schedule saved. New appointments will use it right away."
      );
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save schedule.");
    } finally {
      setSaving(false);
    }
  }

  const input =
    "rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400";

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Set weekly hours</h2>
          <p className="text-sm text-gray-500">
            Set it once. Appointment booking uses these hours automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={copyMondayToAll}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Copy Monday to working days
        </button>
      </div>

      <div className="mb-2 hidden grid-cols-[110px_90px_1fr_1fr_90px] gap-3 text-xs text-gray-400 sm:grid">
        <span>Day</span>
        <span></span>
        <span>Start</span>
        <span>End</span>
        <span>Patients / slot</span>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.day_of_week}
            className="grid grid-cols-[110px_90px_1fr_1fr_90px] items-center gap-3"
          >
            <span className="text-sm font-medium text-gray-800">
              {DAYS[r.day_of_week]}
            </span>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={r.is_working}
                onChange={(e) =>
                  update(r.day_of_week, { is_working: e.target.checked })
                }
              />
              Working
            </label>

            <input
              type="time"
              className={input}
              disabled={!r.is_working}
              value={r.start_time ?? ""}
              onChange={(e) =>
                update(r.day_of_week, { start_time: e.target.value })
              }
            />

            <input
              type="time"
              className={input}
              disabled={!r.is_working}
              value={r.end_time ?? ""}
              onChange={(e) =>
                update(r.day_of_week, { end_time: e.target.value })
              }
            />

            <input
              type="number"
              min={1}
              max={100}
              title="Patients per 30-minute slot"
              className={input}
              disabled={!r.is_working}
              value={r.slot_capacity}
              onChange={(e) =>
                update(r.day_of_week, {
                  slot_capacity: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save weekly schedule"}
      </button>
    </section>
  );
}
