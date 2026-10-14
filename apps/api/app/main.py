from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.organizations import router as organizations_router

from app.api.appointments import router as appointments_router
from app.api.availability import router as availability_router
from app.api.clinic_hours import router as clinic_hours_router
from app.api.doctor_schedules import router as doctor_schedules_router
from app.api.doctor_schedule_overrides import (
    router as doctor_schedule_overrides_router,
)
from app.api.schedule_overrides import router as schedule_overrides_router
from app.api.doctors import router as doctors_router
from app.api.patients import router as patients_router
from app.api.follow_ups import router as follow_ups_router
from app.api.treatments import router as treatments_router
from app.api.doctor_schedule_break import (
    router as doctor_schedule_breaks_router,
)
from app.api import doctor_slot_capacities
from app.api.receptionist import router as receptionist_router


app = FastAPI(
    title="Dental AI Platform API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(organizations_router)

app.include_router(appointments_router)
app.include_router(availability_router)

app.include_router(clinic_hours_router)

app.include_router(doctor_schedules_router)
app.include_router(doctor_schedule_overrides_router)

app.include_router(schedule_overrides_router)

app.include_router(doctors_router)
app.include_router(patients_router)

app.include_router(follow_ups_router)
app.include_router(treatments_router)

app.include_router(doctor_schedule_breaks_router)
app.include_router(doctor_slot_capacities.router)

app.include_router(receptionist_router)

@app.get("/")
def root():
    return {
        "message": "Dental AI Platform API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }