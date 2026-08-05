# MatterReady AI Intake Copilot

## Product purpose

MatterReady turns an unstructured client conversation and supporting documents into a reviewable case packet. The product is not a generic matter tracker and does not provide legal advice.

A reviewer uses one conversational workspace to:

1. explain the outcome they need;
2. provide the minimum client information;
3. add document text or extracted document content;
4. review missing facts and contradictions;
5. approve the correct value when sources disagree; and
6. hand off a structured summary, evidence matrix, issue list, and readiness score.

## Human value

The copilot reduces repetitive intake questioning and manual comparison. It keeps source attribution visible and requires a human decision before a conflicting document value changes the case profile.

## Runtime architecture

The browser owns the evaluation session and sends the complete typed state with every request. The Python API is stateless: it extracts facts, builds a pandas evidence table, detects missing or conflicting information, selects the next question, and returns the updated state and packet.

This design avoids ephemeral serverless databases and makes the portfolio demo resilient across Vercel deployments.

## AI providers

The core workflow remains usable with the deterministic `template` provider. A local or containerized Python deployment can enable the `transformers` provider and use:

- PyTorch inference mode;
- `Qwen/Qwen3-0.6B` for concise conversational generation;
- Sentence Transformers or `Qwen/Qwen3-Embedding-0.6B` for semantic retrieval;
- Docling for PDF and Office document conversion;
- pandas for evidence and discrepancy analysis;
- RapidFuzz for tolerant value comparison.

Install the optional stack with `backend/requirements-ai.txt`. Model output may improve wording, but it may not add facts or override deterministic readiness and conflict rules.

## Deployment

- Vercel: React/Flowbite frontend, JWT authentication, and the lightweight deterministic Python copilot.
- Local/VPS/Docker: the same API with `AI_PROVIDER=transformers` and the optional open-source model dependencies.

The model boundary is replaceable, so the application can run without a paid AI API.
