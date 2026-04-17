# WEAPON DESIGN DOCUMENT Revision 1
Good—this is now a **power fantasy system by design**, not a tightly balanced one. That changes how we should design gear:

> We are no longer preventing power stacking — we are **shaping how it becomes fun and expressive**.

That means:

* Tier 5 gear = **build-defining, run-warping**
* Lower tiers = **scaffolding + enablers**
* Synergies = **intentional, not accidental**

I’ll structure this into:

1. **Tier 5 Lineage Gear Sets (12 sets, identity + synergy hooks)**
2. **Progression Scaling Model**
3. **Generic Gear (T1–T4)**
4. **Design Rationale (why this will actually be fun)**

---

# 🧬 1. TIER 5 LINEAGE GEAR SETS (ENDGAME BUILDS)

Each lineage gets:

* 1 Weapon
* 1 Armor
* 1 Core Passive Identity
* 1 Synergy Hook (how it scales into “broken”)

---

## 🔥 1. DRACONIC ASCENDANCY (Dragon lineage)

### Theme:

Scaling dominance, exponential ramp

---

### Weapon — *Worldbreaker Fang*

```ts
STR × 1.25
Damage increases by +5% per consecutive hit (stacks up to 10)
```

---

### Armor — *Molten Sovereign Plate*

```ts
Offensive Bias: +0.15
Defensive Bias: -0.1

On hit:
  gain "Heat" stack
Heat:
  +2% damage per stack
  decays slowly
```

---

### Synergy Hook:

> Momentum stacking → exponential scaling

---

### End State:

Becomes unstoppable if not interrupted

---

## ⚖️ 2. JUDICATOR LINEAGE (Libra)

### Theme:

Balance → punishment conversion

---

### Weapon — *Verdict Edge*

```ts
Deals bonus damage equal to:
difference between enemy ATK and DEF
```

---

### Armor — *Scales of Finality*

```ts
If HP > 70% → gain +25% DEF
If HP < 30% → gain +40% ATK
```

---

### Synergy Hook:

> State-based inversion → adaptive play

---

## 🦂 3. VENOM ASCENDANCY (Scorpion)

### Theme:

DOT amplification, inevitability

---

### Weapon — *Stinger of a Thousand Agonies*

```ts
Applies poison on hit

Poison stacks infinitely
```

---

### Armor — *Carapace of Decay*

```ts
Poison deals % max HP

Each stack increases duration
```

---

### Synergy Hook:

> Infinite scaling DOT

---

## 🐉 4. CELESTIAL SERPENT (Chinese Zodiac Snake/Dragon hybrid)

### Theme:

Cycle, rebirth, looping buffs

---

### Weapon — *Ouroboros Coil*

```ts
Every 5 turns:
reset cooldowns
```

---

### Armor — *Eternal Shedding Skin*

```ts
Upon reaching 0 HP:
revive at 30%
once per battle
```

---

### Synergy Hook:

> Loop resets → combo chaining

---

## 🐅 5. PRIMAL PREDATOR (Tiger)

### Theme:

Burst + kill chaining

---

### Weapon — *Fang of the Apex*

```ts
On kill:
gain +50% CT speed for 1 turn
```

---

### Armor — *Hunter’s Instinct*

```ts
Crits grant extra turn (low chance)
```

---

### Synergy Hook:

> Kill → accelerate → snowball

---

## 🐏 6. INFERNAL WARBREAKER (Replaces Ram Forger)

### Theme:

Self-damage → power

---

### Weapon — *Bloodforged Cleaver*

```ts
Spend HP to amplify damage
```

---

### Armor — *Pain Engine Core*

```ts
Lower HP → higher ATK
```

---

### Synergy Hook:

> Risk scaling → extreme burst

---

## 🐂 7. TITAN WARDEN (Ox)

### Theme:

Defense becomes offense

---

### Weapon — *Mountainbreaker*

```ts
Damage scales with DEF
```

---

### Armor — *Immutable Bastion*

```ts
Convert 30% DEF into shield every turn
```

---

### Synergy Hook:

> Tank → DPS conversion

---

## 🐇 8. LUNAR TRICKSTER (Rabbit)

### Theme:

Speed manipulation, CT abuse

---

### Weapon — *Phase Needle*

```ts
Low CT cost attacks
```

---

### Armor — *Moonstep Cloak*

```ts
Chance to skip enemy turn
```

---

### Synergy Hook:

> Turn denial → control dominance

