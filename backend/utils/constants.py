# Master model configuration - single source of truth
MODELS = {    
    "openrouter/moonshotai/kimi-k2": {
        "aliases": ["moonshotai/kimi-k2"],
        "pricing": {
            "input_cost_per_million_tokens": 1.00,
            "output_cost_per_million_tokens": 3.00
        },
        "context_window": 200_000,  # 200k tokens
        "tier_availability": ["free", "paid"]
    },
    "openrouter/z-ai/glm-4.5-air:free": {
        "aliases": ["z-ai/glm-4.5-air:free"],
        "pricing": {
            "input_cost_per_million_tokens": 0.00,
            "output_cost_per_million_tokens": 0.00
        },
        "context_window": 128_000,  # 128k tokens
        "tier_availability": ["free", "paid"]
    },
    "openrouter/anthropic/claude-sonnet-4": {
        "aliases": ["openrouter/claude-sonnet-4"],
        "pricing": {
            "input_cost_per_million_tokens": 3.00,
            "output_cost_per_million_tokens": 15.00
        },
        "context_window": 200_000,  # 200k tokens
        "tier_availability": ["free", "paid"]
    },
    "openrouter/qwen/qwen3-coder:free": {
        "aliases": ["qwen/qwen3-coder:free"],
        "pricing": {
            "input_cost_per_million_tokens": 0.00,
            "output_cost_per_million_tokens": 0.00
        },
        "context_window": 128_000,  # 128k tokens
        "tier_availability": ["free"]
    },    
    
    # All models available for all tiers
    "gemini/gemini-2.5-pro": {
        "aliases": ["google/gemini-2.5-pro"],
        "pricing": {
            "input_cost_per_million_tokens": 1.25,
            "output_cost_per_million_tokens": 10.00
        },
        "context_window": 2_000_000,  # 2M tokens
        "tier_availability": ["free", "paid"]
    },
    "gemini/gemini-2.5-flash": {
        "aliases": ["google/gemini-2.5-flash"],
        "pricing": {
            "input_cost_per_million_tokens": 0.15,
            "output_cost_per_million_tokens": 0.60
        },
        "context_window": 2_000_000,  # 2M tokens
        "tier_availability": ["free", "paid"]
    },
    "gemini/gemini-2.0-flash": {
        "aliases": ["google/gemini-2.0-flash"],
        "pricing": {
            "input_cost_per_million_tokens": 0.15,
            "output_cost_per_million_tokens": 0.60
        },
        "context_window": 1_000_000,  # 1M tokens
        "tier_availability": ["free", "paid"]
    },
    # Vertex AI routes for Gemini (same pricing/tier)
    "vertex_ai/gemini-2.5-pro": {
        "aliases": ["gemini-2.5-pro-vertex"],
        "pricing": {
            "input_cost_per_million_tokens": 1.25,
            "output_cost_per_million_tokens": 10.00
        },
        "context_window": 2_000_000,  # 2M tokens
        "tier_availability": ["free", "paid"]
    },
    "vertex_ai/gemini-2.5-flash": {
        "aliases": ["gemini-2.5-flash-vertex"],
        "pricing": {
            "input_cost_per_million_tokens": 0.15,
            "output_cost_per_million_tokens": 0.60
        },
        "context_window": 2_000_000,  # 2M tokens
        "tier_availability": ["free", "paid"]
    },
    "vertex_ai/gemini-2.0-flash": {
        "aliases": ["gemini-2.0-flash-vertex"],
        "pricing": {
            "input_cost_per_million_tokens": 0.15,
            "output_cost_per_million_tokens": 0.60
        },
        "context_window": 1_000_000,  # 1M tokens
        "tier_availability": ["free", "paid"]
    },           
    # Vertex AI Claude Sonnet 4 (using LiteLLM vertex_ai route)
    
    # Vertex AI Claude Sonnet 4 (using LiteLLM vertex_ai route)
    "vertex_ai/claude-sonnet-4@20250514": {
        "aliases": ["claude-sonnet-4-vertex"],
        "pricing": {
            "input_cost_per_million_tokens": 3.00,
            "output_cost_per_million_tokens": 15.00
        },
        "context_window": 1_000_000,  # 1M tokens for Claude Sonnet 4
        "tier_availability": ["paid"]
    }                    
}

