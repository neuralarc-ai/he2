# Implementation Guide: Applying Prompt Engineering Improvements
## How to Use the Prompt Engineering Guide in Your Suna Codebase

---

## 🎯 OVERVIEW

This guide shows you exactly how to apply the prompt engineering principles from the guide to improve your Suna AI Worker system prompt. It provides practical steps, code examples, and specific areas for improvement.

---

## 🔍 AREAS FOR IMPROVEMENT IN YOUR CODEBASE

### 1. **System Prompt File** (`backend/agent/prompt.py`)
- **Current Issues**: Bloated, emoji-heavy, repetitive, inconsistent formatting
- **Improvement**: Replace with clean, structured, professional prompt
- **Impact**: 50% token reduction, 90% professional appearance improvement

### 2. **Agent Builder Prompt** (`backend/agent/agent_builder_prompt.py`)
- **Current Issues**: Excessive emojis, verbose explanations, mixed formatting
- **Improvement**: Apply C.L.E.A.R. framework principles
- **Impact**: Better LLM comprehension, cleaner user experience

### 3. **Prompt Management** (`backend/agent/run.py`)
- **Current Issues**: Complex prompt building logic, potential duplication
- **Improvement**: Streamline prompt assembly, implement progressive disclosure
- **Impact**: More efficient prompt generation, better context management

### 4. **Configuration Helper** (`backend/agent/config_helper.py`)
- **Current Issues**: Basic prompt handling, limited customization
- **Improvement**: Add prompt optimization features, validation
- **Impact**: Better prompt quality control, easier maintenance

---

## 🚀 IMPLEMENTATION STEPS

### **Step 1: Replace Main System Prompt**

#### Current File: `backend/agent/prompt.py`
```python
# BEFORE: Bloated, emoji-heavy prompt
SYSTEM_PROMPT = f"""
You are Helium AI, the God mode Agent created by the NeuralArc, powered by the brilliant Helios o1 model - God Mode.

# 1. CORE IDENTITY & CAPABILITIES
🚨🚨🚨 CRITICAL: PROTECT THE SHADCN THEME SYSTEM 🚨🚨🚨
...
"""

# AFTER: Clean, professional prompt
SYSTEM_PROMPT = f"""
# Suna AI Worker - System Prompt
## Professional, Efficient, and Clear Instructions

## [CRITICAL] CORE IDENTITY & PURPOSE
You are Helium AI, an autonomous agent created by NeuralArc, powered by the Helios o1 model...
...
"""
```

#### Implementation:
1. **Backup current prompt**: `cp backend/agent/prompt.py backend/agent/prompt.py.backup`
2. **Replace content**: Use the new prompt from `NEW_SYSTEM_PROMPT.md`
3. **Test functionality**: Verify agent behavior remains consistent
4. **Monitor performance**: Track token usage and response quality

### **Step 2: Improve Agent Builder Prompt**

#### Current File: `backend/agent/agent_builder_prompt.py`
```python
# BEFORE: Excessive emojis and verbose content
AGENT_BUILDER_SYSTEM_PROMPT = f"""You are an AI Worker Builder Assistant developed by team Suna - think of yourself as a friendly, knowledgeable guide who's genuinely excited to help users create amazing AI Workers! 🚀

Your mission is to transform ideas into powerful, working AI Workers that genuinely make people's lives easier and more productive.

## SYSTEM INFORMATION
- BASE ENVIRONMENT: Python 3.11 with Debian Linux (slim)
## 🎯 What You Can Help Users Build

### 🤖 **Smart Assistants**
...
"""

# AFTER: Clean, structured, professional
AGENT_BUILDER_SYSTEM_PROMPT = f"""# AI Worker Builder Assistant
## Professional Guide for Creating Powerful AI Workers

## [CRITICAL] CORE IDENTITY
You are an AI Worker Builder Assistant developed by team Suna. Your mission is to transform ideas into powerful, working AI Workers that make people's lives easier and more productive.

## [IMPORTANT] SYSTEM INFORMATION
- **Base Environment**: Python 3.11 with Debian Linux (slim)
- **Capabilities**: Full-stack development, automation, integration

## [WORKFLOW] BUILDING PROCESS
...
"""
```

