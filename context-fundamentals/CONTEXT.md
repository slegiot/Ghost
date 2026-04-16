# Context Engineering Fundamentals

Context is the full state an LLM can attend to at inference time: system instructions, tool definitions, retrieved documents, message history, and tool outputs. Good context engineering is the practice of curating the smallest high-signal token set that still produces the desired outcome.

## When To Use This

Use this reference when you are:
- Designing or modifying agent architectures
- Debugging context-related behavior issues
- Reducing token cost or latency
- Teaching context engineering principles
- Reviewing design decisions that affect memory, retrieval, or prompt structure

## Core Mental Model

- Context is a finite resource, not infinite memory.
- More tokens can reduce quality if signal density drops.
- Tool outputs are often the largest source of token growth.
- Progressive disclosure (load only what is needed, when needed) is the default strategy.

## Anatomy Of Context

### 1) System Prompts
- Define identity, boundaries, and operating rules.
- Keep them clear, explicit, and at the right level of abstraction.
- Structure sections (background, instructions, tools, output style) for readability.

### 2) Tool Definitions
- Strong tool descriptions reduce ambiguity and bad tool choice.
- Include purpose, usage conditions, parameter expectations, and examples.
- If humans cannot clearly choose between tools, agents usually cannot either.

### 3) Retrieved Documents
- Prefer just-in-time retrieval over preloading large corpora.
- Keep references lightweight (paths, IDs, URLs) and fetch details on demand.

### 4) Message History
- Carries state and continuity over long tasks.
- Must be compacted or summarized as it grows.

### 5) Tool Outputs
- Usually the biggest context consumer.
- Retain only what is needed for downstream decisions.

## Attention And Context Windows

- Effective reasoning quality is constrained by attention budget, not only max token window.
- Long contexts are supported but can degrade retrieval precision and long-range coherence.
- Place critical instructions near high-attention positions (beginning and end).

## Practical Patterns

### Progressive Disclosure
Load only metadata first (names, summaries, pointers), then fetch full content if and when it becomes relevant.

### Hybrid Context Strategy
Preload stable, always-relevant context (for example, core repo rules), then dynamically fetch volatile or task-specific data.

### Context Budgeting
- Set explicit context limits per task type.
- Trigger compaction around 70-80% utilization.
- Measure and iterate instead of assuming larger windows are safer.

## Design Guidelines

1. Favor signal density over coverage.
2. Keep instructions concrete and structured.
3. Retrieve narrowly and late.
4. Summarize tool output aggressively.
5. Design for graceful degradation in long sessions.
6. Re-evaluate context composition continuously.

## Quick Checklist

- Do we include only decision-relevant tokens?
- Are critical rules easy to find in the prompt?
- Are tools clearly distinguishable?
- Are we retrieving minimally and just in time?
- Is there a compaction/summarization trigger?

## Related Topics

- Context degradation patterns
- Context optimization techniques
- Multi-agent context isolation
- Tool design for predictable selection