# Derived structures (auto-generated from MODELS)
def _generate_model_structures():
    """Generate all model structures from the master MODELS dictionary."""
    
    # Generate tier lists - all models available for all tiers
    all_models = list(MODELS.keys())
    free_models = all_models
    paid_models = all_models
    
    # Generate aliases
    aliases = {}
    
    # Generate pricing
    pricing = {}
    
    # Generate context window limits
    context_windows = {}
    
    for model_name, config in MODELS.items():
        # Add to tier lists - all models available for all tiers
        if "free" in config["tier_availability"]:
            free_models.append(model_name)
        if "paid" in config["tier_availability"]:
            paid_models.append(model_name)
        
        # Add aliases
        for alias in config["aliases"]:
            aliases[alias] = model_name
            # Also add pricing and context windows for aliases
            pricing[alias] = config["pricing"]
            if "context_window" in config:
                context_windows[alias] = config["context_window"]
        
        # Add pricing
        pricing[model_name] = config["pricing"]
        
        # Add context window limits
        if "context_window" in config:
            context_windows[model_name] = config["context_window"]
        
        # Also add pricing and context windows for legacy model name variations
        if model_name.startswith("openrouter/deepseek/"):
            legacy_name = model_name.replace("openrouter/", "")
            pricing[legacy_name] = config["pricing"]
            if "context_window" in config:
                context_windows[legacy_name] = config["context_window"]
        elif model_name.startswith("openrouter/qwen/"):
            legacy_name = model_name.replace("openrouter/", "")
            pricing[legacy_name] = config["pricing"]
            if "context_window" in config:
                context_windows[legacy_name] = config["context_window"]
        elif model_name.startswith("gemini/"):
            legacy_name = model_name.replace("gemini/", "")
            pricing[legacy_name] = config["pricing"]
            if "context_window" in config:
                context_windows[legacy_name] = config["context_window"]
        # Vertex AI legacy pricing removed
        elif model_name.startswith("anthropic/"):
            # Add anthropic/claude-sonnet-4 alias for claude-sonnet-4-20250514
            if "claude-sonnet-4-20250514" in model_name:
                pricing["anthropic/claude-sonnet-4"] = config["pricing"]
                if "context_window" in config:
                    context_windows["anthropic/claude-sonnet-4"] = config["context_window"]
        elif model_name.startswith("xai/"):
            # Add pricing for OpenRouter x-ai models
            openrouter_name = model_name.replace("xai/", "openrouter/x-ai/")
            pricing[openrouter_name] = config["pricing"]
            if "context_window" in config:
                context_windows[openrouter_name] = config["context_window"]
    
    return free_models, paid_models, aliases, pricing, context_windows

# Generate all structures
FREE_TIER_MODELS, PAID_TIER_MODELS, MODEL_NAME_ALIASES, HARDCODED_MODEL_PRICES, MODEL_CONTEXT_WINDOWS = _generate_model_structures()

# All tiers have access to all models without constraints
MODEL_ACCESS_TIERS = {
    "free": FREE_TIER_MODELS,
    "tier_2_20": FREE_TIER_MODELS,
    "tier_6_50": FREE_TIER_MODELS,
    "tier_12_100": FREE_TIER_MODELS,
    "tier_25_200": FREE_TIER_MODELS,
    "tier_50_400": FREE_TIER_MODELS,
    "tier_125_800": FREE_TIER_MODELS,
    "tier_200_1000": FREE_TIER_MODELS,
    "tier_25_170_yearly_commitment": FREE_TIER_MODELS,
    "tier_6_42_yearly_commitment": FREE_TIER_MODELS,
    "tier_12_84_yearly_commitment": FREE_TIER_MODELS,
}

def get_model_context_window(model_name: str, default: int = 31_000) -> int:
    """
    Get the context window size for a given model.
    
    Args:
        model_name: The model name or alias
        default: Default context window if model not found
        
    Returns:
        Context window size in tokens
    """
    # Check direct model name first
    if model_name in MODEL_CONTEXT_WINDOWS:
        return MODEL_CONTEXT_WINDOWS[model_name]
    
    # Check if it's an alias
    if model_name in MODEL_NAME_ALIASES:
        canonical_name = MODEL_NAME_ALIASES[model_name]
        if canonical_name in MODEL_CONTEXT_WINDOWS:
            return MODEL_CONTEXT_WINDOWS[canonical_name]
    
    # Fallback patterns for common model naming variations
    if 'sonnet' in model_name.lower():
        return 200_000  # Claude Sonnet models
    elif 'gpt-5' in model_name.lower():
        return 400_000  # GPT-5 models
    elif 'gemini' in model_name.lower():
        return 2_000_000  # Gemini models
    elif 'grok' in model_name.lower():
        return 128_000  # Grok models
    elif 'gpt' in model_name.lower():
        return 128_000  # GPT-4 and variants
    elif 'deepseek' in model_name.lower():
        return 128_000  # DeepSeek models
    
    return default
