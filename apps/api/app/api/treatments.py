from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.treatment import (
    PatientTreatment,
    Treatment,
    TreatmentPlan,
)


router = APIRouter(
    prefix="/treatments",
    tags=["Treatments"],
)


# ============================================================
# CONSTANTS
# ============================================================

TREATMENT_STATUSES = [
    "planned",
    "in_progress",
    "completed",
    "cancelled",
    "on_hold",
]

PLAN_STATUSES = [
    "planned",
    "active",
    "completed",
    "cancelled",
]


# ============================================================
# TREATMENT CATALOG SCHEMAS
# ============================================================


class TreatmentCreate(BaseModel):
    organization_id: UUID

    treatment_code: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    name: str = Field(
        min_length=1,
        max_length=255,
    )

    category: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    description: Optional[str] = None

    # Clinic-specific price.
    default_price: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )

    # Clinic-specific duration.
    estimated_duration_minutes: Optional[int] = Field(
        default=None,
        ge=5,
        le=480,
    )

    # Clinic-specific tax percentage.
    tax_percent: Optional[Decimal] = Field(
        default=None,
        ge=0,
        le=100,
    )

    is_active: bool = True


class TreatmentUpdate(BaseModel):
    treatment_code: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    category: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    description: Optional[str] = None

    default_price: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )

    estimated_duration_minutes: Optional[int] = Field(
        default=None,
        ge=5,
        le=480,
    )

    tax_percent: Optional[Decimal] = Field(
        default=None,
        ge=0,
        le=100,
    )

    is_active: Optional[bool] = None


class TreatmentResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    organization_id: UUID
    treatment_code: Optional[str]
    name: str
    category: Optional[str]
    description: Optional[str]
    default_price: Optional[Decimal]
    estimated_duration_minutes: Optional[int]
    tax_percent: Optional[Decimal]
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ============================================================
# TREATMENT PLAN SCHEMAS
# ============================================================


class TreatmentPlanCreate(BaseModel):
    organization_id: UUID
    patient_id: UUID

    doctor_id: Optional[UUID] = None

    name: str = Field(
        min_length=1,
        max_length=255,
    )

    status: str = "planned"

    notes: Optional[str] = None

    estimated_total: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )


class TreatmentPlanUpdate(BaseModel):
    doctor_id: Optional[UUID] = None

    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    status: Optional[str] = None

    notes: Optional[str] = None

    estimated_total: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )


class TreatmentPlanResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    organization_id: UUID
    patient_id: UUID
    doctor_id: Optional[UUID]
    name: str
    status: str
    notes: Optional[str]
    estimated_total: Optional[Decimal]
    created_at: datetime
    updated_at: datetime


# ============================================================
# PATIENT TREATMENT SCHEMAS
# ============================================================


class PatientTreatmentCreate(BaseModel):
    organization_id: UUID
    patient_id: UUID
    treatment_id: UUID

    treatment_plan_id: Optional[UUID] = None
    doctor_id: Optional[UUID] = None

    status: str = "planned"

    # Optional.
    #
    # If omitted, backend automatically takes the current
    # clinic catalog price and stores it as a snapshot.
    price: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )

    notes: Optional[str] = None


class PatientTreatmentUpdate(BaseModel):
    treatment_plan_id: Optional[UUID] = None

    doctor_id: Optional[UUID] = None

    status: Optional[str] = None

    price: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )

    notes: Optional[str] = None


class PatientTreatmentResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    organization_id: UUID
    patient_id: UUID
    treatment_plan_id: Optional[UUID]
    treatment_id: UUID
    doctor_id: Optional[UUID]
    status: str
    price: Optional[Decimal]
    notes: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


# ============================================================
# HELPER FUNCTIONS
# ============================================================


def get_patient_or_404(
    db: Session,
    organization_id: UUID,
    patient_id: UUID,
) -> Patient:
    patient = db.scalar(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.organization_id == organization_id,
        )
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found for this organization",
        )

    return patient


def get_doctor_or_404(
    db: Session,
    organization_id: UUID,
    doctor_id: UUID,
) -> Doctor:
    doctor = db.scalar(
        select(Doctor).where(
            Doctor.id == doctor_id,
            Doctor.organization_id == organization_id,
        )
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found for this organization",
        )

    return doctor


def get_treatment_or_404(
    db: Session,
    organization_id: UUID,
    treatment_id: UUID,
) -> Treatment:
    treatment = db.scalar(
        select(Treatment).where(
            Treatment.id == treatment_id,
            Treatment.organization_id == organization_id,
        )
    )

    if not treatment:
        raise HTTPException(
            status_code=404,
            detail="Treatment not found for this organization",
        )

    return treatment


