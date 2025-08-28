# Comprehensive Prompt Engineering Guide for Suna AI Worker
## Based on Lovable Documentation & System Prompt Analysis

---

## Table of Contents
1. [Core Principles](#core-principles)
2. [Prompt Structure Framework](#prompt-structure-framework)
3. [Critical Issues & Solutions](#critical-issues--solutions)
4. [Advanced Techniques](#advanced-techniques)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Quality Assurance](#quality-assurance)
7. [Examples & Templates](#examples--templates)

---

## Core Principles

### The C.L.E.A.R. Framework

**C**oncise - Be clear and get to the point
**L**ogical - Organize in step-by-step, well-structured manner
**E**xplicit - State exactly what you want and don't want
**A**daptive - Refine prompts iteratively based on results
**R**eflective - Review what worked and what didn't

### Key Understanding: How AI Thinks

- **No Common Sense**: AI has no implicit context beyond what you provide
- **Literal Interpretation**: AI follows instructions literally - ambiguities lead to unwanted results
- **Pattern Recognition**: AI predicts outputs based on training data patterns
- **Context Window Limits**: Fixed context size means long prompts may cause forgetting
- **Confidence vs. Accuracy**: AI may sound confident even when guessing (hallucinations)

---

## Prompt Structure Framework

### 1. Structured "Training Wheels" Format (Recommended for Complex Systems)

```
[CRITICAL] Core Identity & Purpose
[IMPORTANT] Primary Capabilities
[NOTE] Technical Constraints
[WORKFLOW] Step-by-Step Instructions
[EXAMPLES] Concrete Demonstrations
[CONSTRAINTS] What NOT to do
```

### 2. Four Levels of Prompting

#### Level 1: Structured Explicit Format
- Use labeled sections (Context, Task, Guidelines, Constraints)
- Best for: Complex workflows, critical systems, new implementations

#### Level 2: Conversational Format
- Natural language with clear instructions
- Best for: Iterative development, debugging, refinements

#### Level 3: Meta Prompting
- Ask AI to improve the prompt itself
- Best for: Optimizing existing prompts, identifying gaps

#### Level 4: Reverse Meta Prompting
- Use AI as documentation tool to summarize changes
- Best for: Knowledge capture, process improvement

---

## Critical Issues & Solutions

### 🚨 IMMEDIATE FIXES REQUIRED

#### 1. Remove All Emojis
```markdown
# BEFORE (Problematic)
🚨🚨🚨 CRITICAL: PROTECT THE SHADCN THEME SYSTEM 🚨🚨🚨

# AFTER (Professional)
[CRITICAL] PROTECT THE SHADCN THEME SYSTEM IN GLOBALS.CSS
```

#### 2. Eliminate Content Duplication
```markdown
# BEFORE (Wastes 500+ tokens)
**MANDATORY FILE EDITING TOOL: `edit_file`**
- **You MUST use the `edit_file` tool for ALL file modifications.**
- The `edit_file` tool is your ONLY tool for changing files.
- You MUST use `edit_file` for ALL modifications to existing files.

# AFTER (Consolidated)
**File Editing Tool: `edit_file`**
- Use `edit_file` for ALL file modifications - this is the only tool for changing files
```

#### 3. Fix Typo
```markdown
# BEFORE
"abilixwty" → # AFTER "ability"
```

#### 4. Reduce Bold Formatting by 80%
```markdown
# BEFORE (Visual Noise)
**MULTI-TURN WORKFLOW:** If you've generated an image and user asks for ANY follow-up changes, **ALWAYS** use edit mode

# AFTER (Clean)
**MULTI-TURN WORKFLOW:** For any follow-up image changes, automatically use edit mode with the previous image
```

### 🎯 STRUCTURAL IMPROVEMENTS

#### 1. Consistent Formatting Hierarchy
```markdown
Level 1: [CRITICAL], [IMPORTANT], [NOTE]
Level 2: **Bold for section headers only**
Level 3: Regular text for content
Level 4: Bullet points for lists
Level 5: Code blocks for examples
```

#### 2. Information Density Standardization
```markdown
[Basic] Core concept explanation
[Advanced] Detailed implementation
[Expert] Advanced optimization
```

---

## Advanced Techniques

### Zero-Shot vs. Few-Shot Prompting

#### Zero-Shot (No Examples)
```markdown
[CRITICAL] When editing files, always use the edit_file tool
```

#### Few-Shot (With Examples)
```markdown
[CRITICAL] File editing examples:
- ✅ Use: edit_file tool with specific line ranges
- ❌ Don't: Ask user to edit manually
- ✅ Use: Clear parameter descriptions
- ❌ Don't: Vague or ambiguous instructions
```

### Managing Hallucinations

#### Provide Reference Material
```markdown
[IMPORTANT] Base all responses on:
1. Available tools and their capabilities
2. Current file contents when provided
3. Explicit user instructions
4. Documented system constraints
```

#### Set Confidence Levels
```markdown
[NOTE] When uncertain about implementation details:
1. Ask for clarification
2. Provide options with pros/cons
3. Suggest testing approach
4. Never invent technical specifications
```

### Progressive Disclosure

#### Basic → Advanced → Expert
```markdown
[Basic] Core workflow: edit_file → verify → confirm
[Advanced] Error handling: try-catch → fallback → user notification
[Expert] Optimization: caching → batching → performance monitoring
```

---

## Implementation Roadmap

### Phase 1: Critical Fixes (24 hours)
- [ ] Remove all emojis
- [ ] Fix typo "abilixwty" → "ability"
- [ ] Remove duplicate workflow section
- [ ] Reduce bold formatting by 80%

### Phase 2: Structural Improvements (3 days)
- [ ] Consolidate redundant sections
- [ ] Implement consistent formatting hierarchy
- [ ] Standardize information density levels
- [ ] Create section templates

### Phase 3: Content Optimization (1 week)
- [ ] Remove duplicate explanations
- [ ] Use more concise language
- [ ] Focus on unique information
- [ ] Implement progressive disclosure

### Phase 4: Testing & Validation (2 days)
- [ ] Test with LLM for comprehension
- [ ] Verify critical instructions are followed
- [ ] Measure token efficiency improvements
- [ ] Collect user feedback

---

## Quality Assurance

### Testing Protocol

#### 1. Before/After Comparison
```markdown
Test same prompts with old vs. new system prompt
Measure: Response quality, consistency, token usage
```

#### 2. Comprehension Testing
```markdown
Verify LLM understands critical instructions
Test: File editing, workflow execution, error handling
```

#### 3. Performance Testing
```markdown
Measure response quality and consistency
Metrics: Accuracy, speed, user satisfaction
```

### Success Metrics

#### Quantitative Targets
- Token count reduction: 50% reduction
- Emoji count: 0
- Duplicate content: 0
- Bold usage: 80% reduction

#### Qualitative Targets
- Professional appearance: 90% improvement
- Readability: 85% improvement
- LLM comprehension: 90% improvement

---

## Examples & Templates

### Section Template
```markdown
## [Section Name]

### Purpose
Brief description of what this section covers

### Key Instructions
- Primary action item
- Secondary action item
- Constraint or limitation

### Examples
```code
Concrete example of expected behavior
```

### Common Mistakes
- ❌ What NOT to do
- ✅ What TO do instead
```

### Critical Instruction Template
```markdown
[CRITICAL] [Action Required]
- **What**: Specific instruction
- **When**: Timing or condition
- **How**: Method or approach
- **Why**: Reason or consequence
```

### Workflow Template
```markdown
[WORKFLOW] [Process Name]
1. **Step 1**: Action description
2. **Step 2**: Action description
3. **Step 3**: Action description

**Exit Conditions**: When to stop or move to next workflow
**Error Handling**: What to do if something goes wrong
```

---

## Best Practices Summary

### ✅ DO
- Use clear, structured sections
- Provide concrete examples
- Set explicit constraints
- Test iteratively
- Document changes
- Use consistent formatting
- Focus on unique information
- Implement progressive disclosure

### ❌ DON'T
- Use emojis or excessive formatting
- Repeat information unnecessarily
- Assume AI understands context
- Create ambiguous instructions
- Over-explain basic concepts
- Mix different complexity levels
- Ignore token efficiency
- Skip testing and validation

---

## Tools & Resources

### Prompt Analysis Tools
- Token counters
- Readability analyzers
- Formatting validators
- LLM testing frameworks

### Reference Materials
- OpenAI Prompt Engineering Guide
- Anthropic Claude System Prompt Guidelines
- Microsoft Prompt Engineering Framework
- Lovable Prompting Documentation

---

## Conclusion

Effective prompt engineering is systematic, not magical. By following the C.L.E.A.R. framework, implementing consistent structure, and eliminating common pitfalls, you can transform your system prompt from a bloated, confusing document into a precise, professional tool that maximizes LLM comprehension while minimizing token waste.

**Key Success Factors:**
1. **Structure**: Clear, logical organization
2. **Clarity**: Explicit, unambiguous instructions
3. **Efficiency**: No duplication or unnecessary content
4. **Professionalism**: Clean, consistent formatting
5. **Testing**: Iterative validation and improvement

**Remember**: The goal is to create a prompt that works like a well-written technical specification - clear, concise, and actionable. With systematic improvement, your system prompt can become a powerful tool that significantly enhances your AI agent's performance and reliability.

---

*This guide is based on the Lovable Documentation and analysis of your current system prompt. Use it as a reference for systematic improvement and ongoing optimization.*
