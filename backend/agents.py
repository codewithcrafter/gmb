from typing import TypedDict, Annotated, Literal
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from dotenv import load_dotenv

# We will use Gemini 2.5 Pro as requested
load_dotenv()

# We only initialize if the API key is present
if os.getenv("GOOGLE_API_KEY"):
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-pro", temperature=0.7)
else:
    class DummyLLM:
        def invoke(self, messages):
            raise RuntimeError("AI_NOT_CONFIGURED")
    llm = DummyLLM()

class ReviewAgentState(TypedDict):
    review_text: str
    star_rating: int
    reviewer_name: str
    business_name: str
    tone: str # Professional, Friendly, Luxury, etc.
    sentiment: str # POSITIVE, NEUTRAL, NEGATIVE
    reply_draft: str

def analyze_sentiment(state: ReviewAgentState):
    """Determine the sentiment of the review."""
    prompt = f"Analyze the following review and classify its sentiment strictly as POSITIVE, NEUTRAL, or NEGATIVE.\nReview: {state['review_text']}\nSentiment:"
    response = llm.invoke([HumanMessage(content=prompt)])
    sentiment = response.content.strip().upper()
    if sentiment not in ["POSITIVE", "NEUTRAL", "NEGATIVE"]:
        sentiment = "NEUTRAL"
    return {"sentiment": sentiment}

def generate_reply(state: ReviewAgentState):
    """Generate a contextual reply based on the tone and sentiment."""
    system_prompt = (
        "You are an expert customer success manager for a Google Business Profile.\n"
        "Your task is to write a highly professional, concise, and natural reply to a customer review.\n"
        "Rules:\n"
        "- Never argue with the customer.\n"
        "- Never invent facts or claim an action was taken unless explicitly stated by the customer.\n"
        "- Never mention internal AI or that you are an AI.\n"
        "- Keep it suitable for a Google Business Profile (avoid excessive emojis).\n"
        "- Avoid repetitive stock replies."
    )
    
    star_instructions = ""
    rating = state.get("star_rating", 0)
    if rating == 5:
        star_instructions = "Since this is a 5-star review, thank the customer and acknowledge their positive experience."
    elif rating == 4:
        star_instructions = "Since this is a 4-star review, thank them and acknowledge their feedback."
    elif rating == 3:
        star_instructions = "Since this is a 3-star review, thank them, acknowledge the mixed experience, and invite them to improve the experience."
    elif rating in [1, 2]:
        star_instructions = "Since this is a 1 or 2-star review, apologize for the poor experience, acknowledge the concern, and invite the customer to contact the business privately."
    
    prompt = (
        f"Business Name: {state.get('business_name', 'Our Business')}\n"
        f"Reviewer Name: {state.get('reviewer_name', 'Valued Customer')}\n"
        f"Star Rating: {rating} stars\n"
        f"Review Text: '{state['review_text']}'\n\n"
        f"Instructions: Write a {state['tone']} response to this review. {star_instructions}"
    )
    
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt)
    ])
    
    return {"reply_draft": response.content.strip()}

# Build LangGraph
workflow = StateGraph(ReviewAgentState)
workflow.add_node("analyze_sentiment", analyze_sentiment)
workflow.add_node("generate_reply", generate_reply)

workflow.set_entry_point("analyze_sentiment")
workflow.add_edge("analyze_sentiment", "generate_reply")
workflow.add_edge("generate_reply", END)

review_agent = workflow.compile()

# Example usage:
# state = review_agent.invoke({"review_text": "The food was amazing!", "tone": "Friendly"})
# print(state["reply_draft"])