def get_treatment_plan_or_404(
    db: Session,
    organization_id: UUID,
    plan_id: UUID,
) -> TreatmentPlan:
    plan = db.scalar(
        select(TreatmentPlan).where(
            TreatmentPlan.id == plan_id,
            TreatmentPlan.organization_id == organization_id,
        )
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Treatment plan not found for this organization",
        )

    return plan


# ============================================================
# TREATMENT CATALOG
# ============================================================


@router.post(
    "/catalog",
    response_model=TreatmentResponse,
    status_code=201,
)
def create_treatment(
    treatment_data: TreatmentCreate,
    db: Session = Depends(get_db),
):
    """
    Create a treatment in a clinic's own catalog.

    Example:

    Clinic A:
        Root Canal = ₹7,500

    Clinic B:
        Root Canal = ₹10,000

    Both are independent because organization_id scopes
    the treatment catalog.
    """

    # Optional duplicate-code protection within the clinic.
    if treatment_data.treatment_code:
        existing_code = db.scalar(
            select(Treatment).where(
                Treatment.organization_id
                == treatment_data.organization_id,
                Treatment.treatment_code
                == treatment_data.treatment_code,
            )
        )

        if existing_code:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Treatment code already exists "
                    "for this organization"
                ),
            )

    treatment = Treatment(
        organization_id=treatment_data.organization_id,
        treatment_code=treatment_data.treatment_code,
        name=treatment_data.name.strip(),
        category=(
            treatment_data.category.strip()
            if treatment_data.category
            else None
        ),
        description=treatment_data.description,
        default_price=treatment_data.default_price,
        estimated_duration_minutes=(
            treatment_data.estimated_duration_minutes
        ),
        tax_percent=treatment_data.tax_percent,
        is_active=treatment_data.is_active,
    )

    db.add(treatment)
    db.commit()
    db.refresh(treatment)

    return treatment


@router.get(
    "/catalog",
    response_model=list[TreatmentResponse],
)
def list_treatments(
    organization_id: UUID,
    include_inactive: bool = Query(
        default=False,
    ),
    db: Session = Depends(get_db),
):
    """
    Return only treatments belonging to this clinic.
    """

    query = select(Treatment).where(
        Treatment.organization_id == organization_id,
    )

    if not include_inactive:
        query = query.where(
            Treatment.is_active.is_(True)
        )

    query = query.order_by(
        Treatment.name.asc()
    )

    return list(
        db.scalars(query).all()
    )


@router.get(
    "/catalog/{treatment_id}",
    response_model=TreatmentResponse,
)
def get_treatment(
    treatment_id: UUID,
    organization_id: UUID,
    db: Session = Depends(get_db),
):
    treatment = get_treatment_or_404(
        db=db,
        organization_id=organization_id,
        treatment_id=treatment_id,
    )

    return treatment


