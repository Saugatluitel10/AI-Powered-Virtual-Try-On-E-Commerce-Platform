from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str = "development"
    backend_url: str = "http://localhost:8000"

    # Try-On: Replicate (IDM-VTON / OOTDiffusion) + Modal
    replicate_api_token: str = ""
    replicate_vton_model: str = "yisol/idm-vton"
    replicate_vton_version: str = "906425dbca90663ff5427624839572cc56ea7d380343d13e2a4c4b09d3f0c30f"
    modal_token_id: str = ""
    modal_token_secret: str = ""

    # LLM Stylist: Claude
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"

    # Storage: Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
