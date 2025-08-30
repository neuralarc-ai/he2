from agent.prompt import SYSTEM_PROMPT
import os

# Helium default configuration - simplified and centralized
HELIUM_CONFIG = {
    "name": "Helium",
    "description": "Meet Helium - the God mode agent that transforms how you work with AI. Powered by the brilliant Helio o1 model, Helium delivers human-like understanding with superhuman capabilities, making complex tasks feel effortless.",
    "avatar": "⚡",
    "avatar_color": "#F59E0B",
    "model": "vertexai/gemini-2.5-pro",  # Default fallback, will be overridden in production
    "system_prompt": SYSTEM_PROMPT,
    "configured_mcps": [],
    "custom_mcps": [],
    "agentpress_tools": {
        "sb_shell_tool": True,
        "sb_files_tool": True,
        "sb_deploy_tool": True,
        "sb_expose_tool": True,
        "web_search_tool": True,
        "sb_vision_tool": True,
        "sb_image_edit_tool": True,
        "sb_presentation_outline_tool": False,
        "sb_presentation_tool": False,
        "sb_sheets_tool": True,
        "sb_web_dev_tool": False,
        "browser_tool": True,
        "data_providers_tool": True,
        "agent_config_tool": True,
        "mcp_search_tool": True,
        "credential_profile_tool": True,
        "workflow_tool": True,
        "trigger_tool": True
    },
    "is_default": True
}

def get_helium_model() -> str:
    """
    Get the appropriate model for Helium based on environment.
    In production, randomly selects from the three Vertex AI models.
    In other environments, uses the default model.
    """
    env_mode = os.getenv("ENV_MODE", "local").lower()
    
    if env_mode == "production":
        from utils.constants import get_random_production_model
        return get_random_production_model()
    
    return HELIUM_CONFIG["model"]
