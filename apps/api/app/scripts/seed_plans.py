from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.plan import Plan


PLANS = [
    {
        "name": "Starter",
        "slug": "starter",
        "description": "Essential tools for a small dental clinic.",
        "max_doctors": 1,
        "max_staff": 2,
        "included_voice_minutes": 300,
        "included_whatsapp_messages": 500,
        "crm_level": "basic",
        "automation_level": "basic",
        "analytics_level": "basic",
        "features": {
            "appointments": True,
            "patient_crm": True,
            "doctor_management": True,
            "reminders": True,
            "voice_ai": True,
            "whatsapp": True,
            "follow_ups": False,
            "recalls": False,
            "missed_call_recovery": False,
            "patient_reactivation": False,
            "advanced_analytics": False,
            "campaigns": False,
            "api_access": False,
            "multi_location": False,
        },
        "is_active": True,
    },
    {
        "name": "Growth",
        "slug": "growth",
        "description": "Advanced automation for growing dental clinics.",
        "max_doctors": 3,
        "max_staff": 5,
        "included_voice_minutes": 1000,
        "included_whatsapp_messages": 2000,
        "crm_level": "advanced",
        "automation_level": "advanced",
        "analytics_level": "basic",
        "features": {
            "appointments": True,
            "patient_crm": True,
            "doctor_management": True,
            "reminders": True,
            "voice_ai": True,
            "whatsapp": True,
            "follow_ups": True,
            "recalls": True,
            "missed_call_recovery": True,
            "patient_reactivation": True,
            "advanced_analytics": False,
            "campaigns": True,
            "api_access": False,
            "multi_location": False,
        },
        "is_active": True,
    },
    {
        "name": "Pro",
        "slug": "pro",
        "description": "Advanced AI operations and automation for established clinics.",
        "max_doctors": 10,
        "max_staff": 15,
        "included_voice_minutes": 3000,
        "included_whatsapp_messages": 5000,
        "crm_level": "advanced",
        "automation_level": "advanced",
        "analytics_level": "advanced",
        "features": {
            "appointments": True,
            "patient_crm": True,
            "doctor_management": True,
            "reminders": True,
            "voice_ai": True,
            "whatsapp": True,
            "follow_ups": True,
            "recalls": True,
            "missed_call_recovery": True,
            "patient_reactivation": True,
            "advanced_analytics": True,
            "campaigns": True,
            "api_access": True,
            "multi_location": False,
        },
        "is_active": True,
    },
    {
        "name": "Enterprise",
        "slug": "enterprise",
        "description": "Custom AI infrastructure and multi-location capabilities.",
        "max_doctors": 999,
        "max_staff": 999,
        "included_voice_minutes": 999999,
        "included_whatsapp_messages": 999999,
        "crm_level": "advanced",
        "automation_level": "advanced",
        "analytics_level": "advanced",
        "features": {
            "appointments": True,
            "patient_crm": True,
            "doctor_management": True,
            "reminders": True,
            "voice_ai": True,
            "whatsapp": True,
            "follow_ups": True,
            "recalls": True,
            "missed_call_recovery": True,
            "patient_reactivation": True,
            "advanced_analytics": True,
            "campaigns": True,
            "api_access": True,
            "multi_location": True,
            "custom_workflows": True,
            "priority_support": True,
        },
        "is_active": True,
    },
]


def seed_plans():
    db = SessionLocal()

    try:
        for plan_data in PLANS:
            existing_plan = db.scalar(
                select(Plan).where(
                    Plan.slug == plan_data["slug"]
                )
            )

            if existing_plan:
                print(f"Already exists: {plan_data['slug']}")
                continue

            plan = Plan(**plan_data)
            db.add(plan)

            print(f"Created: {plan_data['slug']}")

        db.commit()
        print("\nPlan seeding completed.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_plans()