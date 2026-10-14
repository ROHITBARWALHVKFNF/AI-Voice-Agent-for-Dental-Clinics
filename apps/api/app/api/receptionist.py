
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.ai.receptionist_graph import receptionist_graph
from app.core.config import settings


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai/receptionist",
    tags=["AI Receptionist"],
)


class ReceptionistChatRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="The patient's message.",
    )


class ReceptionistChatResponse(BaseModel):
    answer: str


@router.post(
    "/chat",
    response_model=ReceptionistChatResponse,
    status_code=status.HTTP_200_OK,
)
def chat_with_receptionist(
    request: ReceptionistChatRequest,
) -> ReceptionistChatResponse:
    """
    Generate a text response from the dental AI receptionist.

    This initial endpoint does not access patient records,
    clinic schedules, or appointment booking tools.
    """

    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI receptionist is not configured yet.",
        )

    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please enter a message.",
        )

    try:
        result = receptionist_graph.invoke(
            {
                "question": question,
                "answer": "",
            }
        )

        answer = result.get("answer", "")

        if not isinstance(answer, str) or not answer.strip():
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The AI receptionist returned an empty response.",
            )

        return ReceptionistChatResponse(
            answer=answer.strip()
        )

    except HTTPException:
        raise

    except Exception:
        logger.exception("AI receptionist request failed")

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "The AI receptionist could not respond right now. "
                "Please try again shortly."
            ),
        )