---

## 🐎 9. STORM RIDER (Horse)

### Theme:

Momentum + speed scaling

---

### Weapon — *Thunderstride Lance*

```ts
Speed increases damage
```

---

### Armor — *Galestorm Harness*

```ts
Speed buffs stack infinitely (temporary)
```

---

### Synergy Hook:

> Speed → everything scaling

---

## 🐐 10. ORACLE OF FATE (Goat)

### Theme:

RNG manipulation

---

### Weapon — *Dice of Destiny*

```ts
Reroll damage once
```

---

### Armor — *Threads of Probability*

```ts
Improve all RNG rolls
```

---

### Synergy Hook:

> Control randomness → consistency

---

## 🐒 11. CHAOS SAVANT (Monkey)

### Theme:

Unpredictable high variance

---

### Weapon — *Trickster Catalyst*

```ts
Random effect on hit
```

---

### Armor — *Fractured Reality Mantle*

```ts
Random buffs/debuffs every turn
```

---

### Synergy Hook:

> High chaos → high ceiling

---

## 🐓 12. SOLAR EMPEROR (Rooster)

### Theme:

Scaling aura + team buff (future multiplayer ready)

---

### Weapon — *Dawnbringer Blade*

```ts
Damage increases per turn
```

---

### Armor — *Crown of Radiance*

```ts
Aura: increases all stats over time
```

---

### Synergy Hook:

> Time scaling → late-game dominance

---

# 📈 2. PROGRESSION SCALING MODEL

---

## Gear Scaling Formula

```ts
finalStat =
  (base + flat * upgradeLevel)
  * (1 + multiplier * upgradeLevelScaling)
```

---

## Passive Scaling

```ts
effectPower =
  baseEffect * (1 + upgradeLevel * 0.1)
```

---

## Unlock Pattern

```text
Level 1 → base stats
Level 5 → enhanced stats
Level 10 → new passive
Level 15 → synergy boost
```

---

# ⚙️ 3. GENERIC GEAR (T1–T4)

These are NOT boring fillers—they enable builds.

---

## T1 — FOUNDATION (Simple Identity)

Examples:

### Ironblade

```ts
+10 STR
```

### Scout Boots

```ts
+5 SPD
```

---

## T2 — SPECIALISATION

### Duelist Blade

```ts
Crit +10%
```

### Guardian Plate

```ts
+15 DEF
-5 SPD
```

---

## T3 — SYNERGY ENABLERS

### Blood Charm

```ts
Gain ATK when HP drops
```

### Mana Loop Ring

```ts
Restore MP on hit
```

---

## T4 — BUILD DEFINERS

### Timebreaker Pendant

```ts
Reduce CT by 5%
Gain bonus turn occasionally
```

---

### Executioner Axe

```ts
Damage doubles below 30% enemy HP
```

---

# 🎮 4. WHY THIS SYSTEM IS FUN (CRITICAL)

---

## 1. Every run tells a story

* early gear = direction
* mid gear = synergy
* late gear = transformation

---

## 2. Power spikes feel earned

Not:

> “+5% better”

But:

> “my build just unlocked”

---

## 3. Broken builds are allowed—but earned

You WANT:

* infinite poison
* infinite turns
* 1HP glass cannon nukes

---

## 4. Player agency is preserved

Because:

* skills = identity
* gear = expression

---

# 🧾 FINAL DESIGN TRUTH

This system works because:

> It is not trying to be fair.
> It is trying to be **interesting, expressive, and explosive**.

---

# WEAPON DESIGN DOCUMENT Revision 2

* Tier 5 gear must create **build identity (not just stats)**
* Lower tiers must create **build scaffolding (not noise)**

I will structure this in 3 layers:

---

# 🧱 0. DESIGN FRAME (IMPORTANT)

## Gear Tier Philosophy

| Tier | Role                              |
| ---- | --------------------------------- |
| T1   | Starter identity + small hooks    |
| T2   | Directional build shaping         |
| T3   | Synergy activation                |
| T4   | Build specialization              |
| T5   | Build-defining “rule breaker” set |

---

## Core Fun Rule (non-negotiable)

> Tier 5 gear does NOT just increase power — it changes **combat rules slightly**

Examples:

* CT rules change
* crit rules change
* skill interaction rules change
* damage conversion rules change

This is what makes runs feel “broken in a good way”.

---

# 🧬 1. 12 LINEAGE SYSTEM (FINAL ASSUMPTION SET)