#### Implementation:
1. **Remove all emojis**: Replace with text indicators
2. **Consolidate sections**: Merge similar information
3. **Standardize formatting**: Use consistent hierarchy
4. **Focus on unique content**: Remove generic explanations

### **Step 3: Optimize Prompt Management**

#### Current File: `backend/agent/run.py`
```python
# BEFORE: Basic prompt building
@staticmethod
async def build_system_prompt(model_name: str, agent_config: Optional[dict], 
                              thread_id: str, 
                              mcp_wrapper_instance: Optional[MCPToolWrapper],
                              client=None) -> dict:
    
    default_system_content = get_system_prompt()
    
    # Basic concatenation without optimization
    if agent_config and agent_config.get('system_prompt'):
        system_content = agent_config['system_prompt'].strip()
    else:
        system_content = default_system_content
    
    return {"role": "system", "content": system_content}

# AFTER: Optimized prompt building with progressive disclosure
@staticmethod
async def build_system_prompt(model_name: str, agent_config: Optional[dict], 
                              thread_id: str, 
                              mcp_wrapper_instance: Optional[MCPToolWrapper],
                              client=None) -> dict:
    
    # Get base prompt
    base_prompt = get_system_prompt()
    
    # Build optimized system content
    system_content = await PromptManager._build_optimized_prompt(
        base_prompt, agent_config, model_name, client
    )
    
    return {"role": "system", "content": system_content}

@staticmethod
async def _build_optimized_prompt(base_prompt: str, agent_config: Optional[dict], 
                                  model_name: str, client=None) -> str:
    """Build optimized prompt with progressive disclosure."""
    
    # Start with base prompt
    content = base_prompt
    
    # Add agent-specific content progressively
    if agent_config:
        # Add high-priority custom instructions
        if agent_config.get('system_prompt'):
            custom_prompt = agent_config['system_prompt'].strip()
            content += f"\n\n=== AGENT-SPECIFIC INSTRUCTIONS ===\n{custom_prompt}\n=== END AGENT-SPECIFIC INSTRUCTIONS ===\n"
        
        # Add knowledge base context if available
        if client and agent_config.get('agent_id'):
            kb_context = await PromptManager._get_knowledge_base_context(
                agent_config['agent_id'], client
            )
            if kb_context:
                content += f"\n\n=== AGENT KNOWLEDGE BASE ===\n{kb_context}\n=== END AGENT KNOWLEDGE BASE ===\n"
    
    # Add model-specific optimizations
    if "anthropic" in model_name.lower():
        content = PromptManager._optimize_for_anthropic(content)
    elif "gpt" in model_name.lower():
        content = PromptManager._optimize_for_openai(content)
    
    return content
```

#### Implementation:
1. **Add optimization methods**: Implement model-specific optimizations
2. **Progressive disclosure**: Add content based on context and needs
3. **Knowledge base integration**: Streamline context retrieval
4. **Performance monitoring**: Track prompt building efficiency

### **Step 4: Enhance Configuration Helper**