@router.patch(
    "/catalog/{treatment_id}",
    response_model=TreatmentResponse,
)
def update_treatment(
    treatment_id: UUID,
    treatment_data: TreatmentUpdate,
    organization_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Update a clinic's treatment configuration.

    This allows the clinic to change:
    - name
    - price
    - duration
    - tax
    - category
    - description
    - active/inactive state
    """

    treatment = get_treatment_or_404(
        db=db,
        organization_id=organization_id,
        treatment_id=treatment_id,
    )

    update_data = treatment_data.model_dump(
        exclude_unset=True,
    )

    if "treatment_code" in update_data:
        new_code = update_data["treatment_code"]

        if new_code:
            existing_code = db.scalar(
                select(Treatment).where(
                    Treatment.organization_id
                    == organization_id,
                    Treatment.treatment_code
                    == new_code,
                    Treatment.id != treatment_id,
                )
            )

            if existing_code:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Treatment code already exists "
                        "for this organization"
                    ),
                )

    if "name" in update_data:
        update_data["name"] = (
            update_data["name"].strip()
        )

    if "category" in update_data:
        update_data["category"] = (
            update_data["category"].strip()
            if update_data["category"]
            else None
        )

    for field, value in update_data.items():
        setattr(
            treatment,
            field,
            value,
        )

    db.commit()
    db.refresh(treatment)

    return treatment


# ============================================================
# TREATMENT PLANS
# ============================================================


@router.post(
    "/plans",
    response_model=TreatmentPlanResponse,
    status_code=201,
)
def create_treatment_plan(
    plan_data: TreatmentPlanCreate,
    db: Session = Depends(get_db),
):
    """
    Create a treatment plan for a patient.
    """

    if plan_data.status not in PLAN_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid plan status. "
                f"Allowed values: {PLAN_STATUSES}"
            ),
        )

    get_patient_or_404(
        db=db,
        organization_id=plan_data.organization_id,
        patient_id=plan_data.patient_id,
    )

    if plan_data.doctor_id:
        get_doctor_or_404(
            db=db,
            organization_id=plan_data.organization_id,
            doctor_id=plan_data.doctor_id,
        )

    plan = TreatmentPlan(
        organization_id=plan_data.organization_id,
        patient_id=plan_data.patient_id,
        doctor_id=plan_data.doctor_id,
        name=plan_data.name.strip(),
        status=plan_data.status,
        notes=plan_data.notes,
        estimated_total=plan_data.estimated_total,
    )

    db.add(plan)
    db.commit()
    db.refresh(plan)

    return plan


@router.get(
    "/plans",
    response_model=list[TreatmentPlanResponse],
)
def list_treatment_plans(
    organization_id: UUID,
    patient_id: Optional[UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = select(TreatmentPlan).where(
        TreatmentPlan.organization_id
        == organization_id
    )

    if patient_id:
        query = query.where(
            TreatmentPlan.patient_id == patient_id
        )

    if status:
        if status not in PLAN_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid plan status. "
                    f"Allowed values: {PLAN_STATUSES}"
                ),
            )

        query = query.where(
            TreatmentPlan.status == status
        )

    query = query.order_by(
        TreatmentPlan.created_at.desc()
    )

    return list(
        db.scalars(query).all()
    )


@router.patch(
    "/plans/{plan_id}",
    response_model=TreatmentPlanResponse,
)
def update_treatment_plan(
    plan_id: UUID,
    plan_data: TreatmentPlanUpdate,
    organization_id: UUID,
    db: Session = Depends(get_db),
):
    plan = get_treatment_plan_or_404(
        db=db,
        organization_id=organization_id,
        plan_id=plan_id,
    )

    update_data = plan_data.model_dump(
        exclude_unset=True,
    )

    if (
        "status" in update_data
        and update_data["status"] not in PLAN_STATUSES
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid plan status. "
                f"Allowed values: {PLAN_STATUSES}"
            ),
        )

    if "doctor_id" in update_data:
        doctor_id = update_data["doctor_id"]

        if doctor_id:
            get_doctor_or_404(
                db=db,
                organization_id=organization_id,
                doctor_id=doctor_id,
            )

    if "name" in update_data:
        update_data["name"] = (
            update_data["name"].strip()
        )

    for field, value in update_data.items():
        setattr(
            plan,
            field,
            value,
        )

    db.commit()
    db.refresh(plan)

    return plan


# ============================================================
# PATIENT TREATMENTS
# ============================================================


@router.post(
    "/patient-treatments",
    response_model=PatientTreatmentResponse,
    status_code=201,
)
def create_patient_treatment(
    treatment_data: PatientTreatmentCreate,
    db: Session = Depends(get_db),
):
    """
    Assign a treatment to a patient.

    If price is not supplied:
    use the clinic's CURRENT catalog price.

    The resulting value is then stored on PatientTreatment
    so future catalog price changes do not affect history.
    """

    if treatment_data.status not in TREATMENT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid treatment status. "
                f"Allowed values: {TREATMENT_STATUSES}"
            ),
        )

    # Validate patient belongs to organization.
    get_patient_or_404(
        db=db,
        organization_id=treatment_data.organization_id,
        patient_id=treatment_data.patient_id,
    )

    # Validate treatment belongs to organization.
    treatment = get_treatment_or_404(
        db=db,
        organization_id=treatment_data.organization_id,
        treatment_id=treatment_data.treatment_id,
    )

    # Validate doctor if supplied.
    if treatment_data.doctor_id:
        get_doctor_or_404(
            db=db,
            organization_id=treatment_data.organization_id,
            doctor_id=treatment_data.doctor_id,
        )

    # Validate plan if supplied.
    if treatment_data.treatment_plan_id:
        plan = get_treatment_plan_or_404(
            db=db,
            organization_id=treatment_data.organization_id,
            plan_id=treatment_data.treatment_plan_id,
        )

        if plan.patient_id != treatment_data.patient_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Treatment plan does not belong "
                    "to this patient"
                ),
            )

    # If no custom patient price was supplied,
    # snapshot the clinic's current catalog price.
    patient_price = treatment_data.price

    if patient_price is None:
        patient_price = treatment.default_price

    now = datetime.utcnow()

    started_at = None
    completed_at = None

    if treatment_data.status == "in_progress":
        started_at = now

    if treatment_data.status == "completed":
        started_at = now
        completed_at = now

    patient_treatment = PatientTreatment(
        organization_id=treatment_data.organization_id,
        patient_id=treatment_data.patient_id,
        treatment_plan_id=treatment_data.treatment_plan_id,
        treatment_id=treatment_data.treatment_id,
        doctor_id=treatment_data.doctor_id,
        status=treatment_data.status,
        price=patient_price,
        notes=treatment_data.notes,
        started_at=started_at,
        completed_at=completed_at,
    )

    db.add(patient_treatment)
    db.commit()
    db.refresh(patient_treatment)

    return patient_treatment


@router.get(
    "/patient-treatments",
    response_model=list[PatientTreatmentResponse],
)
def list_patient_treatments(
    organization_id: UUID,
    patient_id: Optional[UUID] = None,
    treatment_id: Optional[UUID] = None,
    treatment_plan_id: Optional[UUID] = None,
    doctor_id: Optional[UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = select(PatientTreatment).where(
        PatientTreatment.organization_id
        == organization_id
    )

    if patient_id:
        query = query.where(
            PatientTreatment.patient_id
            == patient_id
        )

    if treatment_id:
        query = query.where(
            PatientTreatment.treatment_id
            == treatment_id
        )

    if treatment_plan_id:
        query = query.where(
            PatientTreatment.treatment_plan_id
            == treatment_plan_id
        )

    if doctor_id:
        query = query.where(
            PatientTreatment.doctor_id
            == doctor_id
        )

    if status:
        if status not in TREATMENT_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid treatment status. "
                    f"Allowed values: {TREATMENT_STATUSES}"
                ),
            )

        query = query.where(
            PatientTreatment.status == status
        )

    query = query.order_by(
        PatientTreatment.created_at.desc()
    )

    return list(
        db.scalars(query).all()
    )


@router.patch(
    "/patient-treatments/{patient_treatment_id}",
    response_model=PatientTreatmentResponse,
)
def update_patient_treatment(
    patient_treatment_id: UUID,
    treatment_data: PatientTreatmentUpdate,
    organization_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Update an actual patient treatment.

    Automatically records:
        planned -> in_progress
            started_at

        in_progress -> completed
            completed_at
    """

    patient_treatment = db.scalar(
        select(PatientTreatment).where(
            PatientTreatment.id
            == patient_treatment_id,
            PatientTreatment.organization_id
            == organization_id,
        )
    )

    if not patient_treatment:
        raise HTTPException(
            status_code=404,
            detail="Patient treatment not found",
        )

    update_data = treatment_data.model_dump(
        exclude_unset=True,
    )

    if "status" in update_data:
        new_status = update_data["status"]

        if new_status not in TREATMENT_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid treatment status. "
                    f"Allowed values: {TREATMENT_STATUSES}"
                ),
            )

    # Validate treatment plan if being changed.
    if "treatment_plan_id" in update_data:
        plan_id = update_data["treatment_plan_id"]

        if plan_id:
            plan = get_treatment_plan_or_404(
                db=db,
                organization_id=organization_id,
                plan_id=plan_id,
            )

            if (
                plan.patient_id
                != patient_treatment.patient_id
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Treatment plan does not belong "
                        "to this patient"
                    ),
                )

    # Validate doctor if being changed.
    if "doctor_id" in update_data:
        doctor_id = update_data["doctor_id"]

        if doctor_id:
            get_doctor_or_404(
                db=db,
                organization_id=organization_id,
                doctor_id=doctor_id,
            )

    now = datetime.utcnow()

    if "status" in update_data:
        new_status = update_data["status"]

        if (
            new_status == "in_progress"
            and patient_treatment.started_at is None
        ):
            patient_treatment.started_at = now

        if (
            new_status == "completed"
            and patient_treatment.completed_at is None
        ):
            if patient_treatment.started_at is None:
                patient_treatment.started_at = now

            patient_treatment.completed_at = now

    for field, value in update_data.items():
        setattr(
            patient_treatment,
            field,
            value,
        )

    db.commit()
    db.refresh(patient_treatment)

    return patient_treatment