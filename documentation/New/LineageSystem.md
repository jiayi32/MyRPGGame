Understood — that clarification actually **changes the system from “hybrid stacking” into a much cleaner directed evolution graph**, which is significantly better for readability, balance, and CT identity control.

I’ll correct the model and restate it precisely.

---

# 🔁 CORRECTED CROSS-LINEAGE SYSTEM (FINAL DEFINITION)

## ❌ What it is NOT

* Not simultaneous dual-lineage builds
* Not skill mixing across two full lineages
* Not permanent hybrid stat identity

---

## ✅ What it ACTUALLY IS

> Cross-lineage evolution is a **branching upgrade path** where a class can evolve into a *different but thematically adjacent lineage*, fully replacing its identity.

So:

```text
Umbra T3 → Umbra T2 → Rift T1 (new lineage identity)
```

NOT:

```text
Umbra + Rift hybrid class ❌
```

---

# 🧬 STRUCTURAL MODEL: LINEAGE EVOLUTION GRAPH

Each lineage is a **node in a directed evolution graph**, not a silo.

---

## 1. Evolution Rule (Core)

```ts id="ev1"
function evolveClass(currentClass, targetLineage) {

  assert(isAdjacent(currentClass.lineage, targetLineage));

  return new Class({
    lineage: targetLineage,
    tier: currentClass.tier - 1,
    inheritedTraits: partialCarryover()
  });
}
```

---

## 2. Key Constraint

Cross-lineage evolution:

* always moves **DOWN 1 tier on transition**
* requires **adjacency permission**
* preserves **combat role but changes system identity**

---

# 🌐 LINEAGE ADJACENCY SYSTEM

Instead of free evolution, we define a **lineage graph**.

Example structure:

```
            Chrono
           /     \
     Arcana       Rift
        |          |
     Umbra —— Nox —— Ignis
        |          |
      Beast —— Terra —— Aegis
           \     /
            Seraph
             |
           Solaris
```

---

## Meaning

Each lineage can only evolve into:

* adjacent nodes
* thematically compatible systems

---

# 🔁 CROSS-LINEAGE EVOLUTION RULESET

## 1. Unlock Condition

Cross-lineage evolution only unlocks when:

* player clears first campaign OR
* reaches T3+ mastery in lineage OR
* obtains “Evolution Catalyst” item

---

## 2. Evolution Behavior

When evolving:

```text
Current Class:
Umbra T2 (Void Assassin)

Evolves into:
Rift T1 (Dimensional Hunter)
```

---

## 3. What Carries Over

✔ Partial stat bias (30–50%)
✔ One passive trait (mutated form)
✔ Skill identity archetype (not exact skills)

---

## 4. What DOES NOT Carry Over

❌ Full skill kit
❌ CT identity mechanics (redefined per lineage)
❌ Passive stacking systems
❌ Class tier structure integrity

---

# ⚙️ DESIGN IMPACT (IMPORTANT)

This correction significantly improves your system:

---

## 1. Prevents Power Creep Explosion

No stacking hybrid monstrosities.

Each class remains:

> “one identity at a time”

---

## 2. Preserves CT System Clarity

CT mechanics remain:

* lineage-defined
* not multi-lineage blended

---

## 3. Makes Evolution Meaningful

Cross-lineage evolution becomes:

> “I am changing my build identity”

not:

> “I am adding more power layers”

---

## 4. Enables Roguelite Expression

Players can:

* pivot builds mid-progression
* adapt to drops
* respond to Run Director pressure

---

# 🧠 EXAMPLE EVOLUTION PATHS

---

## Example 1 — Assassin Path

```
Umbra T5 Shade Initiate
→ Umbra T3 Eclipse Stalker
→ Rift T2 Dimensional Hunter
→ Chrono T1 Timeline Disruptor
```

Identity shift:

* stealth → mobility → time manipulation

---

## Example 2 — Tank Path

```
Aegis T5 Shield Initiate
→ Terra T3 Mountain Sentinel
→ Seraph T2 Divine Ascendant
```

Identity shift:

* defense → endurance → scaling sustain tank

---

## Example 3 — Burst Path

```
Ignis T5 Ember Initiate
→ Umbra T3 Eclipse Stalker
→ Nox T1 Death Bloom Entity
```

Identity shift:

* fire burst → shadow burst → decay burst

---

# ⚠️ IMPORTANT DESIGN DECISION YOU NOW HAVE

This system forces a key philosophical choice:

---

## OPTION A — PURE LINEAGE IDENTITY (STRICT)

* evolution only within lineage
* cross-lineage is rare “prestige mutation only”

✔ simpler balance
❌ less replay creativity

---

## OPTION B — CONTROLLED CROSS EVOLUTION (RECOMMENDED)

* adjacency-based evolution graph
* limited directional transitions
* strong identity preservation per stage

✔ best roguelite expression
✔ supports CT diversity
✔ aligns with gear + Run Director system

---

# 🧾 FINAL CORRECTION SUMMARY

What we fixed:

* ❌ removed hybrid dual-lineage stacking
* ❌ removed simultaneous identity mixing
* ✅ replaced with directed evolution graph
* ✅ added adjacency constraints
* ✅ introduced identity-preserving transition rules

---

# CORE SYSTEM TRUTH (UPDATED)

> A player never “combines” lineages.
>
> They **travel through them.**

---