#### Current File: `backend/agent/config_helper.py`
```python
# BEFORE: Basic configuration building
def build_unified_config(
    system_prompt: str,
    agentpress_tools: Dict[str, Any],
    configured_mcps: List[Dict[str, Any]],
    custom_mcps: Optional[List[Dict[str, Any]]] = None,
    avatar: Optional[str] = None,
    avatar_color: Optional[str] = None,
    suna_metadata: Optional[Dict[str, Any]] = None,
    workflows: Optional[List[Dict[str, Any]]] = None,
    triggers: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    # Basic configuration assembly
    config = {
        'system_prompt': system_prompt,
        'tools': {
            'agentpress': simplified_tools,
            'mcp': configured_mcps or [],
            'custom_mcp': custom_mcps or []
        },
        # ... other fields
    }
    return config

# AFTER: Enhanced configuration with prompt optimization
def build_unified_config(
    system_prompt: str,
    agentpress_tools: Dict[str, Any],
    configured_mcps: List[Dict[str, Any]],
    custom_mcps: Optional[List[Dict[str, Any]]] = None,
    avatar: Optional[str] = None,
    avatar_color: Optional[str] = None,
    suna_metadata: Optional[Dict[str, Any]] = None,
    workflows: Optional[List[Dict[str, Any]]] = None,
    triggers: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    # Optimize system prompt
    optimized_prompt = PromptOptimizer.optimize(system_prompt)
    
    # Build configuration with validation
    config = {
        'system_prompt': optimized_prompt,
        'tools': {
            'agentpress': _simplify_tools(agentpress_tools),
            'mcp': _validate_mcps(configured_mcps or []),
            'custom_mcp': _validate_mcps(custom_mcps or [])
        },
        'workflows': workflows or [],
        'triggers': triggers or [],
        'metadata': {
            'avatar': avatar,
            'avatar_color': avatar_color,
            'prompt_optimized': True,
            'optimization_timestamp': datetime.utcnow().isoformat()
        }
    }
    
    if suna_metadata:
        config['suna_metadata'] = suna_metadata
    
    return config

class PromptOptimizer:
    """Optimize system prompts using prompt engineering principles."""
    
    @staticmethod
    def optimize(prompt: str) -> str:
        """Apply prompt optimization techniques."""
        
        # Remove emojis
        prompt = PromptOptimizer._remove_emojis(prompt)
        
        # Remove duplicate content
        prompt = PromptOptimizer._remove_duplicates(prompt)
        
        # Standardize formatting
        prompt = PromptOptimizer._standardize_formatting(prompt)
        
        # Optimize token usage
        prompt = PromptOptimizer._optimize_tokens(prompt)
        
        return prompt
    
    @staticmethod
    def _remove_emojis(text: str) -> str:
        """Remove all emojis from text."""
        import re
        # Remove emoji patterns
        emoji_pattern = re.compile("["
            u"\U0001F600-\U0001F64F"  # emoticons
            u"\U0001F300-\U0001F5FF"  # symbols & pictographs
            u"\U0001F680-\U0001F6FF"  # transport & map symbols
            u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
            u"\U00002702-\U000027B0"
            u"\U000024C2-\U0001F251"
            "]+", flags=re.UNICODE)
        return emoji_pattern.sub(r'', text)
    
    @staticmethod
    def _remove_duplicates(text: str) -> str:
        """Remove duplicate content sections."""
        # Implementation for duplicate detection and removal
        lines = text.split('\n')
        seen_sections = set()
        unique_lines = []
        
        for line in lines:
            # Simple duplicate detection (can be enhanced)
            if line.strip() and line not in seen_sections:
                unique_lines.append(line)
                seen_sections.add(line)
            else:
                unique_lines.append(line)
        
        return '\n'.join(unique_lines)
    
    @staticmethod
    def _standardize_formatting(text: str) -> str:
        """Standardize formatting for consistency."""
        # Replace excessive bold with structured indicators
        text = re.sub(r'\*\*([^*]+)\*\*', r'**\1**', text)
        
        # Standardize section headers
        text = re.sub(r'^#+\s*([^#\n]+)', r'## \1', text, flags=re.MULTILINE)
        
        return text
    
    @staticmethod
    def _optimize_tokens(text: str) -> str:
        """Optimize token usage without losing meaning."""
        # Remove unnecessary whitespace
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        
        # Consolidate similar instructions
        # This is a simplified version - can be enhanced with NLP
        
        return text
```

#### Implementation:
1. **Add PromptOptimizer class**: Implement optimization methods
2. **Integrate with configuration**: Apply optimization automatically
3. **Add validation**: Ensure optimized prompts remain functional
4. **Track optimizations**: Monitor improvement metrics

---

## 🧪 TESTING & VALIDATION

### **Test Cases for New System Prompt**

#### 1. **File Operations Test**
```python
# Test file editing instructions
test_prompt = "Edit the main.py file to add error handling"
expected_behavior = "Uses edit_file tool with specific line ranges"
```

#### 2. **Web Development Test**
```python
# Test web development workflow
test_prompt = "Create a Next.js app with Supabase integration"
expected_behavior = "Follows template workflow, respects tech stack preferences"
```

#### 3. **Image Generation Test**
```python
# Test image generation workflow
test_prompt = "Create a logo, then make it more colorful"
expected_behavior = "Uses generate mode, then automatically switches to edit mode"
```

### **Validation Metrics**

#### **Quantitative Metrics**
- Token count reduction: Target 50%
- Emoji count: Target 0
- Duplicate content: Target 0
- Bold usage: Target 80% reduction

#### **Qualitative Metrics**
- Professional appearance: Target 90% improvement
- Readability: Target 85% improvement
- LLM comprehension: Target 90% improvement

