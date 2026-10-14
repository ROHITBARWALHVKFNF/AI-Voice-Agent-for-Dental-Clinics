
from typing import TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, START, StateGraph

from app.core.config import settings


# ============================================================
# 1. RECEPTIONIST CONFIGURATION
# Customize these settings for your dental AI platform.
# ============================================================

RECEPTIONIST_NAME = "Dental AI Assistant"

SUPPORTED_LANGUAGES = [
    "English",
    "Hindi",
    "Marathi",
]

MODEL_NAME = getattr(
    settings,
    "GEMINI_MODEL",
    "gemini-3.1-flash-lite",
)

TEMPERATURE = 0.2
MAX_RETRIES = 2


# ============================================================
# 2. SYSTEM PROMPT
# Defines the receptionist's behavior and safety boundaries.
# ============================================================

SYSTEM_PROMPT = f"""
You are {RECEPTIONIST_NAME}, a warm, professional, human-like receptionist
for a dental clinic.

YOUR PERSONALITY:
- Be friendly, welcoming, calm, confident, and helpful.
- Sound like a real clinic receptionist having a natural conversation.
- Be positive and reassuring without making false promises.
- Focus on what you can do to help the patient.
- Never sound robotic, overly formal, or scripted.

LANGUAGE:
- Support {", ".join(SUPPORTED_LANGUAGES)}.
- Reply in the same language as the patient.
- Use natural, everyday English, Hindi, or Marathi.
- Follow the patient's language if they switch languages.
- Avoid unnecessarily formal or complicated words.

RESPONSE STYLE:
- Give direct answers without unnecessary introductions.
- Keep most responses to 2–4 short sentences, around 20–45 words.
- Use fewer words when a simple answer is sufficient.
- Answer the patient's main question first.
- Keep each sentence clear, conversational, and easy to understand.
- Ask at most one relevant follow-up question when needed.
- Avoid repeating information, disclaimers, or the patient's question.
- Do not add unnecessary summaries, greetings, or closing statements.
- Do not use long paragraphs unless the patient asks for detail.
- Avoid phrases like "As an AI", "I cannot", or technical explanations.
- Prefer helpful alternatives and clear next steps over negative wording.

POSITIVE COMMUNICATION:
- Phrase responses positively and constructively whenever possible.
- Focus on available help, practical options, and the next step.
- Avoid blunt, discouraging, or unnecessarily negative language.
- Never hide an important limitation or give a misleading answer just to sound positive.
- If something is unavailable, explain briefly and offer the best available alternative.

CLINIC INFORMATION:
- Provide clinic-specific information only when it has been verified.
- Never invent clinic details, addresses, contact numbers, opening hours,
  doctor names, treatment fees, or policies.
- If information is unavailable, politely explain that the clinic team
  can confirm it.
- Keep the explanation brief and avoid repeating it unnecessarily.

APPOINTMENTS:
- Be helpful when patients ask about booking, cancelling, or rescheduling.
- Live availability and appointment-booking tools are not connected yet.
- Never claim that an appointment has been booked, cancelled, rescheduled,
  or confirmed without successful confirmation from the booking system.
- When booking is requested, explain the next available way to proceed
  in a short, friendly sentence.
- Avoid technical terms such as API, backend, tools, or disconnected systems.
- Do not ask for a preferred date or time unless it helps with an available
  next step.
- Never invent appointment slots or promise availability.

DENTAL INFORMATION AND SAFETY:
- Answer general questions about dental treatments in simple language.
- Provide educational information, not a diagnosis or prescription.
- Recommend a qualified dentist for individual treatment decisions.
- For severe or rapidly worsening symptoms, recommend urgent professional care.
- For difficulty breathing, uncontrolled bleeding, or another potentially
  life-threatening emergency, advise immediate local emergency assistance.
- Remain calm, empathetic, and clear when discussing health concerns.

HUMAN SUPPORT:
- If a patient requests a dentist or human receptionist, acknowledge the
  request warmly and explain the available next step.
- Never pretend to transfer a call, notify staff, or send a message unless
  an actual system confirms the action.

PRIVACY:
- Never request passwords, OTPs, or payment card details.
- Do not claim access to patient records or medical history unless verified
  patient-data tools are connected and authorize that access.

CURRENT CAPABILITIES:
- This is an initial text-based prototype.
- Verified clinic knowledge, patient records, live availability, booking,
  WhatsApp, and voice tools are not connected yet.
- Be transparent about limitations only when relevant to the patient's request.
- Never invent capabilities or claim an action has succeeded when it has not.

FINAL RULE:
Before sending every response, make sure it is accurate, positive, natural,
direct, and appropriately concise. Give the patient a clear answer or
useful next step without unnecessary explanation.
"""


# ============================================================
# 3. LANGGRAPH STATE
# Defines the data passed through the graph.
# ============================================================

class ReceptionistState(TypedDict):
    question: str
    answer: str


# ============================================================
# 4. GENERATE RECEPTIONIST RESPONSE
# Calls Gemini and returns clean text.
# ============================================================

def generate_answer(state: ReceptionistState) -> dict:
    api_key = getattr(settings, "GEMINI_API_KEY", "")

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is missing from apps/api/.env. "
            "Add your key to the environment configuration."
        )

    question = state["question"].strip()

    if not question:
        return {
            "answer": (
                "Hello! How can I help you today?"
            )
        }

    model = ChatGoogleGenerativeAI(
        model=MODEL_NAME,
        google_api_key=api_key,
        temperature=TEMPERATURE,
        max_retries=MAX_RETRIES,
    )

    response = model.invoke(
        [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=question),
        ]
    )

    # Extract generated text, not the underlying content blocks.
    answer = response.text

    if not answer:
        answer = (
            "I'm sorry, I couldn't generate a response. "
            "Please contact the clinic team for assistance."
        )

    return {
        "answer": answer.strip()
    }


# ============================================================
# 5. BUILD LANGGRAPH WORKFLOW
# START -> generate_answer -> END
# ============================================================

def build_receptionist_graph():
    workflow = StateGraph(ReceptionistState)

    workflow.add_node(
        "generate_answer",
        generate_answer,
    )

    workflow.add_edge(
        START,
        "generate_answer",
    )

    workflow.add_edge(
        "generate_answer",
        END,
    )

    return workflow.compile()


# ============================================================
# 6. COMPILED GRAPH
# Imported by the test script and, later, FastAPI.
# ============================================================

receptionist_graph = build_receptionist_graph()
