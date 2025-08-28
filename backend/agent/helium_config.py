from agent.prompt import SYSTEM_PROMPT

# Helium default configuration - simplified and centralized
HELIUM_CONFIG = {
    "name": "Helium",
    "description": "Helium is, the God mode Agent created by the NeuralArc, powered by the brilliant Helios o1 model - God Mode",
    "avatar": "⚡",
    "avatar_color": "#F59E0B",
    "model": "vertexai/gemini-2.5-pro",
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
