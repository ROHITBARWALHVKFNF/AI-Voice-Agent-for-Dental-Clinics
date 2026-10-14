
import calendar
from datetime import date, datetime, time, timedelta
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.clinic_hours import ClinicHours
from app.models.clinic_schedule_override import ClinicScheduleOverride
from app.models.doctor_schedule import DoctorSchedule
from app.models.doctor_schedule_break import DoctorScheduleBreak
from app.models.doctor_schedule_override import DoctorScheduleOverride
from app.models.doctor_slot_capacity import DoctorSlotCapacity


CLINIC_TIMEZONE = ZoneInfo("Asia/Kolkata")
SLOT_DURATION_MINUTES = 30

# These statuses do not consume appointment capacity.
NON_BLOCKING_STATUSES = {
    "cancelled",
    "completed",
    "no_show",
}


def add_months(source_date: date, months: int) -> date:
    """Add calendar months without exceeding the target month's last day."""
    month_index = source_date.month - 1 + months
    year = source_date.year + month_index // 12
    month = month_index % 12 + 1

    day = min(
        source_date.day,
        calendar.monthrange(year, month)[1],
    )

    return date(year, month, day)


class AvailabilityService:
    """Availability rules for fixed 30-minute appointment slots."""

    @staticmethod
    def _failure(
        reason: str,
        slot_capacity: int = 1,
    ) -> dict[str, Any]:
        return {
            "is_available": False,
            "reason": reason,
            "slot_capacity": slot_capacity,
            "slots": [],
        }

    @staticmethod
    def _local_datetime(value: datetime) -> datetime:
        """Interpret naive database datetimes in clinic time."""
        if value.tzinfo is None:
            return value.replace(tzinfo=CLINIC_TIMEZONE)

        return value.astimezone(CLINIC_TIMEZONE)

    @staticmethod
    def get_clinic_hours(
        db: Session,
        organization_id: UUID,
        requested_date: date,
    ) -> dict[str, Any]:
        """Get date-specific clinic hours or fall back to weekly hours."""
        override = db.scalar(
            select(ClinicScheduleOverride).where(
                ClinicScheduleOverride.organization_id == organization_id,
                ClinicScheduleOverride.override_date == requested_date,
            )
        )

        if override is not None:
            if override.is_closed:
                return {
                    "is_open": False,
                    "open_time": None,
                    "close_time": None,
                    "source": "override",
                    "reason": override.reason or "Clinic is closed",
                    "notes": override.notes,
                }

            if (
                override.open_time is None
                or override.close_time is None
                or override.open_time >= override.close_time
            ):
                return {
                    "is_open": False,
                    "open_time": None,
                    "close_time": None,
                    "source": "override",
                    "reason": "Invalid clinic override hours",
                    "notes": override.notes,
                }

            return {
                "is_open": True,
                "open_time": override.open_time,
                "close_time": override.close_time,
                "source": "override",
                "reason": override.reason,
                "notes": override.notes,
            }

        weekly = db.scalar(
            select(ClinicHours).where(
                ClinicHours.organization_id == organization_id,
                ClinicHours.day_of_week == requested_date.weekday(),
            )
        )

        if weekly is None or not weekly.is_open:
            return {
                "is_open": False,
                "open_time": None,
                "close_time": None,
                "source": "regular_schedule",
                "reason": "Clinic is closed or has no configured hours",
                "notes": None,
            }

        if (
            weekly.open_time is None
            or weekly.close_time is None
            or weekly.open_time >= weekly.close_time
        ):
            return {
                "is_open": False,
                "open_time": None,
                "close_time": None,
                "source": "regular_schedule",
                "reason": "Clinic hours are incomplete or invalid",
                "notes": None,
            }

        return {
            "is_open": True,
            "open_time": weekly.open_time,
            "close_time": weekly.close_time,
            "source": "regular_schedule",
            "reason": None,
            "notes": None,
        }

    @staticmethod
    def get_doctor_hours(
        db: Session,
        doctor_id: UUID,
        requested_date: date,
    ) -> dict[str, Any]:
        """Get date-specific doctor hours or fall back to weekly hours."""
        override = db.scalar(
            select(DoctorScheduleOverride).where(
                DoctorScheduleOverride.doctor_id == doctor_id,
                DoctorScheduleOverride.override_date == requested_date,
            )
        )

        if override is not None:
            if not override.is_working:
                return {
                    "is_working": False,
                    "start_time": None,
                    "end_time": None,
                    "reason": override.reason or "Doctor is off",
                    "source": "override",
                }

            if (
                override.start_time is None
                or override.end_time is None
                or override.start_time >= override.end_time
            ):
                return {
                    "is_working": False,
                    "start_time": None,
                    "end_time": None,
                    "reason": "Invalid doctor override hours",
                    "source": "override",
                }

            return {
                "is_working": True,
                "start_time": override.start_time,
                "end_time": override.end_time,
                "reason": None,
                "source": "override",
            }

        weekly = db.scalar(
            select(DoctorSchedule).where(
                DoctorSchedule.doctor_id == doctor_id,
                DoctorSchedule.day_of_week == requested_date.weekday(),
            )
        )

        if weekly is None or not weekly.is_working:
            return {
                "is_working": False,
                "start_time": None,
                "end_time": None,
                "reason": "Doctor is off or has no configured schedule",
                "source": "regular_schedule",
            }

        if (
            weekly.start_time is None
            or weekly.end_time is None
            or weekly.start_time >= weekly.end_time
        ):
            return {
                "is_working": False,
                "start_time": None,
                "end_time": None,
                "reason": "Invalid doctor working hours",
                "source": "regular_schedule",
            }

        return {
            "is_working": True,
            "start_time": weekly.start_time,
            "end_time": weekly.end_time,
            "reason": None,
            "source": "regular_schedule",
        }

    @staticmethod
    def get_available_slots(
        db: Session,
        doctor_id: UUID,
        requested_date: date,
        slot_duration_minutes: int = SLOT_DURATION_MINUTES,
    ) -> dict[str, Any]:
        """
        Generate 30-minute slots.

        Each slot uses its saved DoctorSlotCapacity.capacity value when one
        exists. Otherwise, it uses DoctorSchedule.slot_capacity as fallback.
        A custom capacity of zero disables that slot.
        """
        if slot_duration_minutes != SLOT_DURATION_MINUTES:
            return AvailabilityService._failure(
                "Appointment slots must be exactly 30 minutes"
            )

        now = datetime.now(CLINIC_TIMEZONE)
        today = now.date()
        max_booking_date = add_months(today, 3)

        if requested_date < today:
            return AvailabilityService._failure(
                "Appointments cannot be booked for a past date"
            )

        if requested_date > max_booking_date:
            return AvailabilityService._failure(
                "Appointments can only be booked up to "
                f"{max_booking_date.isoformat()} "
                "(3 months in advance)"
            )

        # Find the doctor's recurring weekly schedule.
        weekly = db.scalar(
            select(DoctorSchedule).where(
                DoctorSchedule.doctor_id == doctor_id,
                DoctorSchedule.day_of_week == requested_date.weekday(),
            )
        )

        # Find a date-specific override, if present.
        override = db.scalar(
            select(DoctorScheduleOverride).where(
                DoctorScheduleOverride.doctor_id == doctor_id,
                DoctorScheduleOverride.override_date == requested_date,
            )
        )

        if weekly is None and override is None:
            return AvailabilityService._failure(
                "No doctor schedule configured"
            )

        organization_id = (
            weekly.organization_id
            if weekly is not None
            else override.organization_id
        )

        if (
            override is not None
            and override.organization_id != organization_id
        ):
            return AvailabilityService._failure(
                "Inconsistent doctor schedule organization"
            )

        doctor_hours = AvailabilityService.get_doctor_hours(
            db,
            doctor_id,
            requested_date,
        )

        if not doctor_hours["is_working"]:
            return AvailabilityService._failure(
                doctor_hours["reason"] or "Doctor is unavailable"
            )

        clinic_hours = AvailabilityService.get_clinic_hours(
            db,
            organization_id,
            requested_date,
        )

        if not clinic_hours["is_open"]:
            return AvailabilityService._failure(
                clinic_hours["reason"] or "Clinic is closed"
            )

        # Fallback capacity applies only when a custom slot value
        # has not been saved for that weekday and start time.
        default_capacity = (
            weekly.slot_capacity
            if weekly is not None
            else 1
        )

        if default_capacity is None or default_capacity < 1:
            return AvailabilityService._failure(
                "Default slot capacity must be at least one"
            )

        start_time = max(
            doctor_hours["start_time"],
            clinic_hours["open_time"],
        )
        end_time = min(
            doctor_hours["end_time"],
            clinic_hours["close_time"],
        )

        if start_time >= end_time:
            return AvailabilityService._failure(
                "Doctor has no working time during clinic hours",
                default_capacity,
            )

        # Load recurring breaks for this doctor and weekday.
        breaks = db.scalars(
            select(DoctorScheduleBreak).where(
                DoctorScheduleBreak.organization_id == organization_id,
                DoctorScheduleBreak.doctor_id == doctor_id,
                DoctorScheduleBreak.day_of_week == requested_date.weekday(),
            )
        ).all()

        # Load saved capacity overrides for individual 30-minute slots.
        capacity_rows = db.scalars(
            select(DoctorSlotCapacity).where(
                DoctorSlotCapacity.organization_id == organization_id,
                DoctorSlotCapacity.doctor_id == doctor_id,
                DoctorSlotCapacity.day_of_week == requested_date.weekday(),
            )
        ).all()

        capacity_by_start = {
            row.slot_start.replace(tzinfo=None): row.capacity
            for row in capacity_rows
        }

        working_start = datetime.combine(
            requested_date,
            start_time,
            tzinfo=CLINIC_TIMEZONE,
        )
        working_end = datetime.combine(
            requested_date,
            end_time,
            tzinfo=CLINIC_TIMEZONE,
        )

        # Load appointments for this doctor and organization.
        appointments = db.scalars(
            select(Appointment).where(
                Appointment.organization_id == organization_id,
                Appointment.doctor_id == doctor_id,
            )
        ).all()

        blocking_intervals = []

        for appointment in appointments:
            status = (appointment.status or "").strip().lower()

            if status in NON_BLOCKING_STATUSES:
                continue

            start = AvailabilityService._local_datetime(
                appointment.start_time
            )
            end = AvailabilityService._local_datetime(
                appointment.end_time
            )

            if end <= start:
                continue

            # Keep appointments that overlap the working window.
            if start < working_end and end > working_start:
                blocking_intervals.append((start, end))

        slots = []
        duration = timedelta(minutes=SLOT_DURATION_MINUTES)
        current = working_start

        while current + duration <= working_end:
            slot_end = current + duration

            slot_start_time = current.time().replace(tzinfo=None)
            slot_end_time = slot_end.time().replace(tzinfo=None)

            # A saved per-slot value takes precedence over the default.
            # Capacity zero intentionally disables the slot.
            slot_capacity = capacity_by_start.get(
                slot_start_time,
                default_capacity,
            )

            overlaps_break = any(
                slot_start_time < item.end_time
                and slot_end_time > item.start_time
                for item in breaks
            )

            # Count appointments overlapping this 30-minute slot.
            booked = sum(
                1
                for appointment_start, appointment_end in blocking_intervals
                if (
                    appointment_start < slot_end
                    and appointment_end > current
                )
            )

            is_past_slot = (
                requested_date == today
                and current <= now
            )

            available = (
                not overlaps_break
                and not is_past_slot
                and slot_capacity > 0
                and booked < slot_capacity
            )

            if overlaps_break:
                reason = "Recurring break"
            elif is_past_slot:
                reason = "Time has passed"
            elif slot_capacity == 0:
                reason = "Slot disabled"
            elif booked >= slot_capacity:
                reason = "Slot is full"
            else:
                reason = None

            slots.append(
                {
                    "start": current.strftime("%H:%M"),
                    "end": slot_end.strftime("%H:%M"),
                    "available": available,
                    "capacity": slot_capacity,
                    "booked": booked,
                    "remaining": max(slot_capacity - booked, 0),
                    "reason": reason,
                }
            )

            current = slot_end

        has_available_slots = any(
            slot["available"] for slot in slots
        )

        return {
            "is_available": has_available_slots,
            "reason": (
                None
                if has_available_slots
                else "No available slots for this date"
            ),
            "slot_capacity": default_capacity,
            "slots": slots,
        }