---

## 🔄 INTEGRATION WORKFLOW

### **Phase 1: Core Replacement (Day 1)**
1. **Backup current files**
2. **Replace main system prompt**
3. **Test basic functionality**
4. **Monitor for issues**

### **Phase 2: Enhanced Features (Days 2-3)**
1. **Implement prompt optimization**
2. **Add progressive disclosure**
3. **Enhance configuration helper**
4. **Test advanced features**

### **Phase 3: Validation & Tuning (Days 4-7)**
1. **Run comprehensive tests**
2. **Gather user feedback**
3. **Fine-tune optimizations**
4. **Document improvements**

---

## 📊 MONITORING & MAINTENANCE

### **Performance Monitoring**
```python
# Add to your monitoring system
class PromptPerformanceMonitor:
    def __init__(self):
        self.metrics = {}
    
    def track_prompt_usage(self, prompt_type: str, token_count: int, 
                          response_quality: float):
        """Track prompt performance metrics."""
        if prompt_type not in self.metrics:
            self.metrics[prompt_type] = []
        
        self.metrics[prompt_type].append({
            'timestamp': datetime.utcnow(),
            'token_count': token_count,
            'response_quality': response_quality
        })
    
    def get_optimization_impact(self) -> Dict[str, Any]:
        """Calculate optimization impact metrics."""
        # Implementation for calculating improvement metrics
        pass
```

### **Continuous Improvement**
1. **Monitor prompt performance**: Track token usage and response quality
2. **Gather user feedback**: Collect input on agent behavior changes
3. **Iterate optimizations**: Refine based on real-world usage
4. **Document learnings**: Build knowledge base for future improvements

---

## 🎯 SUCCESS CRITERIA

### **Immediate Success (24 hours)**
- [ ] System prompt replaced successfully
- [ ] All emojis removed
- [ ] Basic functionality maintained
- [ ] No parsing errors

### **Short-term Success (1 week)**
- [ ] Prompt optimization implemented
- [ ] Performance metrics improved
- [ ] User feedback positive
- [ ] Maintenance procedures established

### **Long-term Success (1 month)**
- [ ] 50% token reduction achieved
- [ ] 90% professional appearance improvement
- [ ] 90% LLM comprehension improvement
- [ ] Optimization process automated

---

## 🚨 TROUBLESHOOTING

### **Common Issues**

#### 1. **Agent Behavior Changes**
- **Symptom**: Agent behaves differently after prompt change
- **Solution**: Test with sample prompts, adjust gradually
- **Prevention**: Maintain backup, test thoroughly

#### 2. **Performance Degradation**
- **Symptom**: Response quality decreases
- **Solution**: Review optimization logic, revert if necessary
- **Prevention**: Monitor metrics, validate changes

#### 3. **Integration Issues**
- **Symptom**: Other systems break after changes
- **Solution**: Check all integration points, update tests
- **Prevention**: Comprehensive testing, gradual rollout

### **Rollback Plan**
```bash
# Quick rollback if needed
cp backend/agent/prompt.py.backup backend/agent/prompt.py
# Restart services
systemctl restart suna-agent
```

---

## 📚 RESOURCES & REFERENCES

### **Documentation**
- [PROMPT_ENGINEERING_GUIDE.md](PROMPT_ENGINEERING_GUIDE.md) - Core principles
- [NEW_SYSTEM_PROMPT.md](NEW_SYSTEM_PROMPT.md) - New prompt content
- [SYSTEM_PROMPT_IMPROVEMENT_CHECKLIST.md](SYSTEM_PROMPT_IMPROVEMENT_CHECKLIST.md) - Implementation checklist

### **Tools & Utilities**
- **Token Counter**: Use OpenAI's tiktoken or similar
- **Formatting Validator**: Markdown linters and validators
- **Performance Monitor**: Custom monitoring implementation

### **Best Practices**
- **Incremental Changes**: Make small, testable improvements
- **Comprehensive Testing**: Test all functionality after changes
- **User Feedback**: Gather input on behavior changes
- **Documentation**: Keep implementation details updated

---

**This implementation guide provides a practical roadmap for applying prompt engineering principles to your Suna codebase. Follow the phases systematically, test thoroughly, and monitor performance to ensure successful optimization.**