Using **12 Zodiac Lineages** (clean + thematically consistent + supports evolution logic):

1. Rat – Trickster / CT manipulation
2. Ox – Tank / endurance / mitigation
3. Tiger – Burst DPS / aggression scaling
4. Rabbit – Evasion / speed / dodge loops
5. Dragon – Hybrid mythic scaling / transformation
6. Snake – Poison / debuff / control
7. Horse – Momentum / turn acceleration
8. Goat – Support / stat harmony (fixes “Ram issue”)
9. Monkey – Copy / adaptive skill usage
10. Rooster – Precision / crit / timing
11. Dog – Guard / protection / retaliation
12. Pig – Sustain / recovery / resource economy

---

# 🧩 2. TIER 5 GEAR SETS (LINEAGE DEFINING)

Each set = 3–4 items (Weapon / Armor / Accessory core structure)

Each includes:

* passive identity shift
* CT interaction hook
* synergy trigger
* tradeoff (mandatory)

---

# 🐀 RAT – “Temporal Hijacker Set”

### Identity: CT manipulation + turn theft

**Set Bonus Rule**

* First action each battle costs -25% CT
* If enemy acts twice consecutively → gain bonus turn fragment

### Gear Pieces

* **Weapon: Needle of Borrowed Time**

  * +CT steal on hit (small % enemy CT added to self)

* **Armor: Clockbreaker Coat**

  * Taking damage reduces your next skill CT

* **Accessory: Hourglass Fragment**

  * Every 3 turns: gain instant +1 action priority

### Synergy Hook

* Works with fast multi-hit skills → CT snowball loops

### Tradeoff

* Reduced raw DEF scaling (weak base tanking)

---

# 🐂 OX – “Immutable Bastion Set”

### Identity: damage negation stacking into retaliation

**Set Rule**

* Damage taken accumulates into “Stability Charge”
* At full charge → next attack becomes AoE counter

### Pieces

* Weapon: Anvil Hammer (scales with DEF)
* Armor: Stonehide Plate (flat DR stacking)
* Accessory: Root Sigil (prevents forced CT displacement)

### Synergy Hook

* Encourages “get hit → explode back” loop

### Tradeoff

* Slow CT baseline (intentional)

---

# 🐅 TIGER – “Predator Ascension Set”

### Identity: ramping burst DPS

**Set Rule**

* Each consecutive attack increases damage multiplier (resets on miss)

### Pieces

* Weapon: Fangblade (stacking STR ramp)
* Armor: Bloodstrip Vest (low DEF but high ATK scaling)
* Accessory: Kill Focus Lens (crit scaling per kill streak)

### Synergy Hook

* Strong in boss phases with predictable windows

### Tradeoff

* Extremely fragile if interrupted

---

# 🐇 RABBIT – “Phase Drift Set”

### Identity: evasion + CT skipping

**Set Rule**

* Successful dodge = reduce next CT cost to near-zero

### Pieces

* Weapon: Needle Dagger (evasion scaling)
* Armor: Windstep Cloak (CT reduction on dodge)
* Accessory: Slip Charm (first hit immunity per battle)

### Synergy Hook

* Encourages dodge chaining → near infinite mobility loops

### Tradeoff

* Low stability, weak vs accuracy bosses

---

# 🐉 DRAGON – “Mythic Convergence Set”

### Identity: hybrid scaling + transformation phases

**Set Rule**

* At 50% HP → enter Dragon State (stat multipliers shift)

### Pieces

* Weapon: Scalebreaker Blade (scales with ALL stats)
* Armor: Emberscale Core (adaptive resistances)
* Accessory: Heart of Wyrm (revive once per run)

### Synergy Hook

* Multi-build compatibility (STR/INT hybrid viable)

### Tradeoff

* Complex scaling = inconsistent early power

---

# 🐍 SNAKE – “Venom Law Set”

### Identity: debuff stacking + delayed kills

**Set Rule**

* Poison effects convert into “True Damage Burst” after delay

### Pieces

* Weapon: Venom Codex
* Armor: Serpent Mesh (DOT amplification)
* Accessory: Coil Sigil (debuffs extend CT cost)

### Synergy Hook

* Boss melting over time

### Tradeoff

* Weak immediate burst

---

# 🐎 HORSE – “Momentum Engine Set”

### Identity: turn acceleration

**Set Rule**

* Each action reduces next CT more than normal scaling

### Pieces

