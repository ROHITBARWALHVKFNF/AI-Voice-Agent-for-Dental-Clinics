from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.db.database import get_db
from app.models.doctor import Doctor
from app.models.organization import Organization
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


class SignupRequest(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=255,
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    clinic_name: str = Field(
        min_length=2,
        max_length=255,
    )

    country: str = Field(
        min_length=2,
        max_length=2,
    )

    description: str | None = None

    plan_slug: str = Field(
        min_length=2,
        max_length=50,
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: UUID
    organization_id: UUID
    role: str


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def signup(
    payload: SignupRequest,
    db: Session = Depends(get_db),
):
    email = payload.email.lower().strip()
    country = payload.country.upper().strip()
    plan_slug = payload.plan_slug.lower().strip()

    # ---------------------------------------------------------
    # 1. Validate country
    # ---------------------------------------------------------

    if len(country) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Country must be a 2-letter country code.",
        )

    # ---------------------------------------------------------
    # 2. Validate selected plan
    # ---------------------------------------------------------

    plan = (
        db.query(Plan)
        .filter(
            Plan.slug == plan_slug,
            Plan.is_active.is_(True),
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected plan is not available.",
        )

    # ---------------------------------------------------------
    # 3. Check existing user
    # ---------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # ---------------------------------------------------------
    # 4. Generate unique organization slug
    # ---------------------------------------------------------

    slug_base = payload.clinic_name.lower().strip()

    slug = "".join(
        character
        if character.isalnum()
        else "-"
        for character in slug_base
    )

    slug = "-".join(
        part
        for part in slug.split("-")
        if part
    )

    if not slug:
        slug = "dental-clinic"

    original_slug = slug
    counter = 1

    while (
        db.query(Organization)
        .filter(Organization.slug == slug)
        .first()
        is not None
    ):
        counter += 1
        slug = f"{original_slug}-{counter}"

    # ---------------------------------------------------------
    # 5. Country defaults
    # ---------------------------------------------------------

    country_defaults = {
        "IN": {
            "timezone": "Asia/Kolkata",
            "currency": "INR",
        },
        "US": {
            "timezone": "America/New_York",
            "currency": "USD",
        },
        "GB": {
            "timezone": "Europe/London",
            "currency": "GBP",
        },
        "AE": {
            "timezone": "Asia/Dubai",
            "currency": "AED",
        },
    }

    defaults = country_defaults.get(
        country,
        {
            "timezone": "UTC",
            "currency": "USD",
        },
    )

    # ---------------------------------------------------------
    # 6. Create organization
    # ---------------------------------------------------------

    organization = Organization(
        name=payload.clinic_name.strip(),
        slug=slug,
        country=country,
        timezone=defaults["timezone"],
        currency=defaults["currency"],
        description=payload.description,
    )

    db.add(organization)
    db.flush()

    # ---------------------------------------------------------
    # 7. Create owner user
    # ---------------------------------------------------------

    user = User(
        organization_id=organization.id,
        email=email,
        full_name=payload.full_name.strip(),
        role="owner",
        password_hash=hash_password(
            payload.password
        ),
        is_active=True,
    )

    db.add(user)
    db.flush()

    # ---------------------------------------------------------
    # 8. Create owner's doctor profile
    # ---------------------------------------------------------

    doctor = Doctor(
        organization_id=organization.id,
        user_id=user.id,
        full_name=payload.full_name.strip(),
        email=email,
        is_active=True,
    )

    db.add(doctor)
    db.flush()

    # ---------------------------------------------------------
    # 9. Create 3-day trial subscription
    # ---------------------------------------------------------

    trial_started_at = datetime.now(timezone.utc)
    trial_ends_at = trial_started_at + timedelta(days=3)

    subscription = Subscription(
        organization_id=organization.id,
        plan_id=plan.id,
        status="trialing",
        trial_started_at=trial_started_at,
        trial_ends_at=trial_ends_at,
    )

    db.add(subscription)

    # ---------------------------------------------------------
    # 10. Commit everything together
    # ---------------------------------------------------------

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create the account. Please try again.",
        )

    # ---------------------------------------------------------
    # 11. Refresh database objects
    # ---------------------------------------------------------

    db.refresh(user)
    db.refresh(organization)
    db.refresh(doctor)
    db.refresh(subscription)

    # ---------------------------------------------------------
    # 12. Create JWT
    # ---------------------------------------------------------

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "organization_id": str(
                organization.id
            ),
            "role": user.role,
        }
    )

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        organization_id=organization.id,
        role=user.role,
    )


@router.post(
    "/login",
    response_model=AuthResponse,
)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    email = payload.email.lower().strip()

    user = (
        db.query(User)
        .filter(
            User.email == email,
            User.is_active.is_(True),
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account does not have a password configured.",
        )

    if not verify_password(
        payload.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "organization_id": str(
                user.organization_id
            ),
            "role": user.role,
        }
    )

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        organization_id=user.organization_id,
        role=user.role,
    )