#!/usr/bin/env python3
"""
Test script to verify model context window limits.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.constants import get_model_context_window, MODEL_CONTEXT_WINDOWS

def test_model_limits():
    """Test the model context window limits."""
    
    print("=== All Model Context Windows ===")
    for model, window in sorted(MODEL_CONTEXT_WINDOWS.items()):
        print(f'{model}: {window:,} tokens')

    print("\n=== Testing get_model_context_window function ===")
    test_models = [
        'gpt-5', 
        'sonnet-3.5', 
        'gemini-2.5-pro', 
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'claude-sonnet-4', 
        'grok-4', 
        'unknown-model',
        'anthropic/claude-sonnet-4-20250514',
        'openai/gpt-5-mini'
    ]
    
    for model in test_models:
        window = get_model_context_window(model)
        print(f'{model}: {window:,} tokens')

    print("\n=== Context Manager Logic Simulation ===")
    for model in ['gpt-5', 'anthropic/claude-sonnet-4', 'gemini/gemini-2.5-pro', 'gemini/gemini-2.5-flash', 'gemini/gemini-2.0-flash', 'unknown-model']:
        context_window = get_model_context_window(model)
        
        # Simulate the logic from context manager
        if context_window >= 1_000_000:  # Very large context models (Gemini)
            max_tokens = context_window - 300_000
        elif context_window >= 400_000:  # Large context models (GPT-5)
            max_tokens = context_window - 64_000
        elif context_window >= 200_000:  # Medium context models (Claude Sonnet)
            max_tokens = context_window - 32_000
        elif context_window >= 100_000:  # Standard large context models
            max_tokens = context_window - 16_000
        else:  # Smaller context models
            max_tokens = context_window - 8_000
        
        print(f'{model}: context={context_window:,} → effective_limit={max_tokens:,} (reserved: {context_window-max_tokens:,})')

if __name__ == "__main__":
    test_model_limits()
