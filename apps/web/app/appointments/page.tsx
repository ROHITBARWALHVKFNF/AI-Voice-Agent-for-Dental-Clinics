"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import AppointmentModal from "@/components/appointments/AppointmentModal";
import AppShell from "@/components/layout/AppShell";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "pending"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";

type Appointment = {
  id: string;
  organization_id: string;
  patient_id: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  appointment_type: string | null;
  notes: string | null;
  cancellation_reason: string | null;
};

type Patient = {
  id: string;
  organization_id?: string;
  full_name: string;
  phone: string | null;
  email: string | null;
};

type Doctor = {
  id: string;
  organization_id?: string;
  full_name: string;
  specialization: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

type AvailabilitySlot = {
  start: string;
  end: string;
  available: boolean;
  capacity: number;
  booked: number;
  remaining: number;
};

const STATUS_OPTIONS: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "pending",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
];

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: "Invalid date",
      time: "Invalid time",
    };
  }

  return {
    date: date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }),
  };
}

function formatStatus(status: AppointmentStatus) {
  return status
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusClasses(status: AppointmentStatus) {
  switch (status) {
    case "confirmed":
      return "bg-green-50 text-green-700 border-green-200";

    case "scheduled":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";

    case "no_show":
      return "bg-gray-100 text-gray-700 border-gray-200";

    case "rescheduled":
      return "bg-purple-50 text-purple-700 border-purple-200";

    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function buildLocalDateTime(
  date: string,
  time: string
): Date | null {
  if (!date || !time) {
    return null;
  }

  const iso = `${date}T${time}:00+05:30`;
  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function normalizeArray<T>(
  value: unknown,
  key?: string
): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (
    key &&
    typeof value === "object" &&
    value !== null &&
    key in value
  ) {
    const nested = (
      value as Record<string, unknown>
    )[key];

    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }

  return [];
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [doctors, setDoctors] =
    useState<Doctor[]>([]);

  const [organizationId, setOrganizationId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [dateFilter, setDateFilter] =
    useState("");

  const [doctorFilter, setDoctorFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [modalDoctorId, setModalDoctorId] =
    useState("");

  const [modalDate, setModalDate] =
    useState("");

  const [modalAvailability, setModalAvailability] =
    useState<AvailabilitySlot[]>([]);

  const [availabilityLoading, setAvailabilityLoading] =
    useState(false);

  const [availabilityError, setAvailabilityError] =
    useState("");

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [detailsOpen, setDetailsOpen] =
    useState(false);

  const [rescheduleMode, setRescheduleMode] =
    useState(false);

  const [rescheduleDate, setRescheduleDate] =
    useState("");

  const [rescheduleTime, setRescheduleTime] =
    useState("");

  const [rescheduleAvailability, setRescheduleAvailability] =
    useState<AvailabilitySlot[]>([]);

  const [rescheduleLoading, setRescheduleLoading] =
    useState(false);

  const [
    rescheduleAvailabilityLoading,
    setRescheduleAvailabilityLoading,
  ] = useState(false);

  const [rescheduleError, setRescheduleError] =
    useState("");

  const [cancelMode, setCancelMode] =
    useState(false);

  const [cancellationReason, setCancellationReason] =
    useState("");

  const [cancelLoading, setCancelLoading] =
    useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const session = getAuthSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const currentOrganizationId =
        session.organizationId;

      setOrganizationId(currentOrganizationId);

      const [
        appointmentsResponse,
        patientsResponse,
        doctorsResponse,
      ] = await Promise.all([
        apiFetch("/appointments"),

        apiFetch(
          `/patients?organization_id=${currentOrganizationId}`
        ),

        apiFetch("/doctors"),
      ]);

      const appointmentsRaw =
        appointmentsResponse instanceof Response
          ? await parseApiResponse(
            appointmentsResponse
          )
          : appointmentsResponse;

      const patientsRaw =
        patientsResponse instanceof Response
          ? await parseApiResponse(
            patientsResponse
          )
          : patientsResponse;

      const doctorsRaw =
        doctorsResponse instanceof Response
          ? await parseApiResponse(
            doctorsResponse
          )
          : doctorsResponse;

      const appointmentsData =
        normalizeArray<Appointment>(
          appointmentsRaw,
          "appointments"
        );

      const patientsData =
        normalizeArray<Patient>(
          patientsRaw,
          "patients"
        );

      const doctorsData =
        normalizeArray<Doctor>(
          doctorsRaw,
          "doctors"
        );

      setAppointments(appointmentsData);
      setPatients(patientsData);
      setDoctors(doctorsData);

      if (
        doctorsData.length > 0 &&
        !modalDoctorId
      ) {
        setModalDoctorId(
          doctorsData[0].id
        );
      }
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to load appointments."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const patientMap = useMemo(() => {
    const safePatients =
      Array.isArray(patients)
        ? patients
        : [];

    return new Map(
      safePatients.map((patient) => [
        patient.id,
        patient,
      ])
    );
  }, [patients]);

  const doctorMap = useMemo(() => {
    const safeDoctors =
      Array.isArray(doctors)
        ? doctors
        : [];

    return new Map(
      safeDoctors.map((doctor) => [
        doctor.id,
        doctor,
      ])
    );
  }, [doctors]);

  const filteredAppointments =
    useMemo(() => {
      const safeAppointments =
        Array.isArray(appointments)
          ? appointments
          : [];

      return safeAppointments.filter(
        (appointment) => {
          const patient =
            patientMap.get(
              appointment.patient_id
            );

          const doctor =
            doctorMap.get(
              appointment.doctor_id
            );

          const patientName =
            patient?.full_name || "";

          const patientPhone =
            patient?.phone || "";

          const doctorName =
            doctor?.full_name || "";

          const searchValue =
            search
              .toLowerCase()
              .trim();

          const matchesSearch =
            !searchValue ||
            patientName
              .toLowerCase()
              .includes(searchValue) ||
            patientPhone
              .toLowerCase()
              .includes(searchValue) ||
            doctorName
              .toLowerCase()
              .includes(searchValue) ||
            (
              appointment.appointment_type ||
              ""
            )
              .toLowerCase()
              .includes(searchValue);

          const appointmentDate =
            new Date(
              appointment.start_time
            ).toLocaleDateString(
              "en-CA",
              {
                timeZone:
                  "Asia/Kolkata",
              }
            );

          const matchesDate =
            !dateFilter ||
            appointmentDate ===
            dateFilter;

          const matchesDoctor =
            !doctorFilter ||
            appointment.doctor_id ===
            doctorFilter;

          const matchesStatus =
            !statusFilter ||
            appointment.status ===
            statusFilter;

          return (
            matchesSearch &&
            matchesDate &&
            matchesDoctor &&
            matchesStatus
          );
        }
      );
    }, [
      appointments,
      patientMap,
      doctorMap,
      search,
      dateFilter,
      doctorFilter,
      statusFilter,
    ]);

  const stats = useMemo(() => {
    const safeAppointments =
      Array.isArray(appointments)
        ? appointments
        : [];

    return {
      total: safeAppointments.length,

      scheduled:
        safeAppointments.filter(
          (item) =>
            item.status ===
            "scheduled"
        ).length,

      confirmed:
        safeAppointments.filter(
          (item) =>
            item.status ===
            "confirmed"
        ).length,

      pending:
        safeAppointments.filter(
          (item) =>
            item.status ===
            "pending"
        ).length,

      completed:
        safeAppointments.filter(
          (item) =>
            item.status ===
            "completed"
        ).length,
    };
  }, [appointments]);

  async function updateStatus(
    appointmentId: string,
    status: AppointmentStatus
  ) {
    try {
      const response =
        await apiFetch(
          `/appointments/${appointmentId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status,
            }),
          }
        );

      const updated =
        response instanceof Response
          ? await parseApiResponse(
            response
          )
          : response;

      setAppointments(
        (current) =>
          current.map(
            (appointment) =>
              appointment.id ===
                appointmentId
                ? {
                  ...appointment,
                  ...(updated as Partial<Appointment>),
                  status,
                }
                : appointment
          )
      );

      if (
        selectedAppointment?.id ===
        appointmentId
      ) {
        setSelectedAppointment(
          (current) =>
            current
              ? {
                ...current,
                ...(updated as Partial<Appointment>),
                status,
              }
              : null
        );
      }
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Failed to update appointment."
      );
    }
  }

  function clearFilters() {
    setSearch("");
    setDateFilter("");
    setDoctorFilter("");
    setStatusFilter("");
  }

  function getTodayDate() {
    return new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kolkata",
      }
    ).format(new Date());
  }

  function getMaxBookingDate(): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value])
    );

    const today = new Date(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      12
    );

    const originalDay = today.getDate();
    today.setDate(1);
    today.setMonth(today.getMonth() + 3);

    const lastDay = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();

    today.setDate(Math.min(originalDay, lastDay));

    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
  }


  async function loadAvailability(
    doctorId: string,
    date: string
  ) {
    if (!doctorId || !date) {
      setModalAvailability([]);
      setAvailabilityError("");
      return;
    }

    try {
      setAvailabilityLoading(true);
      setAvailabilityError("");

      const response =
        await apiFetch(
          `/availability-slots/${doctorId}?requested_date=${date}&slot_duration_minutes=30`);

      const data =
        response instanceof Response
          ? await parseApiResponse(
            response
          )
          : response;

      const slots =
        Array.isArray(data?.slots)
          ? data.slots
          : [];

      setModalAvailability(slots);

      if (
        data?.is_available === false
      ) {
        setAvailabilityError(
          data.reason ||
          "Doctor is not available on this date."
        );
      }
    } catch (err) {
      console.error(err);

      setModalAvailability([]);

      setAvailabilityError(
        err instanceof Error
          ? err.message
          : "Failed to load availability."
      );
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function openNewAppointment() {
    if (
      !Array.isArray(doctors) ||
      doctors.length === 0
    ) {
      alert(
        "No active doctors are available."
      );
      return;
    }

    const firstDoctor =
      doctors[0];

    const date =
      getTodayDate();

    setModalDoctorId(
      firstDoctor.id
    );

    setModalDate(date);
    setModalAvailability([]);
    setAvailabilityError("");
    setModalOpen(true);

    await loadAvailability(
      firstDoctor.id,
      date
    );
  }

  async function handleModalDoctorChange(
    doctorId: string
  ) {
    setModalDoctorId(doctorId);
    setModalAvailability([]);
    setAvailabilityError("");

    if (!modalDate) {
      return;
    }

    await loadAvailability(
      doctorId,
      modalDate
    );
  }

  async function handleModalDateChange(
    date: string
  ) {
    setModalDate(date);
    setModalAvailability([]);
    setAvailabilityError("");

    if (
      !modalDoctorId ||
      !date
    ) {
      return;
    }

    await loadAvailability(
      modalDoctorId,
      date
    );
  }

  async function handleModalCreated() {
    await loadData();

    if (
      modalDoctorId &&
      modalDate
    ) {
      await loadAvailability(
        modalDoctorId,
        modalDate
      );
    }
  }

  function openAppointmentDetails(
    appointment: Appointment
  ) {
    setSelectedAppointment(
      appointment
    );

    setDetailsOpen(true);
    setRescheduleMode(false);
    setCancelMode(false);
    setRescheduleError("");
    setCancellationReason("");
  }

  function closeDetails() {
    setDetailsOpen(false);
    setSelectedAppointment(null);
    setRescheduleMode(false);
    setCancelMode(false);
    setRescheduleError("");
    setCancellationReason("");
  }

  function startReschedule() {
    if (!selectedAppointment) {
      return;
    }

    const currentDate =
      new Date(
        selectedAppointment.start_time
      );

    const date =
      currentDate.toLocaleDateString(
        "en-CA",
        {
          timeZone:
            "Asia/Kolkata",
        }
      );

    const time =
      currentDate.toLocaleTimeString(
        "en-GB",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone:
            "Asia/Kolkata",
        }
      );

    setRescheduleDate(date);
    setRescheduleTime(time);
    setRescheduleAvailability([]);
    setRescheduleError("");
    setCancelMode(false);
    setRescheduleMode(true);

    loadRescheduleAvailability(
      selectedAppointment.doctor_id,
      date
    );
  }

  async function loadRescheduleAvailability(
    doctorId: string,
    date: string
  ) {
    if (!doctorId || !date) {
      setRescheduleAvailability([]);
      return;
    }

    try {
      setRescheduleAvailabilityLoading(
        true
      );

      setRescheduleError("");

      const response =
        await apiFetch(
          `/availability/slots/${doctorId}?requested_date=${date}&slot_duration_minutes=30`
        );

      const data =
        response instanceof Response
          ? await parseApiResponse(
            response
          )
          : response;

      let slots: AvailabilitySlot[] =
        Array.isArray(data?.slots)
          ? data.slots
          : [];

      if (
        selectedAppointment &&
        selectedAppointment.doctor_id ===
        doctorId
      ) {
        const currentStart =
          new Date(
            selectedAppointment.start_time
          );

        const currentDate =
          currentStart.toLocaleDateString(
            "en-CA",
            {
              timeZone:
                "Asia/Kolkata",
            }
          );

        const currentTime =
          currentStart.toLocaleTimeString(
            "en-GB",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone:
                "Asia/Kolkata",
            }
          );

        if (
          currentDate === date
        ) {
          slots = slots.map(
            (slot) =>
              slot.start ===
                currentTime
                ? {
                  ...slot,
                  available:
                    true,
                  remaining:
                    Math.max(
                      slot.remaining,
                      1
                    ),
                }
                : slot
          );
        }
      }

      setRescheduleAvailability(
        slots
      );

      if (
        data?.is_available === false
      ) {
        setRescheduleError(
          data.reason ||
          "Doctor is not available on this date."
        );
      }
    } catch (err) {
      console.error(err);

      setRescheduleAvailability([]);

      setRescheduleError(
        err instanceof Error
          ? err.message
          : "Failed to load availability."
      );
    } finally {
      setRescheduleAvailabilityLoading(
        false
      );
    }
  }

  async function handleRescheduleDateChange(
    date: string
  ) {
    setRescheduleDate(date);
    setRescheduleTime("");

    if (!selectedAppointment) {
      return;
    }

    await loadRescheduleAvailability(
      selectedAppointment.doctor_id,
      date
    );
  }

  async function saveReschedule() {
    if (!selectedAppointment) {
      return;
    }

    if (!rescheduleDate) {
      setRescheduleError(
        "Please select a date."
      );
      return;
    }

    if (!rescheduleTime) {
      setRescheduleError(
        "Please select a time."
      );
      return;
    }

    const startDate =
      buildLocalDateTime(
        rescheduleDate,
        rescheduleTime
      );

    if (!startDate) {
      setRescheduleError(
        "Invalid appointment date or time."
      );
      return;
    }

    const endDate =
      new Date(
        startDate.getTime() +
        30 * 60 * 1000
      );

    try {
      setRescheduleLoading(true);
      setRescheduleError("");

      const response =
        await apiFetch(
          `/appointments/${selectedAppointment.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              start_time:
                startDate.toISOString(),
              end_time:
                endDate.toISOString(),
              status:
                "rescheduled",
            }),
          }
        );

      const updated =
        response instanceof Response
          ? await parseApiResponse(
            response
          )
          : response;

      setAppointments(
        (current) =>
          current.map(
            (appointment) =>
              appointment.id ===
                updated.id
                ? updated
                : appointment
          )
      );

      setSelectedAppointment(
        updated
      );

      setRescheduleMode(false);

      alert(
        "Appointment rescheduled successfully."
      );
    } catch (err) {
      console.error(err);

      setRescheduleError(
        err instanceof Error
          ? err.message
          : "Failed to reschedule appointment."
      );
    } finally {
      setRescheduleLoading(false);
    }
  }

  function startCancel() {
    setCancelMode(true);
    setRescheduleMode(false);
    setCancellationReason("");
    setRescheduleError("");
  }

  async function confirmCancel() {
    if (!selectedAppointment) {
      return;
    }

    try {
      setCancelLoading(true);

      const response =
        await apiFetch(
          `/appointments/${selectedAppointment.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status:
                "cancelled",
              cancellation_reason:
                cancellationReason.trim() ||
                "Cancelled by clinic",
            }),
          }
        );

      const updated =
        response instanceof Response
          ? await parseApiResponse(
            response
          )
          : response;

      setAppointments(
        (current) =>
          current.map(
            (appointment) =>
              appointment.id ===
                updated.id
                ? updated
                : appointment
          )
      );

      setSelectedAppointment(
        updated
      );

      setCancelMode(false);
      setCancellationReason("");

      alert(
        "Appointment cancelled successfully."
      );
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Failed to cancel appointment."
      );
    } finally {
      setCancelLoading(false);
    }
  }

  const modalDoctor =
    doctors.find(
      (doctor) =>
        doctor.id ===
        modalDoctorId
    );

  const selectedPatient =
    selectedAppointment
      ? patientMap.get(
        selectedAppointment.patient_id
      )
      : null;

  const selectedDoctor =
    selectedAppointment
      ? doctorMap.get(
        selectedAppointment.doctor_id
      )
      : null;

  return (
    <AppShell>
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* HEADER */}

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                Clinic OS
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Appointments
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage all clinic appointments from one place.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewAppointment}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              + New Appointment
            </button>
          </div>

          {/* STATS */}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatCard
              label="Total"
              value={stats.total}
            />

            <StatCard
              label="Scheduled"
              value={stats.scheduled}
              valueClass="text-blue-600"
            />

            <StatCard
              label="Confirmed"
              value={stats.confirmed}
              valueClass="text-green-600"
            />

            <StatCard
              label="Pending"
              value={stats.pending}
              valueClass="text-amber-600"
            />

            <StatCard
              label="Completed"
              value={stats.completed}
              valueClass="text-emerald-600"
            />
          </div>

          {/* FILTERS */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <input
                type="text"
                placeholder="Search patient or doctor..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />

              <input
                type="date"
                value={dateFilter}
                onChange={(event) =>
                  setDateFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />

              <select
                value={doctorFilter}
                onChange={(event) =>
                  setDoctorFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">
                  All doctors
                </option>

                {doctors.map(
                  (doctor) => (
                    <option
                      key={doctor.id}
                      value={doctor.id}
                    >
                      {doctor.full_name}
                    </option>
                  )
                )}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">
                  All statuses
                </option>

                {STATUS_OPTIONS.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {formatStatus(
                        status
                      )}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">
                Failed to load appointments
              </p>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>

              <button
                type="button"
                onClick={loadData}
                className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}

          {/* TABLE */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Appointment List
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {filteredAppointments.length}{" "}
                    appointment
                    {filteredAppointments.length !==
                      1
                      ? "s"
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadData}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center">
                <p className="text-sm text-slate-500">
                  Loading appointments...
                </p>
              </div>
            ) : filteredAppointments.length ===
              0 ? (
              <div className="p-10 text-center">
                <p className="font-medium text-slate-900">
                  No appointments found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Try changing your filters or create a new appointment.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Patient
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Doctor
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Date & Time
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Type
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAppointments.map(
                      (appointment) => {
                        const patient =
                          patientMap.get(
                            appointment.patient_id
                          );

                        const doctor =
                          doctorMap.get(
                            appointment.doctor_id
                          );

                        const formatted =
                          formatDateTime(
                            appointment.start_time
                          );

                        return (
                          <tr
                            key={
                              appointment.id
                            }
                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <p className="font-medium text-slate-900">
                                {patient?.full_name ||
                                  "Unknown patient"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {patient?.phone ||
                                  "No phone number"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-slate-900">
                                {doctor?.full_name ||
                                  "Unknown doctor"}
                              </p>

                              {doctor?.specialization && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    doctor.specialization
                                  }
                                </p>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-slate-900">
                                {formatted.date}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatted.time}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span className="text-sm text-slate-700">
                                {appointment.appointment_type ||
                                  "General consultation"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <select
                                value={
                                  appointment.status
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateStatus(
                                    appointment.id,
                                    event.target.value as AppointmentStatus
                                  )
                                }
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium outline-none ${getStatusClasses(
                                  appointment.status
                                )}`}
                              >
                                {STATUS_OPTIONS.map(
                                  (
                                    status
                                  ) => (
                                    <option
                                      key={
                                        status
                                      }
                                      value={
                                        status
                                      }
                                    >
                                      {formatStatus(
                                        status
                                      )}
                                    </option>
                                  )
                                )}
                              </select>
                            </td>

                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  openAppointmentDetails(
                                    appointment
                                  )
                                }
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* NEW APPOINTMENT MODAL */}

      {modalDoctor && (
        <AppointmentModal
          open={modalOpen}
          onClose={() =>
            setModalOpen(false)
          }
          onCreated={
            handleModalCreated
          }
          organizationId={
            organizationId
          }
          doctorId={
            modalDoctorId
          }
          doctorName={
            modalDoctor.full_name
          }
          selectedDate={
            modalDate
          }
          patients={patients}
          doctors={doctors}
          availability={
            modalAvailability
          }
          onDoctorChange={
            handleModalDoctorChange
          }
          onDateChange={
            handleModalDateChange
          }
          availabilityLoading={
            availabilityLoading
          }
          availabilityError={
            availabilityError
          }
        />
      )}

      {/* APPOINTMENT DETAILS MODAL */}

      {detailsOpen &&
        selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Appointment Details
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage this appointment
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDetails}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <div className="max-h-[80vh] overflow-y-auto px-6 py-6">

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Patient
                  </p>

                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {selectedPatient?.full_name ||
                      "Unknown patient"}
                  </p>

                  {selectedPatient?.phone && (
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedPatient.phone}
                    </p>
                  )}

                  {selectedPatient?.email && (
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedPatient.email}
                    </p>
                  )}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Doctor
                    </p>

                    <p className="mt-2 font-semibold text-slate-900">
                      {selectedDoctor?.full_name ||
                        "Unknown doctor"}
                    </p>

                    {selectedDoctor?.specialization && (
                      <p className="mt-1 text-sm text-slate-500">
                        {
                          selectedDoctor.specialization
                        }
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </p>

                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${getStatusClasses(
                          selectedAppointment.status
                        )}`}
                      >
                        {formatStatus(
                          selectedAppointment.status
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </p>

                    <p className="mt-2 font-semibold text-slate-900">
                      {
                        formatDateTime(
                          selectedAppointment.start_time
                        ).date
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Time
                    </p>

                    <p className="mt-2 font-semibold text-slate-900">
                      {
                        formatDateTime(
                          selectedAppointment.start_time
                        ).time
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Appointment Type
                    </p>

                    <p className="mt-2 font-medium text-slate-900">
                      {selectedAppointment.appointment_type ||
                        "General consultation"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Notes
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {selectedAppointment.notes ||
                        "No notes added."}
                    </p>
                  </div>

                  {selectedAppointment.cancellation_reason && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                        Cancellation Reason
                      </p>

                      <p className="mt-2 text-sm text-red-700">
                        {
                          selectedAppointment.cancellation_reason
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* RESCHEDULE */}

                {rescheduleMode && (
                  <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
                    <h3 className="font-semibold text-slate-900">
                      Reschedule Appointment
                    </h3>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          New Date
                        </label>

                        <input
                          type="date"
                          value={
                            rescheduleDate
                          }
                          min={getTodayDate()}
                          max={getMaxBookingDate()}
                          onChange={(
                            event
                          ) =>
                            handleRescheduleDateChange(
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          New Time
                        </label>

                        <select
                          value={
                            rescheduleTime
                          }
                          onChange={(
                            event
                          ) =>
                            setRescheduleTime(
                              event.target.value
                            )
                          }
                          disabled={
                            rescheduleAvailabilityLoading
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                        >
                          <option value="">
                            Select time
                          </option>

                          {rescheduleAvailability
                            .filter(
                              (
                                slot
                              ) =>
                                slot.available &&
                                slot.remaining >
                                0
                            )
                            .map(
                              (
                                slot
                              ) => (
                                <option
                                  key={
                                    slot.start
                                  }
                                  value={
                                    slot.start
                                  }
                                >
                                  {slot.start} -{" "}
                                  {slot.end} (
                                  {
                                    slot.remaining
                                  }{" "}
                                  spots)
                                </option>
                              )
                            )}
                        </select>
                      </div>
                    </div>

                    {rescheduleAvailabilityLoading && (
                      <p className="mt-3 text-sm text-blue-700">
                        Loading available times...
                      </p>
                    )}

                    {rescheduleError && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {rescheduleError}
                      </div>
                    )}

                    <div className="mt-5 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setRescheduleMode(
                            false
                          )
                        }
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Back
                      </button>

                      <button
                        type="button"
                        onClick={
                          saveReschedule
                        }
                        disabled={
                          rescheduleLoading ||
                          rescheduleAvailabilityLoading ||
                          !rescheduleTime
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {rescheduleLoading
                          ? "Saving..."
                          : "Save Reschedule"}
                      </button>
                    </div>
                  </div>
                )}

                {/* CANCEL */}

                {cancelMode && (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
                    <h3 className="font-semibold text-red-800">
                      Cancel Appointment
                    </h3>

                    <p className="mt-1 text-sm text-red-700">
                      This will mark the appointment as cancelled.
                    </p>

                    <textarea
                      value={
                        cancellationReason
                      }
                      onChange={(
                        event
                      ) =>
                        setCancellationReason(
                          event.target.value
                        )
                      }
                      rows={3}
                      placeholder="Cancellation reason..."
                      className="mt-4 w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-3 text-sm outline-none focus:border-red-400"
                    />

                    <div className="mt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setCancelMode(
                            false
                          )
                        }
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Back
                      </button>

                      <button
                        type="button"
                        onClick={
                          confirmCancel
                        }
                        disabled={
                          cancelLoading
                        }
                        className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cancelLoading
                          ? "Cancelling..."
                          : "Confirm Cancellation"}
                      </button>
                    </div>
                  </div>
                )}

                {/* ACTIONS */}

                {!rescheduleMode &&
                  !cancelMode && (
                    <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">

                      <button
                        type="button"
                        onClick={
                          closeDetails
                        }
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Close
                      </button>

                      {selectedAppointment.status !==
                        "cancelled" &&
                        selectedAppointment.status !==
                        "completed" && (
                          <>
                            <button
                              type="button"
                              onClick={
                                startReschedule
                              }
                              className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Reschedule
                            </button>

                            <button
                              type="button"
                              onClick={
                                startCancel
                              }
                              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
                            >
                              Cancel Appointment
                            </button>
                          </>
                        )}
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
    </AppShell>
  );
}

async function parseApiResponse(
  response: Response
): Promise<any> {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let data: any;

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let message =
      "Something went wrong.";

    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data
    ) {
      message =
        typeof data.detail ===
          "string"
          ? data.detail
          : JSON.stringify(
            data.detail
          );
    } else if (
      typeof data === "string" &&
      data
    ) {
      message = data;
    }

    throw new Error(message);
  }

  return data;
}

function StatCard({
  label,
  value,
  valueClass = "text-gray-900",
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-semibold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}