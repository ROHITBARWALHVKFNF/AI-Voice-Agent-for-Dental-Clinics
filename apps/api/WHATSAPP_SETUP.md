# WhatsApp notifications - setup

## What it does
- **Clinic owner** gets a WhatsApp message when an appointment is booked, cancelled or rescheduled.
- **Patient** gets a confirmation, then reminders 24 hours and 2 hours before, plus cancel/reschedule notices.
- Works with no changes to `appointments.py`. A listener queues messages in the new
  `notification_outbox` table; a background worker sends them.
- Until WhatsApp is connected it runs in **dry-run mode**: messages are only printed in the
  backend window (look for `[WhatsApp DRY RUN]`).

## 1. Add to `apps/api/.env`
```
OWNER_WHATSAPP_NUMBER=919876543210
WHATSAPP_ENABLED=false
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TEMPLATE_LANGUAGE=en
```
`OWNER_WHATSAPP_NUMBER` = your number, digits only, with country code (91 for India).

## 2. Test in dry-run mode
1. Restart the backend. It creates the `notification_outbox` table by itself.
2. Book an appointment for a patient who has a valid mobile number.
3. Within about 15 seconds the backend window prints the owner and patient messages.
4. See all messages at http://127.0.0.1:8000/docs -> `GET /notifications`
   (and `GET /notifications/status` shows whether you are in dry_run or live mode).

Patients whose phone number is not a valid mobile number (like `123546206`) get no WhatsApp messages;
the owner alert is still sent.

## 3. Go live (WhatsApp Business Cloud API)
1. Create an app at developers.facebook.com, add the **WhatsApp** product, and note the
   **Phone number ID** and an **access token**. (As far as I know the quick-start token expires
   after 24 hours; for real use create a permanent System User token. The test number can only
   message numbers you have added as recipients. Check Meta's current docs.)
2. In WhatsApp Manager -> Message templates, create these templates (category **Utility**,
   language **English**) with exactly this text and the same `{{n}}` variables:

| Template name | Text |
|---|---|
| `owner_new_booking` | New appointment booked: {{1}} with {{2}} on {{3}} at {{4}}. Type: {{5}}. Open the dashboard for details. |
| `owner_appointment_cancelled` | Appointment cancelled: {{1}} with {{2}} on {{3}} at {{4}}. The slot is free again. |
| `owner_appointment_rescheduled` | Appointment rescheduled: {{1}} with {{2}} is now on {{3}} at {{4}}. |
| `patient_appointment_confirmation` | Hello {{1}}, your appointment at {{2}} with {{3}} is confirmed for {{4}} at {{5}}. Please call the clinic if you need to change it. |
| `patient_appointment_reminder` | Hello {{1}}, this is a reminder of your appointment at {{2}} with {{3}} on {{4}} at {{5}}. We look forward to seeing you. |
| `patient_appointment_cancelled` | Hello {{1}}, your appointment at {{2}} on {{3}} at {{4}} has been cancelled. Please contact the clinic to book a new time. |
| `patient_appointment_rescheduled` | Hello {{1}}, your appointment at {{2}} with {{3}} has been moved to {{4}} at {{5}}. Please contact the clinic if this time does not suit you. |

3. Wait until all show **Approved**, then set in `.env`:
```
WHATSAPP_ENABLED=true
WHATSAPP_ACCESS_TOKEN=your-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
```
4. Restart the backend. `GET /notifications/status` should now say `"mode": "live"`.
5. If a message fails, `GET /notifications?status=failed` shows the reason, and
   `POST /notifications/{id}/retry` sends it again. Failed sends retry automatically 3 times.

## Notes
- Keep `.env` out of git.
- Only message patients who agreed to receive WhatsApp messages (add a consent checkbox to patient
  registration before real use). Messages never include treatment details.
- Set `echo=False` in `app/db/database.py` to stop SQL being printed on every poll.
- The table is created automatically on startup. If you later want it in Alembic, run
  `alembic revision --autogenerate -m "notification outbox"` and review it.
