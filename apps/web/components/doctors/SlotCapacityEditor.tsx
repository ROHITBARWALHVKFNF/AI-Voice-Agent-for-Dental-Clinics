
"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";

type SlotCapacity = {
  day_of_week: number;
  slot_start: string;
  capacity: number;
};

type ScheduleBreak = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  reason?: string | null;
};

type SlotCapacityEditorProps = {
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  defaultCapacity?: number;
  breaks?: ScheduleBreak[];
};

function toMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(value: number): string {
  const hours = Math.floor(value / 60).toString().padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function unwrapRows(value: unknown): SlotCapacity[] {
  if (Array.isArray(value)) return value as SlotCapacity[];

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;

    for (const key of ["items", "data", "capacities"]) {
      if (Array.isArray(object[key])) {
        return object[key] as SlotCapacity[];
      }
    }
  }

  return [];
}

export function SlotCapacityEditor({
  doctorId,
  dayOfWeek,
  startTime,
  endTime,
  defaultCapacity = 1,
  breaks = [],
}: SlotCapacityEditorProps) {
  const [capacities, setCapacities] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setLoadError("");
      setMessage("");

      try {
        const result = await apiJson(
          `/doctor-slot-capacities/${doctorId}`,
        );

        const rows = unwrapRows(result);

        if (!active) return;

        const next: Record<string, number> = {};

        for (const row of rows) {
          if (
            row.day_of_week === dayOfWeek &&
            typeof row.slot_start === "string"
          ) {
            next[row.slot_start.slice(0, 5)] = Number(row.capacity);
          }
        }

        setCapacities(next);
        setDrafts({});
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load slot capacities.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (doctorId) {
      void load();
    } else {
      setLoadError("Doctor ID is missing.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [doctorId, dayOfWeek]);

  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  const dayBreaks = breaks.filter(
    (item) => item.day_of_week === dayOfWeek,
  );

  const slots: string[] = [];

  // Generate complete 30-minute slots within the working hours.
  for (let minute = start; minute + 30 <= end; minute += 30) {
    const slotStart = minute;
    const slotEnd = minute + 30;

    // Exclude any slot that overlaps a recurring break.
    const overlapsBreak = dayBreaks.some((item) => {
      const breakStart = toMinutes(item.start_time);
      const breakEnd = toMinutes(item.end_time);

      return slotStart < breakEnd && slotEnd > breakStart;
    });

    if (!overlapsBreak) {
      slots.push(toTime(minute));
    }
  }

  async function saveCapacity(slot: string): Promise<void> {
    const raw =
      drafts[slot] ??
      String(capacities[slot] ?? defaultCapacity);

    const capacity = Number(raw);

    if (
      raw.trim() === "" ||
      !Number.isInteger(capacity) ||
      capacity < 0 ||
      capacity > 100
    ) {
      setMessage(
        "Capacity must be a whole number between 0 and 100.",
      );
      return;
    }

    setSaving(slot);
    setMessage("");

    try {
      await apiJson(`/doctor-slot-capacities/${doctorId}`, {
        method: "PUT",
        body: JSON.stringify({
          day_of_week: dayOfWeek,
          slot_start: `${slot}:00`,
          capacity,
        }),
      });

      setCapacities((previous) => ({
        ...previous,
        [slot]: capacity,
      }));

      setDrafts((previous) => {
        const next = { ...previous };
        delete next[slot];
        return next;
      });

      setMessage(
        `Saved ${slot}–${toTime(toMinutes(slot) + 30)} (capacity ${capacity}).`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save capacity.",
      );
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <p className="mt-4 text-sm text-gray-500">
        Loading slot capacities…
      </p>
    );
  }

  return (
    <section className="mt-4 rounded-lg border border-gray-200 p-3">
      <h4 className="mb-3 text-sm font-semibold text-gray-800">
        Custom 30-minute slots
      </h4>

      {loadError && (
        <p
          role="alert"
          className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700"
        >
          {loadError}
        </p>
      )}

      {slots.length === 0 ? (
        <p className="text-sm text-gray-600">
          {dayBreaks.length > 0
            ? "No bookable 30-minute slots remain within these working hours and breaks."
            : "No complete 30-minute slots fit within these working hours."}
        </p>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => {
            const capacity =
              capacities[slot] ?? defaultCapacity;

            const value =
              drafts[slot] ?? String(capacity);

            const dirty =
              drafts[slot] !== undefined &&
              Number(drafts[slot]) !== capacity;

            return (
              <div
                key={slot}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-sm font-medium text-gray-700">
                  {slot}–{toTime(toMinutes(slot) + 30)}
                </span>

                <div className="flex items-center gap-2">
                  <label
                    className="sr-only"
                    htmlFor={`capacity-${dayOfWeek}-${slot}`}
                  >
                    Capacity for {slot}
                  </label>

                  <input
                    id={`capacity-${dayOfWeek}-${slot}`}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={value}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    onChange={(event) =>
                      setDrafts((previous) => ({
                        ...previous,
                        [slot]: event.target.value,
                      }))
                    }
                  />

                  <button
                    type="button"
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={saving !== null || !dirty}
                    onClick={() => void saveCapacity(slot)}
                  >
                    {saving === slot ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm text-gray-600">
          {message}
        </p>
      )}
    </section>
  );
}

export default SlotCapacityEditor;
