
"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { SlotCapacityEditor } from "@/components/doctors/SlotCapacityEditor";
import { WeeklyScheduleEditor } from "@/components/doctors/WeeklyScheduleEditor";
import { apiJson } from "@/lib/api";

type Doctor = {
  id: string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
};

type Schedule = {
  id?: string;
  doctor_id?: string;
  day_of_week: number;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
  slot_capacity: number;
};

type ScheduleBreak = {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  reason: string;
};

type ScheduleOverride = {
  id: string;
  override_date: string;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
  reason?: string | null;
  notes?: string | null;
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

const EMPTY_BREAK = {
  day_of_week: 0,
  start_time: "13:00",
  end_time: "14:00",
  reason: "Lunch",
};

const EMPTY_OVERRIDE = {
  override_date: "",
  is_working: false,
  start_time: "09:00",
  end_time: "17:00",
  reason: "",
  notes: "",
};

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

function extractArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;

    for (const key of [
      "items",
      "data",
      "schedules",
      "overrides",
      "breaks",
    ]) {
      if (Array.isArray(object[key])) {
        return object[key] as T[];
      }
    }
  }

  return [];
}

function formatTime(value?: string | null) {
  return value ? value.slice(0, 5) : "—";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

function getDoctorName(doctor?: Doctor | null) {
  if (!doctor) return "Doctor Schedule";

  const name =
    doctor.full_name ||
    [doctor.first_name, doctor.last_name].filter(Boolean).join(" ") ||
    doctor.name;

  return name ? `Dr. ${name}` : "Doctor Schedule";
}

export default function DoctorSchedulePage() {
  const params = useParams();
  const router = useRouter();

  const doctorId = String(params.doctorId ?? params.id ?? "");

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [breaks, setBreaks] = useState<ScheduleBreak[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState<Schedule | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [breakForm, setBreakForm] = useState(EMPTY_BREAK);
  const [editingBreakId, setEditingBreakId] = useState<string | null>(null);
  const [savingBreak, setSavingBreak] = useState(false);
  const [deletingBreakId, setDeletingBreakId] = useState<string | null>(null);

  const [overrideForm, setOverrideForm] = useState(EMPTY_OVERRIDE);
  const [savingOverride, setSavingOverride] = useState(false);
  const [deletingOverrideId, setDeletingOverrideId] = useState<string | null>(
    null
  );

  const loadData = useCallback(async () => {
    if (!doctorId) {
      setLoading(false);
      setPageError("Doctor ID is missing from the page URL.");
      return;
    }

    setLoading(true);
    setPageError("");

    try {
      const [doctorData, scheduleData, breakData, overrideData] =
        await Promise.all([
          apiJson<unknown>(`/doctors/${doctorId}`),
          apiJson<unknown>(`/doctor-schedules/${doctorId}`),
          apiJson<unknown>(`/doctor-schedule-breaks/${doctorId}`),
          apiJson<unknown>(`/doctor-schedule-overrides/${doctorId}`),
        ]);

      setDoctor(doctorData as Doctor);

      setSchedules(
        extractArray<Schedule>(scheduleData).sort(
          (a, b) => a.day_of_week - b.day_of_week
        )
      );

      setBreaks(
        extractArray<ScheduleBreak>(breakData).sort(
          (a, b) =>
            a.day_of_week - b.day_of_week ||
            a.start_time.localeCompare(b.start_time)
        )
      );

      setOverrides(
        extractArray<ScheduleOverride>(overrideData).sort((a, b) =>
          a.override_date.localeCompare(b.override_date)
        )
      );
    } catch (error) {
      setPageError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const scheduleByDay = useMemo(
    () =>
      new Map(
        schedules.map((schedule) => [
          schedule.day_of_week,
          schedule,
        ])
      ),
    [schedules]
  );

  const breaksByDay = useMemo(() => {
    const result = new Map<number, ScheduleBreak[]>();

    for (const item of breaks) {
      const current = result.get(item.day_of_week) ?? [];
      current.push(item);
      result.set(item.day_of_week, current);
    }

    return result;
  }, [breaks]);

  const workingDays = schedules.filter(
    (schedule) => schedule.is_working
  ).length;

  const totalWeeklyHours = schedules.reduce((total, schedule) => {
    if (
      !schedule.is_working ||
      !schedule.start_time ||
      !schedule.end_time
    ) {
      return total;
    }

    const [startHour, startMinute] = schedule.start_time
      .split(":")
      .map(Number);

    const [endHour, endMinute] = schedule.end_time
      .split(":")
      .map(Number);

    return (
      total +
      Math.max(
        0,
        endHour * 60 + endMinute - startHour * 60 - startMinute
      ) / 60
    );
  }, 0);

  function startEditingDay(day: number) {
    const existing = scheduleByDay.get(day);

    setEditingDay(day);
    setScheduleForm(
      existing
        ? { ...existing }
        : {
          day_of_week: day,
          is_working: true,
          start_time: "09:00",
          end_time: "17:00",
          slot_capacity: 1,
        }
    );

    setPageError("");
    setNotice("");
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scheduleForm) return;

    if (
      scheduleForm.is_working &&
      (!scheduleForm.start_time ||
        !scheduleForm.end_time ||
        scheduleForm.start_time >= scheduleForm.end_time)
    ) {
      setPageError("End time must be later than start time.");
      return;
    }

    if (
      !Number.isInteger(scheduleForm.slot_capacity) ||
      scheduleForm.slot_capacity < 1
    ) {
      setPageError("Default slot capacity must be at least 1.");
      return;
    }

    setSavingSchedule(true);
    setPageError("");
    setNotice("");

    try {
      await apiJson(`/doctor-schedules/${doctorId}`, {
        method: "PUT",
        body: JSON.stringify({
          day_of_week: scheduleForm.day_of_week,
          is_working: scheduleForm.is_working,
          start_time: scheduleForm.is_working
            ? scheduleForm.start_time
            : null,
          end_time: scheduleForm.is_working
            ? scheduleForm.end_time
            : null,
          slot_capacity: scheduleForm.slot_capacity,
        }),
      });

      setEditingDay(null);
      setScheduleForm(null);
      setNotice("Weekly schedule saved.");
      await loadData();
    } catch (error) {
      setPageError(errorMessage(error));
    } finally {
      setSavingSchedule(false);
    }
  }

  function startEditingBreak(item: ScheduleBreak) {
    setEditingBreakId(item.id);
    setBreakForm({
      day_of_week: item.day_of_week,
      start_time: formatTime(item.start_time),
      end_time: formatTime(item.end_time),
      reason: item.reason || "Break",
    });
    setPageError("");
    setNotice("");
  }

  function resetBreakForm() {
    setEditingBreakId(null);
    setBreakForm({ ...EMPTY_BREAK });
  }

  async function saveBreak(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const reason = breakForm.reason.trim();

    if (!reason) {
      setPageError("Enter a name for the break.");
      return;
    }

    if (breakForm.start_time >= breakForm.end_time) {
      setPageError("Break end time must be later than start time.");
      return;
    }

    setSavingBreak(true);
    setPageError("");
    setNotice("");

    try {
      const payload = {
        day_of_week: Number(breakForm.day_of_week),
        start_time: breakForm.start_time,
        end_time: breakForm.end_time,
        reason,
      };

      if (editingBreakId) {
        await apiJson(`/doctor-schedule-breaks/${editingBreakId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("Break updated.");
      } else {
        await apiJson(`/doctor-schedule-breaks/${doctorId}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Break added.");
      }

      resetBreakForm();
      await loadData();
    } catch (error) {
      setPageError(errorMessage(error));
    } finally {
      setSavingBreak(false);
    }
  }

  async function deleteBreak(item: ScheduleBreak) {
    if (
      !window.confirm(
        `Delete "${item.reason}" on ${DAYS[item.day_of_week]}?`
      )
    ) {
      return;
    }

    setDeletingBreakId(item.id);
    setPageError("");
    setNotice("");

    try {
      await apiJson(`/doctor-schedule-breaks/${item.id}`, {
        method: "DELETE",
      });

      if (editingBreakId === item.id) resetBreakForm();

      setNotice("Break deleted.");
      await loadData();
    } catch (error) {
      setPageError(errorMessage(error));
    } finally {
      setDeletingBreakId(null);
    }
  }

  async function saveOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!overrideForm.override_date) {
      setPageError("Choose the date for this exception.");
      return;
    }

    if (
      overrideForm.is_working &&
      (!overrideForm.start_time ||
        !overrideForm.end_time ||
        overrideForm.start_time >= overrideForm.end_time)
    ) {
      setPageError("Enter valid working hours for this date.");
      return;
    }

    setSavingOverride(true);
    setPageError("");
    setNotice("");

    try {
      await apiJson(`/doctor-schedule-overrides/${doctorId}`, {
        method: "POST",
        body: JSON.stringify({
          override_date: overrideForm.override_date,
          is_working: overrideForm.is_working,
          start_time: overrideForm.is_working
            ? overrideForm.start_time
            : null,
          end_time: overrideForm.is_working
            ? overrideForm.end_time
            : null,
          reason: overrideForm.reason.trim() || null,
          notes: overrideForm.notes.trim() || null,
        }),
      });

      setOverrideForm({ ...EMPTY_OVERRIDE });
      setNotice("Schedule exception saved.");
      await loadData();
    } catch (error) {
      setPageError(errorMessage(error));
    } finally {
      setSavingOverride(false);
    }
  }

  async function deleteOverride(item: ScheduleOverride) {
    if (
      !window.confirm(
        `Delete the exception for ${formatDate(item.override_date)}?`
      )
    ) {
      return;
    }

    setDeletingOverrideId(item.id);
    setPageError("");
    setNotice("");

    try {
      await apiJson(`/doctor-schedule-overrides/${item.id}`, {
        method: "DELETE",
      });

      setNotice("Schedule exception deleted.");
      await loadData();
    } catch (error) {
      setPageError(errorMessage(error));
    } finally {
      setDeletingOverrideId(null);
    }
  }

  function customizeDate(dateValue: string, item?: Schedule) {
    const exception = overrides.find(
      (entry) => entry.override_date.slice(0, 10) === dateValue
    );

    setOverrideForm({
      override_date: dateValue,
      is_working: exception
        ? exception.is_working
        : Boolean(item?.is_working),
      start_time: exception?.start_time
        ? formatTime(exception.start_time)
        : item?.start_time
          ? formatTime(item.start_time)
          : "09:00",
      end_time: exception?.end_time
        ? formatTime(exception.end_time)
        : item?.end_time
          ? formatTime(item.end_time)
          : "17:00",
      reason: exception?.reason ?? "",
      notes: exception?.notes ?? "",
    });

    setPageError("");
    setNotice("");

    document.getElementById("date-exceptions")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push("/doctors")}
              className="mb-3 text-sm font-medium text-gray-500 hover:text-blue-600"
            >
              ← Back to doctors
            </button>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {getDoctorName(doctor)}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Working hours, appointment capacity and time off.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className={secondaryButtonClass}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </header>

        {pageError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => setPageError("")}
              className="font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
            Loading schedule...
          </div>
        ) : (
          <>
            {/* Summary */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Working days</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {workingDays}
                  <span className="ml-1 text-sm font-normal text-gray-400">
                    / 7
                  </span>
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Weekly hours</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {totalWeeklyHours.toLocaleString("en-IN", {
                    maximumFractionDigits: 1,
                  })}
                  <span className="ml-1 text-sm font-normal text-gray-400">
                    hrs
                  </span>
                </p>
              </div>

              <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-4 sm:col-span-1">
                <p className="text-sm text-gray-500">Schedule exceptions</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {overrides.length}
                </p>
              </div>
            </section>

            <WeeklyScheduleEditor
              doctorId={doctorId}
              schedules={schedules}
              onSaved={loadData}
            />

            {/* Weekly schedule */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Weekly schedule
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Recurring hours and default capacity for each day.
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  Repeats every week
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {DAYS.map((day, index) => {
                  const item = scheduleByDay.get(index);
                  const dayBreaks = breaksByDay.get(index) ?? [];
                  const isExpanded = expandedDay === index;

                  return (
                    <div key={day}>
                      <div className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-gray-50">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {day}
                            </span>

                            <span
                              className={[
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                item?.is_working
                                  ? "bg-green-50 text-green-700"
                                  : "bg-gray-100 text-gray-500",
                              ].join(" ")}
                            >
                              {item?.is_working ? "Working" : item ? "Day off" : "Not set"}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-gray-500">
                            {item?.is_working
                              ? `${formatTime(item.start_time)} – ${formatTime(item.end_time)}`
                              : "No working hours configured"}
                            {dayBreaks.length > 0 &&
                              ` · ${dayBreaks.length} ${dayBreaks.length === 1 ? "break" : "breaks"}`}
                          </p>
                        </div>

                        {item?.is_working && (
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {item.slot_capacity}
                            </p>
                            <p className="text-xs text-gray-400">
                              default patients / slot
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => startEditingDay(index)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white"
                        >
                          Edit hours
                        </button>

                        {item?.is_working && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDay(isExpanded ? null : index)
                            }
                            aria-expanded={isExpanded}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                          >
                            {isExpanded ? "Hide slots ↑" : "Edit slots ↓"}
                          </button>
                        )}
                      </div>

                      {/* Upcoming dates under each weekday */}
                      <div className="px-5 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-400">
                            Upcoming dates:
                          </span>

                          {Array.from({ length: 4 }, (_, dateIndex) => {
                            const date = new Date();
                            const todayDay = (date.getDay() + 6) % 7;
                            const daysUntil =
                              (index - todayDay + 7) % 7;

                            date.setDate(
                              date.getDate() +
                              daysUntil +
                              dateIndex * 7
                            );

                            const dateValue = [
                              date.getFullYear(),
                              String(date.getMonth() + 1).padStart(2, "0"),
                              String(date.getDate()).padStart(2, "0"),
                            ].join("-");

                            const dateLabel = date.toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                              }
                            );

                            const exception = overrides.find(
                              (entry) =>
                                entry.override_date.slice(0, 10) ===
                                dateValue
                            );

                            return (
                              <button
                                key={dateValue}
                                type="button"
                                onClick={() =>
                                  customizeDate(dateValue, item)
                                }
                                className={[
                                  "rounded-md border px-2.5 py-1 text-xs transition",
                                  exception
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600",
                                ].join(" ")}
                                title={
                                  exception
                                    ? "Date exception already exists"
                                    : "Customize this date"
                                }
                              >
                                {dateLabel}
                                {exception ? " •" : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {editingDay === index && scheduleForm && (
                        <form
                          onSubmit={saveSchedule}
                          className="space-y-4 border-t border-gray-100 bg-gray-50 p-5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-gray-900">
                              Edit {day}
                            </h3>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDay(null);
                                setScheduleForm(null);
                              }}
                              className="text-sm text-gray-500 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                          </div>

                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={scheduleForm.is_working}
                              onChange={(event) =>
                                setScheduleForm({
                                  ...scheduleForm,
                                  is_working: event.target.checked,
                                })
                              }
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            Doctor works on this day
                          </label>

                          {scheduleForm.is_working && (
                            <div className="grid gap-4 sm:grid-cols-3">
                              <label className="text-sm text-gray-700">
                                Start time
                                <input
                                  required
                                  type="time"
                                  value={scheduleForm.start_time ?? ""}
                                  onChange={(event) =>
                                    setScheduleForm({
                                      ...scheduleForm,
                                      start_time: event.target.value,
                                    })
                                  }
                                  className={inputClass}
                                />
                              </label>

                              <label className="text-sm text-gray-700">
                                End time
                                <input
                                  required
                                  type="time"
                                  value={scheduleForm.end_time ?? ""}
                                  onChange={(event) =>
                                    setScheduleForm({
                                      ...scheduleForm,
                                      end_time: event.target.value,
                                    })
                                  }
                                  className={inputClass}
                                />
                              </label>

                              <label className="text-sm text-gray-700">
                                Default patients per 30 minutes
                                <input
                                  required
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={scheduleForm.slot_capacity}
                                  onChange={(event) =>
                                    setScheduleForm({
                                      ...scheduleForm,
                                      slot_capacity: Number(
                                        event.target.value
                                      ),
                                    })
                                  }
                                  className={inputClass}
                                />
                              </label>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={savingSchedule}
                            className={primaryButtonClass}
                          >
                            {savingSchedule ? "Saving..." : "Save hours"}
                          </button>
                        </form>
                      )}

                      {isExpanded &&
                        item?.is_working &&
                        item.start_time &&
                        item.end_time && (
                          <div className="border-t border-gray-100 bg-gray-50/70 p-5">
                            <div className="mb-4">
                              <h3 className="font-semibold text-gray-900">
                                Individual slot capacities
                              </h3>
                              <p className="mt-1 text-sm text-gray-500">
                                Set a different patient limit for any
                                30-minute slot. Unchanged slots use the
                                day&apos;s default capacity of{" "}
                                {item.slot_capacity}.
                              </p>
                            </div>

                            <SlotCapacityEditor
                              doctorId={doctorId}
                              dayOfWeek={index}
                              startTime={item.start_time}
                              endTime={item.end_time}
                              defaultCapacity={item.slot_capacity}
                              breaks={breaksByDay.get(index) ?? []}
                            />
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Breaks */}
            <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Breaks
                    <span className="ml-2 text-sm font-normal text-gray-400">
                      {breaks.length}
                    </span>
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Recurring lunch breaks and unavailable periods.
                  </p>
                </div>
                <span className="text-gray-400 transition group-open:rotate-180">
                  ↓
                </span>
              </summary>

              <div className="space-y-5 border-t border-gray-100 p-5">
                {breaks.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No recurring breaks configured.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {breaks.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center gap-3 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">
                            {item.reason}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {DAYS[item.day_of_week]} ·{" "}
                            {formatTime(item.start_time)} –{" "}
                            {formatTime(item.end_time)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => startEditingBreak(item)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={deletingBreakId === item.id}
                          onClick={() => void deleteBreak(item)}
                          className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingBreakId === item.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={saveBreak}
                  className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <h3 className="font-semibold text-gray-900">
                    {editingBreakId ? "Edit break" : "Add recurring break"}
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-sm text-gray-700">
                      Day
                      <select
                        value={breakForm.day_of_week}
                        onChange={(event) =>
                          setBreakForm({
                            ...breakForm,
                            day_of_week: Number(event.target.value),
                          })
                        }
                        className={inputClass}
                      >
                        {DAYS.map((day, index) => (
                          <option key={day} value={index}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm text-gray-700">
                      Name
                      <input
                        required
                        maxLength={100}
                        value={breakForm.reason}
                        onChange={(event) =>
                          setBreakForm({
                            ...breakForm,
                            reason: event.target.value,
                          })
                        }
                        placeholder="e.g. Lunch"
                        className={inputClass}
                      />
                    </label>

                    <label className="text-sm text-gray-700">
                      Start
                      <input
                        required
                        type="time"
                        value={breakForm.start_time}
                        onChange={(event) =>
                          setBreakForm({
                            ...breakForm,
                            start_time: event.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </label>

                    <label className="text-sm text-gray-700">
                      End
                      <input
                        required
                        type="time"
                        value={breakForm.end_time}
                        onChange={(event) =>
                          setBreakForm({
                            ...breakForm,
                            end_time: event.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={savingBreak}
                      className={primaryButtonClass}
                    >
                      {savingBreak
                        ? "Saving..."
                        : editingBreakId
                          ? "Save changes"
                          : "Add break"}
                    </button>

                    {editingBreakId && (
                      <button
                        type="button"
                        onClick={resetBreakForm}
                        className={secondaryButtonClass}
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </details>

            {/* Date-specific overrides */}
            <details
              id="date-exceptions"
              className="group overflow-hidden rounded-2xl border border-gray-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Exceptions & holidays
                    <span className="ml-2 text-sm font-normal text-gray-400">
                      {overrides.length}
                    </span>
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    One-day leave, clinic holidays or different working hours.
                  </p>
                </div>
                <span className="text-gray-400 transition group-open:rotate-180">
                  ↓
                </span>
              </summary>

              <div className="space-y-5 border-t border-gray-100 p-5">
                {overrides.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No date-specific exceptions configured.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {overrides.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center gap-3 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">
                            {formatDate(item.override_date)}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {item.is_working
                              ? `${formatTime(item.start_time)} – ${formatTime(item.end_time)}`
                              : "Doctor unavailable"}
                            {item.reason ? ` · ${item.reason}` : ""}
                          </p>
                          {item.notes && (
                            <p className="mt-1 text-xs text-gray-400">
                              {item.notes}
                            </p>
                          )}
                        </div>

                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            item.is_working
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {item.is_working ? "Special hours" : "Day off"}
                        </span>

                        <button
                          type="button"
                          disabled={deletingOverrideId === item.id}
                          onClick={() => void deleteOverride(item)}
                          className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingOverrideId === item.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={saveOverride}
                  className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <h3 className="font-semibold text-gray-900">
                    Add exception
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="text-sm text-gray-700">
                      Date
                      <input
                        required
                        type="date"
                        value={overrideForm.override_date}
                        onChange={(event) =>
                          setOverrideForm({
                            ...overrideForm,
                            override_date: event.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </label>

                    <label className="flex items-center gap-2 self-end rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={overrideForm.is_working}
                        onChange={(event) =>
                          setOverrideForm({
                            ...overrideForm,
                            is_working: event.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Doctor is working
                    </label>

                    {overrideForm.is_working && (
                      <>
                        <label className="text-sm text-gray-700">
                          Start time
                          <input
                            required
                            type="time"
                            value={overrideForm.start_time}
                            onChange={(event) =>
                              setOverrideForm({
                                ...overrideForm,
                                start_time: event.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        </label>

                        <label className="text-sm text-gray-700">
                          End time
                          <input
                            required
                            type="time"
                            value={overrideForm.end_time}
                            onChange={(event) =>
                              setOverrideForm({
                                ...overrideForm,
                                end_time: event.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        </label>
                      </>
                    )}

                    <label className="text-sm text-gray-700">
                      Reason
                      <input
                        value={overrideForm.reason}
                        onChange={(event) =>
                          setOverrideForm({
                            ...overrideForm,
                            reason: event.target.value,
                          })
                        }
                        placeholder="e.g. Holiday"
                        className={inputClass}
                      />
                    </label>

                    <label className="text-sm text-gray-700">
                      Notes
                      <input
                        value={overrideForm.notes}
                        onChange={(event) =>
                          setOverrideForm({
                            ...overrideForm,
                            notes: event.target.value,
                          })
                        }
                        placeholder="Optional"
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingOverride}
                    className={primaryButtonClass}
                  >
                    {savingOverride ? "Saving..." : "Save exception"}
                  </button>
                </form>
              </div>
            </details>
          </>
        )}
      </main>
    </AppShell>
  );
}
