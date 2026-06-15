import anthropic
import json
from app.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

STYLIST_SYSTEM_PROMPT = """You are an expert personal stylist with deep knowledge of fashion for South Asian body types and sizing conventions.
You provide specific, actionable styling advice tailored to the individual's body measurements, skin tone, and style preferences.
Always respond in valid JSON with these exact keys: advice, outfit_suggestions, size_recommendation, color_palette, avoid.
- advice: string with personalized styling narrative
- outfit_suggestions: array of {name, description, why_it_works} objects
- size_recommendation: string with specific size guidance
- color_palette: array of color names that complement the person's tone
- avoid: array of styles/cuts/colors to avoid for this body type"""


async def get_style_advice(
    body_profile: dict,
    context: str,
    product_images: list[str] = [],
    user_photo_url: str | None = None,
) -> dict:
    """Call Claude for personalized styling advice with optional vision."""
    content = []

    # Add user photo if provided
    if user_photo_url:
        content.append({
            "type": "image",
            "source": {"type": "url", "url": user_photo_url},
        })

    # Add product images (up to 5)
    for img_url in product_images[:5]:
        content.append({
            "type": "image",
            "source": {"type": "url", "url": img_url},
        })

    # Build the text prompt
    profile_text = json.dumps(body_profile, indent=2)
    text_prompt = f"""Body Profile:
{profile_text}

Style Context: {context}

{"I've shared the user's photo above." if user_photo_url else ""}
{"I've shared the product images above." if product_images else ""}

Provide personalized styling advice for this individual. Be specific about sizing and what will flatter their body type."""

    content.append({"type": "text", "text": text_prompt})

    response = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": STYLIST_SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": content}],
    )

    raw_text = response.content[0].text
    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    return json.loads(raw_text.strip())


async def get_complete_the_look(
    product_name: str,
    product_description: str,
    product_image_url: str,
) -> dict:
    """Suggest complementary items to complete an outfit."""
    content = [
        {
            "type": "image",
            "source": {"type": "url", "url": product_image_url},
        },
        {
            "type": "text",
            "text": f"""Product: {product_name}
Description: {product_description}

Suggest 3-4 complementary clothing items and accessories that would complete this outfit.
Respond in JSON: {{suggestions: [{{category, description, why}}]}}""",
        },
    ]

    response = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=512,
        messages=[{"role": "user", "content": content}],
    )

    raw_text = response.content[0].text
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    return json.loads(raw_text.strip())
