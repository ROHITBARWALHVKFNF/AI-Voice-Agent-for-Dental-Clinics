from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.organization import Organization
from app.models.user import User


router = APIRouter(
    prefix="/organizations",
    tags=["Organizations"],
)


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    country: str
    timezone: str
    currency: str
    description: str | None


class OrganizationConfigResponse(BaseModel):
    organization_id: UUID
    country: str
    currency: str
    timezone: str
    phone_country_code: str
    languages: list[str]
    tax_name: str
    tax_percent: float


COUNTRY_CONFIG = {
    "IN": {
        "phone_country_code": "+91",
        "languages": [
            "en-IN",
            "hi-IN",
            "mr-IN",
        ],
        "tax_name": "GST",
        "tax_percent": 18,
    },
    "US": {
        "phone_country_code": "+1",
        "languages": [
            "en-US",
        ],
        "tax_name": "Sales Tax",
        "tax_percent": 0,
    },
    "GB": {
        "phone_country_code": "+44",
        "languages": [
            "en-GB",
        ],
        "tax_name": "VAT",
        "tax_percent": 20,
    },
    "AE": {
        "phone_country_code": "+971",
        "languages": [
            "en-AE",
            "ar-AE",
        ],
        "tax_name": "VAT",
        "tax_percent": 5,
    },
}


@router.get(
    "/me",
    response_model=OrganizationResponse,
)
def get_my_organization(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    organization = (
        db.query(Organization)
        .filter(
            Organization.id
            == current_user.organization_id
        )
        .first()
    )

    if not organization:
        raise HTTPException(
            status_code=404,
            detail="Organization not found.",
        )

    return organization


@router.get(
    "/me/config",
    response_model=OrganizationConfigResponse,
)
def get_my_organization_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    organization = (
        db.query(Organization)
        .filter(
            Organization.id
            == current_user.organization_id
        )
        .first()
    )

    if not organization:
        raise HTTPException(
            status_code=404,
            detail="Organization not found.",
        )

    country_config = COUNTRY_CONFIG.get(
        organization.country,
        {
            "phone_country_code": "",
            "languages": ["en"],
            "tax_name": "",
            "tax_percent": 0,
        },
    )

    return OrganizationConfigResponse(
        organization_id=organization.id,
        country=organization.country,
        currency=organization.currency,
        timezone=organization.timezone,
        phone_country_code=country_config[
            "phone_country_code"
        ],
        languages=country_config[
            "languages"
        ],
        tax_name=country_config[
            "tax_name"
        ],
        tax_percent=country_config[
            "tax_percent"
        ],
    )


@router.get("/me/user")
def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    organization = (
        db.query(Organization)
        .filter(
            Organization.id == current_user.organization_id
        )
        .first()
    )

    if not organization:
        raise HTTPException(
            status_code=404,
            detail="Organization not found.",
        )

    return {
        "user": {
            "id": current_user.id,
            "organization_id": current_user.organization_id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role,
            "is_active": current_user.is_active,
        },
        "organization": {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
            "country": organization.country,
            "timezone": organization.timezone,
            "currency": organization.currency,
            "description": organization.description,
        },
    }