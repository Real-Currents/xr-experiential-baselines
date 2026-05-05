# XR Experiential Baselines — Implementation Strategy

## Overview

This project evolves through three distinct phases, each building upon the last. The foundation is a **spatial design toolkit** for WebXR alignment and calibration; the ultimate goal is a **conversational, sentiment-responsive immersive experience** that understands and operates within a designer-authored spatial context.

---

## Phase 1: Spatial Calibration Toolkit (Active)

**Goal:** Enable precise, in-headset alignment of synthetic geometry with immersive video layers.

Immersive video (stereo equirectangular, fisheye, or light-field) rarely aligns with the WebXR `local-floor` reference space out of the box. Rather than guess offsets in code, we **feel them in-headset** and **capture the resulting transforms**.

### Designer tools (not player features)

| Tool | Input | Purpose |
|---|---|---|
| **Grid Z-slider** | Left/right thumbstick Y | Slide the static reference grid forward/back along world +Z until it converges with the video's implied floor plane |
| **Grid X/Y nudge** | (future) D-pad or thumbstick click | Fine-tune lateral/vertical offset |
| **Convergence snapshot** | A-button (confirm) | Serialize the current `GridTransform.offset` to a persisted config |
| **Session reset** | B-button (cancel/quit sequence) | Discard temporary offsets and return to authored defaults |

All tool actions use the existing **confirm/cancel** flow (B initiates, A confirms, B cancels).

### ECS-inspired state layer

A lightweight entity-component-system pattern separates mutable spatial state from the imperative render loop, without requiring full IWSDK `elics` migration:

- `src/ecs/World.js` — minimal registry
- `src/ecs/components/GridTransform.js` — offset, velocity, speed, clamping
- `src/ecs/systems/GridMovementSystem.js` — thumbstick input integration

### Outputs to Phase 2

- `gridOffset` (Vector3) — signed displacement from the authored origin
- `videoQuadBasePosition` (Vector3) — authored anchor of the XRQuadLayer
- `sessionConfig.json` — serialized alignment values for hydration on next load

---

## Phase 2: Conversational Spatial Interface (Planned)

**Goal:** Natural voice conversations that generate contextually appropriate 3D spatial UI, emotionally responsive materials, and adaptive layouts — all **anchored to the calibrated world-space** from Phase 1.

### Architecture changes from the original proposal

The original strategy assumed an empty void. This revised architecture treats the Phase 1 outputs as **constraints**:

- LLM-generated geometry is placed relative to `gridOffset`, not random coordinates
- Sentiment shaders modulate the *existing* calibrated grid, not a blank canvas
- Spatial layouts (radial, tree, timeline) use the video layer position as their anchor origin

### Pipeline

```
Voice Input (Whisper / Web Speech API)
    ↓
LangGraph Orchestration (sentiment, complexity, spatial template)
    ↓
Tool Execution (create_spatial_element, configure_adaptive_shader, arrange_layout)
    ↓
ECS World (anchored to Phase 1 calibration)
    ↓
Three.js Render (90fps, sentiment uniforms at 30fps)
```

### Key dependencies

- `@langchain/langgraph` — workflow orchestration
- `langsmith` — tracing and educational effectiveness metrics
- Chatterbox TTS (server-side) — voice response
- `troika-three-text` — spatial subtitles

---

## Phase 3: Production Baseline (Future)

**Goal:** Multi-user shared sessions, live telemetry, and validated educational outcomes.

- **Session sharing** — Redis-backed checkpointer for distributed state
- **Telemetry** — Gaze tracking, interaction heatmaps, convergence accuracy
- **Educational validation** — A/B testing of spatial layouts against comprehension metrics

---

## Phase dependencies

| Phase | Consumes | Produces |
|---|---|---|
| 1 | Author's intent, headset input | `sessionConfig.json`, calibrated world-space |
| 2 | Voice input, LLM orchestration, **Phase 1 calibration** | Adaptive spatial UI, sentiment-responsive materials |
| 3 | Phase 1 + Phase 2 runtime data | Validated learning outcomes, shared baselines |

---

## Current status

- ✅ Quit/confirm/cancel flow (B → A/B)
- ✅ ECS-inspired state layer (`World`, `GridTransform`, `GridMovementSystem`)
- ✅ Thumbstick grid offset (world +Z, dual-stick averaging, smooth deceleration)
- ✅ `updateStationaryGroup` accepts persistent offset
- 🔄 Convergence snapshot & JSON persistence
- 🔄 Grid X/Y nudge tools
- ⏳ Phase 2 LLM pipeline integration
- ⏳ Phase 3 production telemetry