* Weapon: Charge Lance
* Armor: Trailrunner Harness
* Accessory: Momentum Core (bonus turn chance after kill)

### Synergy Hook

* CT loop builds → snowball system

### Tradeoff

* Loses efficiency if interrupted

---

# 🐐 GOAT – “Harmony Equilibrium Set”

### Identity: stat redistribution + team synergy

**Set Rule**

* Shares buffs between party (raid scaling)

### Pieces

* Weapon: Balanced Staff
* Armor: Equilibrium Robe
* Accessory: Unity Sigil (buff duplication at reduced potency)

### Synergy Hook

* Core raid support class enabler

### Tradeoff

* Lower personal damage ceiling

---

# 🐒 MONKEY – “Adaptive Mimic Set”

### Identity: skill replication

**Set Rule**

* Copies last enemy skill at reduced strength

### Pieces

* Weapon: Mirror Baton
* Armor: Adaptive Skinweave
* Accessory: Echo Core (skill replay chance)

### Synergy Hook

* High unpredictability builds

### Tradeoff

* Inconsistent output

---

# 🐓 ROOSTER – “Precision Execution Set”

### Identity: crit timing + execution thresholds

**Set Rule**

* Skills above threshold = guaranteed crit window

### Pieces

* Weapon: Dawnpiercer
* Armor: Timing Plate
* Accessory: Kill Bell (execute low HP enemies instantly)

### Synergy Hook

* Boss phase break specialist

### Tradeoff

* Weak sustained DPS

---

# 🐕 DOG – “Aegis Retribution Set”

### Identity: defense → counterattack loop

**Set Rule**

* Blocked damage becomes stored counter damage

### Pieces

* Weapon: Judgement Claw
* Armor: Guardian Frame
* Accessory: Loyalty Core (ally damage redirect)

### Synergy Hook

* Tank becomes DPS hybrid

### Tradeoff

* Requires being hit to scale

---

# 🐖 PIG – “Endless Resilience Set”

### Identity: sustain + resource loop

**Set Rule**

* HP regeneration converts into temporary shields

### Pieces

* Weapon: Feast Blade
* Armor: Glutton Shell
* Accessory: Overflow Charm (overheal → damage buff)

### Synergy Hook

* Infinite sustain builds

### Tradeoff

* Slow kill speed

---

# 📦 3. GENERIC GEAR SETS (T1–T4)

These are NOT identity-defining — they support builds.

---

## 🟤 T1 – BASELINE GEAR

* +Flat stats
* minor CT reduction (1–2%)
* no passives

Examples:

* Iron Sword (+5 STR)
* Leather Armor (+DEF)
* Copper Ring (+MP)

---

## 🟢 T2 – DIRECTIONAL GEAR

* introduces stat bias
* small passive

Examples:

* Steel Edge (STR + crit chance small)
* Scout Armor (DEX + CT slight reduction)
* Focus Amulet (INT + MP regen)

---

## 🔵 T3 – SYNERGY GEAR

* introduces triggers

Examples:

* Blood Edge (on hit → bleed chance)
* Arcane Loop (on skill cast → MP restore)
* Reflex Cloak (on dodge → CT reduction)

---

## 🟣 T4 – SPECIALIZATION GEAR

* strong multipliers
* conditional mechanics

Examples:

* Berserker Core (low HP → damage spike)
* Chrono Shard (CT manipulation rules)
* Void Sigil (damage bypass resistances)

---

# 🧠 4. SYSTEM-WIDE SYNERGY DESIGN RULES

---

## Rule 1: Identity stacking

* Class = skill identity
* Gear = mechanical modifier identity
* Lineage = scaling modifier identity

---

## Rule 2: One dominant loop per build

A good build should have:

* 1 CT loop OR
* 1 damage loop OR
* 1 sustain loop

NOT all three dominating simultaneously

---

## Rule 3: Tier 5 = rule breaker

Each Tier 5 set must:

* change combat timing OR
* change damage conversion OR
* change resource economy

---

# 🎯 FINAL DESIGN OUTCOME

This structure creates:

### ✔ Build archetypes that feel “broken but intentional”

### ✔ Replayability through lineage evolution

### ✔ Strong synergy discovery loop

### ✔ Controlled chaos (important for roguelite feel)

---

If you want next step, I would strongly recommend:

👉 designing **enemy/boss archetypes that specifically counter each lineage loop**

That’s what turns this from “strong system” into a *designed meta ecosystem*.
