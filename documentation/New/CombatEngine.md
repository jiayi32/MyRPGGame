> **⚠️ RECONCILIATION NOTE (2026-04-22):**  
> This document describes a **valid combat pattern** (server-authoritative tick processing with rollback) but is **NOT** the primary architecture for this project. See [INTEGRATION_REPORT.md](../INTEGRATION_REPORT.md) **§4 Combat Model** for the authoritative design: **outcome-only local deterministic combat** with server validation.  
> This document is retained as a teaching reference for CT queue mechanics, hit resolution, and skill costs. Code implementers should consult INTEGRATION_REPORT.md first.
>
> **Status:** Reference material. Code follows [../INTEGRATION_REPORT.md](../INTEGRATION_REPORT.md) §4 as primary authority.

---

Below is the **Full Combat Simulation Engine Specification** (reference teaching guide) for your CT-based roguelite RPG with:

* multiplayer raid encounters (future-proofed)
* deterministic CT queue combat
* server-authoritative simulation
* rollback-safe reconciliation
* React Native client architecture

This is the **final “this can actually be built” layer**.

---

# ⚔️ FULL COMBAT SIMULATION ENGINE SPEC (FCSE)

---

# 1. SYSTEM OVERVIEW

## Core Principle (Reference Pattern)

This section describes a **server-authoritative tick model** as an example architecture.
**However, the project's authoritative design uses outcome-only local deterministic combat** (see [INTEGRATION_REPORT.md](../INTEGRATION_REPORT.md) §4).

For reference, a server-authoritative model would use:
> The server is the *only source of truth* for combat state.
> The client is a deterministic prediction + input interface.

**Note:** This project's actual implementation is **outcome-only deterministic simulation on client**, with **server validation of stage outcomes only** (no per-tick round-trips, no per-tick state storage).

---

## Architecture Split

```text
CLIENT (React Native)
- UI rendering
- input capture
- prediction simulation (optional)
- animation timing
- local CT preview

SERVER (Authoritative Engine)
- full CT queue simulation
- damage resolution
- RNG execution
- skill validation
- raid synchronization
- rollback correction
```

---

# 2. HIGH-LEVEL COMBAT LOOP

---

## 2.1 Server Loop (Authoritative)

```ts id="srv_loop"
while (battleActive) {

  advanceCT();

  readyUnits = getUnitsWithCTZero();

  sortByPriority(readyUnits);

  for unit in readyUnits:
      action = resolveAction(unit);

      result = executeSkill(action);

      applyState(result);

  broadcastStateDelta();

}
```

---

## 2.2 Client Loop (Prediction Layer)

```ts id="cli_loop"
onCTUpdate(snapshot):
  simulateLocalCT()

onPlayerInput(skill):
  sendToServer(skill)

optimisticallyRender(skill)
```

---

# 3. CT SIMULATION ENGINE (CORE)

---

## 3.1 Deterministic CT Model

```ts id="ct_model"
type CTUnit = {
  id: string;
  ct: number;
  speed: number;
};
```

---

## 3.2 CT Tick Logic

```ts id="ct_tick"
function advanceCT(units):

  for u in units:
    u.ct -= calculateCTGain(u.speed, modifiers)

  return units
```

---

## 3.3 Action Execution Rule

```ts id="exec_rule"
if unit.ct <= 0:
    allowAction(unit)
    unit.ct = skill.CT_cost + speedDelay
```

---

## KEY DESIGN POINT

> CT is NOT cooldown.
> CT is a continuously evolving timeline system.

---

# 4. SERVER AUTHORITATIVE DESIGN

---

## 4.1 Why Server Authority is Mandatory

Because your system includes:

* RNG (D20 system)
* CT manipulation skills
* multiplayer raid scaling
* debuffs affecting turn order
* lineage-based modifiers

Client-side authority would break instantly under desync.

---

## 4.2 Server Responsibilities

Server handles:

* CT ordering
* skill validation
* damage computation
* RNG rolls
* boss AI decisions
* raid sync resolution

---

## 4.3 Client Responsibilities

Client handles:

* input intent only
* UI state
* animation playback
* predicted timeline (optional)

---

# 5. RAID MULTIPLAYER ARCHITECTURE

---

## 5.1 Raid Model

```ts id="raid1"
type RaidBattle = {
  players: Player[];
  boss: Boss;
  sharedCTQueue: CTUnit[];
};
```

---

## 5.2 Shared CT Queue (CRITICAL DESIGN)

All entities exist in ONE timeline:

```text
Player1
Player2
Player3
Boss
Minions
```

---

## RESULT

* true turn-based raid coordination
* no isolated “player turns”
* CT becomes a shared battlefield resource

---

# 6. INPUT SYNC MODEL

---

## 6.1 Action Submission

