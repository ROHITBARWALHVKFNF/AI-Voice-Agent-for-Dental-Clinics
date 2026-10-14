
from app.ai.receptionist_graph import receptionist_graph


def main():
    questions = [
        "Hello! What can you help me with?",
        "मला दात स्वच्छ करण्याबद्दल माहिती हवी आहे.",
        "What are your clinic's opening hours?",
    ]

    for question in questions:
        print("\n" + "=" * 60)
        print("PATIENT:", question)

        result = receptionist_graph.invoke(
            {"question": question, "answer": ""}
        )

        print("RECEPTIONIST:", result["answer"])


if __name__ == "__main__":
    main()
