"use client";

import {
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";

import { apiJson } from "@/lib/api";

type Patient = {
    id: string;
    full_name: string;
    phone?: string | null;
    email?: string | null;
};

type Doctor = {
    id: string;
    full_name: string;
};

type AvailabilitySlot = {
    start: string;
    end: string;
    available: boolean;
    capacity: number;
    booked: number;
    remaining: number;
};

type AppointmentModalProps = {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    organizationId: string;
    doctorId: string;
    doctorName: string;
    selectedDate: string;
    selectedTime?: string | null;
    patients: Patient[];
    doctors: Doctor[];
    availability: AvailabilitySlot[];
    onDoctorChange: (doctorId: string) => void;
    onDateChange: (date: string) => void;
    availabilityLoading?: boolean;
    availabilityError?: string;
};

function buildDateTime(
    selectedDate: string,
    timeValue: string
): Date | null {
    if (!selectedDate || !timeValue) {
        return null;
    }

    // The backend may provide a complete ISO datetime.
    if (timeValue.includes("T")) {
        const parsed = new Date(timeValue);

        return Number.isNaN(parsed.getTime())
            ? null
            : parsed;
    }

    // Or it may provide only HH:mm or HH:mm:ss.
    const match = timeValue.match(
        /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
    );

    if (!match) {
        return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || "0");

    if (
        hours > 23 ||
        minutes > 59 ||
        seconds > 59
    ) {
        return null;
    }

    const isoString =
        `${selectedDate}T` +
        `${String(hours).padStart(2, "0")}:` +
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}` +
        "+05:30";

    const parsed = new Date(isoString);

    return Number.isNaN(parsed.getTime())
        ? null
        : parsed;
}

function formatSlotTime(
    selectedDate: string,
    value: string
): string {
    const date = buildDateTime(
        selectedDate,
        value
    );

    if (!date) {
        return value;
    }

    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
    });
}

function getTodayInIndia(): string {
    const parts = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }
    ).formatToParts(new Date());

    const values = Object.fromEntries(
        parts.map((part) => [
            part.type,
            part.value,
        ])
    );

    return `${values.year}-${values.month}-${values.day}`;
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


function getApiErrorMessage(
    error: unknown
): string {
    if (error instanceof Error) {
        const message = error.message;

        if (
            message.includes("409") ||
            /slot.*(full|booked|available)/i.test(message) ||
            /appointment.*(conflict|overlap)/i.test(message)
        ) {
            return "This slot may have just been booked. Please refresh availability and select another slot.";
        }

        return message || "Unable to create appointment.";
    }

    return "Unable to create appointment. Please try again.";
}

export default function AppointmentModal({
    open,
    onClose,
    onCreated,
    organizationId,
    doctorId,
    doctorName,
    selectedDate,
    selectedTime,
    patients,
    doctors,
    availability,
    onDoctorChange,
    onDateChange,
    availabilityLoading = false,
    availabilityError = "",
}: AppointmentModalProps) {
    const [patientMode, setPatientMode] =
        useState<"existing" | "new">("existing");

    const [patientId, setPatientId] =
        useState("");

    const [newPatientName, setNewPatientName] =
        useState("");

    const [newPatientPhone, setNewPatientPhone] =
        useState("");

    const [newPatientEmail, setNewPatientEmail] =
        useState("");

    const [selectedDoctorId, setSelectedDoctorId] =
        useState(doctorId);

    const [selectedSlot, setSelectedSlot] =
        useState(selectedTime || "");

    const [appointmentType, setAppointmentType] =
        useState("Dental Consultation");

    const [notes, setNotes] = useState("");

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) {
            return;
        }

        setSelectedDoctorId(doctorId);
        setSelectedSlot(selectedTime || "");
        setError("");
    }, [open, doctorId, selectedTime]);

    useEffect(() => {
        setSelectedSlot("");
    }, [selectedDoctorId, selectedDate]);

    const availableSlots = useMemo(
        () =>
            availability.filter(
                (slot) =>
                    slot.available && slot.remaining > 0
            ),
        [availability]
    );

    const today = useMemo(
        () => getTodayInIndia(),
        []
    );

    if (!open) {
        return null;
    }

    function resetForm() {
        setPatientMode("existing");
        setPatientId("");
        setNewPatientName("");
        setNewPatientPhone("");
        setNewPatientEmail("");
        setSelectedSlot("");
        setAppointmentType("Dental Consultation");
        setNotes("");
        setError("");
    }

    function handleDoctorChange(
        doctorIdValue: string
    ) {
        setSelectedDoctorId(doctorIdValue);
        setSelectedSlot("");
        setError("");
        onDoctorChange(doctorIdValue);
    }

    function handleDateChange(date: string) {
        setSelectedSlot("");
        setError("");
        onDateChange(date);
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setError("");

        if (!organizationId) {
            setError(
                "Your clinic organization could not be identified. Please sign in again."
            );
            return;
        }

        if (!selectedDoctorId) {
            setError("Please select a doctor.");
            return;
        }

        if (!selectedDate) {
            setError("Please select an appointment date.");
            return;
        }

        if (!selectedSlot) {
            setError(
                "Please select an available time slot."
            );
            return;
        }

        if (
            patientMode === "existing" &&
            !patientId
        ) {
            setError("Please select a patient.");
            return;
        }

        if (
            patientMode === "new" &&
            !newPatientName.trim()
        ) {
            setError(
                "Please enter the patient's full name."
            );
            return;
        }

        if (
            newPatientEmail.trim() &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                newPatientEmail.trim()
            ) &&
            patientMode === "new"
        ) {
            setError(
                "Please enter a valid email address."
            );
            return;
        }

        const selectedAvailabilitySlot =
            availableSlots.find(
                (slot) => slot.start === selectedSlot
            );

        if (!selectedAvailabilitySlot) {
            setError(
                "This time slot is no longer available. Please select another slot."
            );
            return;
        }

        const startDate = buildDateTime(
            selectedDate,
            selectedAvailabilitySlot.start
        );

        const endDate = buildDateTime(
            selectedDate,
            selectedAvailabilitySlot.end
        );

        if (
            !startDate ||
            !endDate ||
            endDate.getTime() <= startDate.getTime()
        ) {
            setError(
                "The selected appointment time is invalid. Please refresh availability and try again."
            );
            return;
        }

        setLoading(true);

        try {
            let finalPatientId = patientId;

            if (patientMode === "new") {
                const patient = await apiJson<Patient>(
                    "/patients",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            organization_id: organizationId,
                            full_name: newPatientName.trim(),
                            phone:
                                newPatientPhone.trim() || null,
                            email:
                                newPatientEmail.trim() || null,
                        }),
                    }
                );

                if (!patient?.id) {
                    throw new Error(
                        "The patient was created, but the server did not return a patient ID. Please check the patient list before trying again."
                    );
                }

                finalPatientId = patient.id;
            }

            await apiJson<unknown>(
                "/appointments",
                {
                    method: "POST",
                    body: JSON.stringify({
                        organization_id: organizationId,
                        patient_id: finalPatientId,
                        doctor_id: selectedDoctorId,
                        start_time: startDate.toISOString(),
                        end_time: endDate.toISOString(),
                        appointment_type: appointmentType,
                        notes: notes.trim() || null,
                    }),
                }
            );

            resetForm();
            onCreated();
            onClose();
        } catch (err) {
            setError(getApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-modal-title"
        >
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                    <div>
                        <h2
                            id="appointment-modal-title"
                            className="text-xl font-semibold text-gray-900"
                        >
                            New Appointment
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            {selectedDate || "No date selected"}
                            {" · "}
                            {doctors.find(
                                (doctor) =>
                                    doctor.id === selectedDoctorId
                            )?.full_name || doctorName}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close appointment modal"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                    >
                        ×
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="max-h-[80vh] overflow-y-auto px-6 py-6"
                >
                    {/* PATIENT */}
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Patient
                        </label>

                        <div className="mb-3 flex rounded-lg bg-gray-100 p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setPatientMode("existing");
                                    setError("");
                                }}
                                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${patientMode === "existing"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500"
                                    }`}
                            >
                                Existing Patient
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setPatientMode("new");
                                    setError("");
                                }}
                                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${patientMode === "new"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500"
                                    }`}
                            >
                                New Patient
                            </button>
                        </div>

                        {patientMode === "existing" ? (
                            <select
                                value={patientId}
                                onChange={(event) =>
                                    setPatientId(event.target.value)
                                }
                                required
                                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                            >
                                <option value="">
                                    Select patient
                                </option>

                                {patients.map((patient) => (
                                    <option
                                        key={patient.id}
                                        value={patient.id}
                                    >
                                        {patient.full_name}
                                        {patient.phone
                                            ? ` — ${patient.phone}`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="space-y-3">
                                <input
                                    value={newPatientName}
                                    onChange={(event) =>
                                        setNewPatientName(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Patient full name"
                                    autoComplete="name"
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                                />

                                <input
                                    type="tel"
                                    value={newPatientPhone}
                                    onChange={(event) =>
                                        setNewPatientPhone(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Phone number"
                                    autoComplete="tel"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                                />

                                <input
                                    type="email"
                                    value={newPatientEmail}
                                    onChange={(event) =>
                                        setNewPatientEmail(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Email address"
                                    autoComplete="email"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* DOCTOR AND DATE */}
                    <div className="mb-5 grid gap-4 md:grid-cols-2">
                        <div>
                            <label
                                htmlFor="appointment-doctor"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Doctor
                            </label>

                            <select
                                id="appointment-doctor"
                                value={selectedDoctorId}
                                onChange={(event) =>
                                    handleDoctorChange(
                                        event.target.value
                                    )
                                }
                                required
                                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                            >
                                <option value="">
                                    Select doctor
                                </option>

                                {doctors.map((doctor) => (
                                    <option
                                        key={doctor.id}
                                        value={doctor.id}
                                    >
                                        {doctor.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="appointment-date"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Date
                            </label>

                            <input
                                id="appointment-date"
                                type="date"
                                value={selectedDate}
                                min={today}
                                max={getMaxBookingDate()}
                                onChange={(event) =>
                                    handleDateChange(
                                        event.target.value
                                    )
                                }
                                required
                                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* AVAILABILITY */}
                    <div className="mb-5">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Available Time
                        </label>

                        {availabilityLoading ? (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                                Loading available slots...
                            </div>
                        ) : availabilityError ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                                {availabilityError}
                            </div>
                        ) : availableSlots.length === 0 ? (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                                No available slots for this date.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {availableSlots.map((slot) => {
                                    const isSelected =
                                        selectedSlot === slot.start;

                                    return (
                                        <button
                                            key={slot.start}
                                            type="button"
                                            onClick={() => {
                                                setSelectedSlot(slot.start);
                                                setError("");
                                            }}
                                            aria-pressed={isSelected}
                                            className={`rounded-lg border px-3 py-3 text-left text-sm ${isSelected
                                                    ? "border-blue-600 bg-blue-50 text-blue-700"
                                                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                                                }`}
                                        >
                                            <div className="font-medium">
                                                {formatSlotTime(
                                                    selectedDate,
                                                    slot.start
                                                )}
                                            </div>

                                            <div className="mt-1 text-xs text-gray-500">
                                                {slot.remaining} of{" "}
                                                {slot.capacity} spots
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* APPOINTMENT TYPE */}
                    <div className="mb-5">
                        <label
                            htmlFor="appointment-type"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Appointment Type
                        </label>

                        <select
                            id="appointment-type"
                            value={appointmentType}
                            onChange={(event) =>
                                setAppointmentType(
                                    event.target.value
                                )
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="Dental Consultation">
                                Dental Consultation
                            </option>
                            <option value="General Checkup">
                                General Checkup
                            </option>
                            <option value="Cleaning">
                                Cleaning
                            </option>
                            <option value="Tooth Extraction">
                                Tooth Extraction
                            </option>
                            <option value="Root Canal">
                                Root Canal
                            </option>
                            <option value="Dental Filling">
                                Dental Filling
                            </option>
                            <option value="Braces Consultation">
                                Braces Consultation
                            </option>
                            <option value="Follow-up">
                                Follow-up
                            </option>
                        </select>
                    </div>

                    {/* NOTES */}
                    <div className="mb-5">
                        <label
                            htmlFor="appointment-notes"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Notes
                        </label>

                        <textarea
                            id="appointment-notes"
                            value={notes}
                            onChange={(event) =>
                                setNotes(event.target.value)
                            }
                            rows={3}
                            placeholder="Additional notes..."
                            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                        />
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                availabilityLoading ||
                                availableSlots.length === 0 ||
                                !selectedDoctorId ||
                                !selectedDate
                            }
                            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading
                                ? "Booking..."
                                : "Book Appointment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