```ts id="input1"
POST /battle/action

{
  battleId,
  unitId,
  skillId,
  targetId
}
```

---

## 6.2 Server Validation

Server checks:

* CT readiness
* cooldown state
* resource availability
* skill legality
* target validity

---

## 6.3 Rejection Rules

If invalid:

```text
- action ignored
- client rolled back to server state
```

---

# 7. ROLLBACK + DESYNC HANDLING

---

## 7.1 Why rollback exists

Because:

* latency
* concurrent raid actions
* CT manipulation effects

---

## 7.2 Snapshot System

Server emits:

```ts id="snap"
BattleSnapshot {
  tick: number;
  units: CTUnit[];
  hpState: Record<id, HP>;
  buffs: BuffState[];
}
```

---

## 7.3 Client Correction Flow

```ts id="fix"
if (clientState.tick !== server.tick):
    replaceState(serverSnapshot)
    replayQueuedInputs()
```

---

## 7.4 Soft Correction Rule

Instead of hard reset:

* adjust CT positions smoothly
* correct HP delta visually
* re-sync timeline animation

---

# 8. RNG SYSTEM (D20 INTEGRATION)

---

## 8.1 Server-side RNG ONLY

```ts id="rng1"
function rollD20(seed):
  return deterministicRandom(seed)
```

---

## 8.2 Why deterministic RNG matters

Ensures:

* replayability
* anti-cheat
* raid fairness
* rollback consistency

---

# 9. BOSS AI SYSTEM

---

## 9.1 AI Decision Loop

```ts id="ai1"
function bossTurn(state):

  evaluateThreatLevels()

  chooseSkillBasedOn:

    - player CT position
    - burst potential
    - lineage dominance
    - survivability index

  executeSkill()
```

---

## 9.2 AI is NOT reactive randomness

It is:

> weighted CT-aware decision making

---

# 10. CLIENT PREDICTION ENGINE

---

## 10.1 Purpose

Avoid “laggy turn-based feel”

---

## 10.2 What client predicts

* CT countdown
* turn order
* skill animation outcome (visual only)
* damage preview ranges

---

## 10.3 What client NEVER decides

* final damage
* final CT ordering
* RNG outcomes

---

# 11. MULTIPLAYER RAID SYNCHRONIZATION

---

## 11.1 Sync Strategy

Hybrid model:

* server tick authority (primary)
* delta broadcasting (real-time updates)
* client interpolation

---

## 11.2 Broadcast Model

```ts id="broadcast"
emit({
  tick,
  CT_changes,
  HP_changes,
  action_results
})
```

---

## 12. PERFORMANCE STRATEGY (IMPORTANT)

---

## 12.1 Tick Compression

* batch CT updates
* compress state deltas
* avoid per-frame updates

---

## 12.2 Event-driven simulation

Instead of:

> "update every frame"

Use:

> "update on CT threshold crossing"

---

# 13. REACT NATIVE ARCHITECTURE

---

## 13.1 Folder Structure

```text id="arch"
src/
  combat/
    engine/
      CTQueue.ts
      SimulationLoop.ts
      RNG.ts
    client/
      PredictionEngine.ts
      BattleRenderer.ts
    net/
      BattleSocket.ts
      ActionSender.ts
    state/
      CombatStore.ts
```

---

## 13.2 State Management

Recommended:

* Zustand or Redux Toolkit
* server snapshot as single source override state

---

## 14. COMBAT STATE MODEL

---

```ts id="state1"
type CombatState = {
  tick: number;

  units: CTUnit[];

  buffs: Buff[];

  battleLog: Event[];

  pendingActions: PlayerAction[];
};
```

---

# 15. KEY DESIGN GUARANTEES

---

## ✔ No desync gameplay corruption

Server authority ensures integrity

---

## ✔ CT system is fully deterministic

No client manipulation possible

---

## ✔ Multiplayer raids are synchronized

Single shared timeline

---

## ✔ Skill system remains expressive

Because client only predicts, not decides

---

## ✔ Rollback is soft, not disruptive

Players never feel “teleport correction”

---

# FINAL SYSTEM SUMMARY

You now have a complete combat engine stack:

---

## 1. CT Simulation Core

* deterministic timeline engine

## 2. Skill System

* CT-costed action resolution

## 3. Server Authority Layer

* validation + RNG + truth state

## 4. Client Prediction Layer

* smooth UX + animation sync

## 5. Multiplayer Raid System

* shared CT timeline

## 6. Rollback System

* snapshot correction + replay

---

# FINAL DESIGN INSIGHT

> You are no longer building a “turn-based RPG”
>
> You are building a **distributed timeline simulation engine disguised as a game**

---

If you want next step, the correct progression is:

👉 **Boss AI Director System (how bosses dynamically adapt CT pressure, lineage counters, and raid coordination disruption)**
