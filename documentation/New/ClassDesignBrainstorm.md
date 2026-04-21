Context: Using AQW classes as inspiration is a great starting point, but you need to be careful about how you interpret and adapt their design patterns. AQW’s class system is built on a foundation of archetypes and mechanics that are reused across multiple classes, rather than each class being a completely unique kit. This means that while you can draw inspiration from AQW, you should focus on identifying the core design patterns they use and then translating those into your own system, rather than trying to create 60 entirely unique classes from scratch.

Context Continued: Each lineage being a mechanic twist on a core archetype is a smart approach. For example, you could have a "Burst DPS" archetype that exists across multiple lineages, but each lineage would have its own unique twist on how that burst damage is delivered (e.g., one might focus on high-risk, high-reward mechanics, while another might have more consistent but lower burst). This way, you can maintain a sense of identity for each class while also ensuring that they are balanced and manageable in terms of design complexity. This means that lineage mechanics should be interesting and unique to one lineage, but the archetype mechanics can be shared across lineages with different twists. This will help you create a cohesive and balanced class system that is still diverse and engaging for players.

Context Continued: Each class tier should build upon the previous one, adding new mechanics or enhancing existing ones to create a sense of progression and mastery. For example, a T1 class might have a simple burst damage mechanic, while a T5 class in the same archetype might have a more complex version of that mechanic that requires careful timing and resource management to maximize its effectiveness. This way, players can feel a sense of growth and development as they progress through the tiers, while still maintaining a clear identity for each class based on its lineage and archetype.

Context Continued: Class tier up evolutions are planned to be locked behind prestige. For example, prestige 1 unlocks T2, prestige 2 unlocks T3, and so on. This means that players will need to invest time and effort into progressing through the game to access higher-tier classes, which can help create a sense of accomplishment and encourage long-term engagement with the game. Additionally, this progression system can help balance the power of higher-tier classes by ensuring that players have a solid understanding of the game mechanics before they can access more complex and powerful classes. Overall, this approach can help create a rewarding and engaging experience for players as they work towards unlocking and mastering new classes.

Context Continued: Do not balance too hard, the payoff should be worth the time spend and grinding by the players. This means that T5 classes are considered the most powerful classes and should also feel as such for the platers. This does not mean that T1 classes should be weak, but rather that there should be a noticeable power difference between T1 and T5 classes to create a sense of progression and reward for players who invest time in unlocking higher-tier classes. Balancing the classes should focus on ensuring that each class is viable and fun to play, rather than trying to make every class equally powerful. This way, players can choose classes based on their preferred playstyle and feel a sense of accomplishment when they unlock and master higher-tier classes.

You’re directionally correct using AdventureQuest Worlds as inspiration—but there’s a critical misconception you need to drop before proceeding:

> AQW classes are **not 60 isolated kits** — they are **archetypal patterns reused and recombined** (DoT mage, sustain tank, burst rogue, support buffer, etc.), with identity coming from *mechanic twists*, not raw uniqueness.

If you try to brute-force 60 fully unique kits, you’ll create:

* balancing chaos
* cognitive overload
* design inconsistency

So I’m going to:

1. Extract the **actual class design patterns from AQW**
2. Translate them into **your CT-based system**
3. Then define a **structured 60-class blueprint system** (not random generation)
4. Provide **sample fully-designed classes per lineage**
5. Give you a **scalable framework to generate all 60 cleanly**

---

# 🔍 1. What AQW Actually Does (Reality vs Assumption)

From the class list and breakdowns (e.g. Necromancer, ArchPaladin, Void Highlord, etc.) ([AQW Wiki][1])

### Core Design Truth:

AQW classes are built from **5 repeating pillars**:

### 1. Damage Pattern

* Burst (e.g. Void Highlord)
* DoT (Necromancer)
* Ramp (Legion Revenant)
* Sustain DPS (Chaos Slayer)

### 2. Resource Engine

* Mana regen loops
* Self-damage → power
* Stack-based amplification
* Cooldown cycling

### 3. Survivability Model

* Lifesteal
* Dodge
* Shield
* Damage reduction

### 4. Utility Layer

* Buff allies
* Debuff enemies
* Control (stun, slow)

### 5. Scaling Mechanic (IMPORTANT)

* Stacks
* Timers
* Risk-reward loops
* Conditional triggers

---

# ⚠️ Critical Conflict With Your System

You are introducing:

* CT queue (time economy)
* D20 randomness
* Roguelite progression
* Gear multiplicative stacking
* Multi-class mixing

### Clash #1: AQW = Rotation System

### Your system = **Temporal Economy System (CT)**

👉 You cannot directly port AQW rotations.

You must convert:

```text
AQW Skill Rotation → CT Priority System
```

---

# 🧠 2. Translating AQW → Your CT System

### AQW Concept → Your System

| AQW Mechanic    | Your System Equivalent  |
| --------------- | ----------------------- |
| Cooldown        | CT cost                 |
| Mana regen loop | CT + MP hybrid          |
| Skill rotation  | Priority-based decision |
| Buff stacking   | Passive + battle buffs  |
| Burst window    | CT dump window          |
| DoT ticks       | Queue-triggered effects |

---

# 🧱 3. Clean 60-Class Design Framework (MANDATORY)

Instead of designing 60 manually, use:

## CLASS = (Lineage) × (Combat Archetype)

---

## 12 Lineages (you already defined)

Example:

* Dragon (renamed from Ram Forger → **Dracoforge** ✅ better)
* Phoenix
* Serpent
* Titan
* etc.

---

## 5 Tier = Complexity Layer

| Tier | Meaning             |
| ---- | ------------------- |
| T1   | Simple              |
| T2   | Adds mechanic       |
| T3   | Dual-mechanic       |
| T4   | High synergy        |
| T5   | Full system mastery |

---

## 5 Archetypes (derived from AQW)

Each lineage must cover these:

1. **Burst DPS**
2. **Sustain DPS**
3. **Tank**
4. **Support**
5. **Trickster/Utility**

---

👉 That gives:

```text
12 lineages × 5 tiers = 60 classes
BUT
Each tier corresponds to increasing mechanic depth of SAME archetype
```

---

# 🧬 4. Example Lineage Fully Designed (Dracoforge)

## 🔥 Lineage Identity:

* Power through scaling heat
* Risk-reward
* High burst windows

---

## T1 — Ember Initiate (Burst DPS - Simple)

### Passive

* Gain +5% damage per skill used consecutively (max 25%)

### Skills

1. Flame Slash

   * CT: 50
   * Basic damage

2. Ignite

   * CT: 70
   * Applies burn (DoT)

3. Heat Surge

   * CT: 80
   * Increase damage 15% for 2 turns

4. Overheat

   * CT: 100
   * Big damage, resets stacks

---

## T2 — Cinder Duelist (Adds Mechanic: Heat)

* Introduces **Heat Meter**

### Passive

* Heat increases damage but increases CT cost

---

## T3 — Infernal Warlord (Dual System)

* Heat + Lifesteal

---

## T4 — Dragonblood Tyrant

* Heat converts to **crit + armor pierce**

---

## T5 — Worldburn Sovereign

* Heat becomes **temporal manipulation (CT reduction)**

---

# ⚖️ 5. Design Rules (Derived from AQW)

These MUST be enforced:

---

## Rule 1: Every class must answer:

* How does it deal damage?
* How does it survive?
* What is its scaling loop?

---

## Rule 2: Every class must have a “core loop”

Example:

```text
Gain stacks → Spend stacks → Reset → Repeat
```

---

## Rule 3: CT Identity MUST differ

Bad design:

* All skills CT = 50–80

Good design:

* Fast class → low CT spam
* Burst class → high CT nukes
* Tank → low CT defensive cycling

---

## Rule 4: No “dead turns”

Because of CT system:

👉 Every class must:

* always have something useful to do
* even basic attack must matter

---

# ⚠️ 6. Key Design Conflicts You Must Resolve

## Conflict A — CT vs Skill Depth

AQW = 4 skills
You = 5 skills + CT

👉 Risk:

* Overcomplexity

**Decision needed:**

* Limit active decision complexity OR embrace hardcore system?

---

## Conflict B — Passive Explosion

You WANT:

> “player should feel overpowered”

👉 Danger:

* exponential scaling
* trivialised combat

**Mitigation:**

* soft counter via bosses (you already designed this ✔)

---

## Conflict C — Roguelite vs Permanent Progression

You have:

* permanent upgrades
* run-based upgrades
* class unlocks

👉 Risk:

* power creep destroys roguelite tension

---

## Conflict D — Gear vs Class Identity

You said:

> gear can override class identity

👉 This directly conflicts with:

> class defines playstyle

You are walking a tightrope.

---

# 🧠 7. Questions You MUST Answer Before Continuing

These are not optional—these are system-breaking if ignored:

---

### 1. CT Floor Problem

What is the **minimum CT cost allowed?**

* If 0 → infinite loop exploit
* If too high → slow gameplay

---

### 2. Turn Density

Target:

```text
Actions per minute per player = ?
```

This determines:

* pacing
* engagement
* animation budget

---

### 3. Stack Limits

Are stacks:

* capped?
* infinite?
* decay-based?

---

### 4. Damage Scaling Ceiling

With:

* gear multipliers
* passives
* buffs

👉 What prevents:

```text
damage → infinity
```

---

### 5. AI Complexity Budget

You proposed:

* alpha-beta minimax

👉 Reality check:

This is **too expensive for mobile real-time CT simulation**.

You need:

* heuristic-based AI, not full minimax

---

# 🧩 8. Recommendation (Blunt)

Your system is **very strong**, but currently:

> It is drifting toward “over-designed but unstable”.

To stabilise:

### DO THIS:

1. Lock class architecture (lineage × archetype)
2. Define CT economy boundaries
3. Simplify AI (drop minimax depth)
4. Cap multiplicative layers
5. Define pacing metrics

---

# 🚀 If you want next step

I can:

### Option A

Generate **ALL 60 classes fully defined (skills + passives)**
→ using this structured system (clean + scalable)

### Option B

Build **combat simulator logic** to test balance

### Option C

Design **CT economy model mathematically** (most important next step)

---

Right now, the smartest move is not more content.

It’s locking the **system constraints** before scaling to 60 classes.

[1]: https://aqwwiki.wikidot.com/classes?utm_source=chatgpt.com "Classes - AQW"


Below is the **full 60-class breakdown document** in an AQ-style class breakdown format, adapted to your **CT-based mobile RPG**. Every class is original, lineage-consistent, and built around a clear combat identity.

The rank structure is consistent across all classes:

* **Rank 1:** Basic Attack
* **Rank 2:** Passive
* **Rank 3:** Active Skill 1
* **Rank 4:** Passive
* **Rank 5:** Active Skill 2
* **Rank 6:** Passive
* **Rank 7:** Active Skill 3
* **Rank 8:** Passive
* **Rank 9:** Active Skill 4
* **Rank 10:** Capstone Passive

Unless noted otherwise, skills are **CT-costed**, with some classes also using **MP** or **HP** costs to reinforce identity.

---

# 60-Class Breakdown Document

# 1) Dracoforge Lineage

Theme: fire, horned charge, draconic wrath, frontline burst.

## T5 — Ashhorn Initiate

Role: basic melee bruiser. CT: fast. Resource: none.
Core loop: build heat, then spend it on one hard hit.

* **R1 Basic Attack — Horn Jab:** quick strike; small chance to inflict Burn.
* **R2 Passive — Kindle Horns:** basic attacks grant Heat stacks; Heat slightly boosts damage.
* **R3 Active — Ember Rush (CT 20):** charge forward and strike; bonus damage if Heat is active.
* **R4 Passive — Scorched Hide:** taking damage while above 50% HP grants a small shield.
* **R5 Active — Cinder Toss (CT 30):** throw burning shards; applies Burn over time.
* **R6 Passive — Heat Accumulation:** each Burn applied increases your next skill damage slightly.
* **R7 Active — Dragon Whelp Call (CT 40):** summon a flame whelp that assists with basic attacks.
* **R8 Passive — Ash Step:** after using a skill, gain a brief speed boost.
* **R9 Active — Draconic Snap (CT 50):** single-target bite/snap that consumes Heat for bonus damage.
* **R10 Passive — First Spark:** when entering battle, start with Heat stacks and faster initial CT.

## T4 — Cinderbreaker

Role: aggressive brawler. CT: fast-medium. Resource: HP or none.
Core loop: swing hard, convert aggression into shields and damage.

* **R1 Basic Attack — Ember Cleave:** wide slash with light splash.
* **R2 Passive — Furnace Blood:** damage dealt gradually builds a burn aura.
* **R3 Active — Breakpoint Charge (CT 25):** rush and stagger target; bonus if target is already burning.
* **R4 Passive — Ash Armor:** when hit, gain damage reduction for a short duration.
* **R5 Active — Molten Guard (CT 35):** form a molten barrier that retaliates on contact.
* **R6 Passive — Riot Heat:** skills used in sequence increase each other’s output.
* **R7 Active — Blackscale Sweep (CT 45):** spinning sweep that hits multiple enemies.
* **R8 Passive — Overheat:** reaching max Heat improves damage but slightly raises CT costs.
* **R9 Active — Crack the Shell (CT 55):** heavy strike that pierces defense and shields.
* **R10 Passive — Fracture Furnace:** when Molten Guard breaks, it explodes for area damage.

## T3 — Drakebound Vanguard

Role: frontline hybrid tank. CT: medium. Resource: MP.
Core loop: protect allies while building draconic offense.

* **R1 Basic Attack — Drake Lance:** lance thrust that marks target.
* **R2 Passive — Wingguard:** marked enemies deal slightly less damage to you.
* **R3 Active — Scaled Advance (CT 30):** move forward and gain armor.
* **R4 Passive — Dragon’s Resolve:** taking damage increases resistance briefly.
* **R5 Active — Hurling Tail (CT 40):** tail swing with knockback and armor shred.
* **R6 Passive — Stormblood:** damage taken contributes to your next skill power.
* **R7 Active — Breathline (CT 50):** line attack with fire breath.
* **R8 Passive — Aerial Ward:** after using Breathline, gain a shield.
* **R9 Active — War Drake (CT 60):** summon a war drake for a short assault.
* **R10 Passive — Oath of the Nest:** allies near you gain small damage reduction.

## T2 — Hornfire Reaver

Role: burst reaver. CT: medium-fast. Resource: HP.
Core loop: sacrifice health, gain tempo, delete a target.

* **R1 Basic Attack — Hornfire Slash:** flaming slash that costs no resource.
* **R2 Passive — Rage Embers:** low HP increases damage and crit.
* **R3 Active — Rift Charge (CT 25, HP cost):** charge a target for heavy damage.
* **R4 Passive — Burning Prowess:** repeated hits on same target deal more damage.
* **R5 Active — Clawwheel (CT 35):** circular flaming strike that hits nearby enemies.
* **R6 Passive — Smoldering Momentum:** every HP-cost skill lowers your next CT cost slightly.
* **R7 Active — Dragonfire Spear (CT 45):** pierce through one target and scorch those behind.
* **R8 Passive — Scorchborn:** burn effects you apply last longer.
* **R9 Active — Crownbreaker (CT 55):** execute-style strike against weakened foes.
* **R10 Passive — Reaver’s Ascendance:** after an execution, refresh a portion of your CT.

## T1 — Ember Crown Warden

Role: apex fire monarch. CT: slow. Resource: MP.
Core loop: control the battlefield with royal fire and rule-breaking burst.

* **R1 Basic Attack — Solar Hornblade:** radiant horn strike that ignites the target.
* **R2 Passive — Imperial Cinders:** fire damage scales from your total buffs.
* **R3 Active — Crown of Ash (CT 30):** create a royal flame aura that boosts your offense.
* **R4 Passive — Kingmaker:** whenever you apply Burn, your next ally action gains power.
* **R5 Active — Cathedral Flame (CT 45):** massive area burn that also weakens enemy defense.
* **R6 Passive — Burning Edict:** burned enemies take more damage from your skill chain.
* **R7 Active — Wyrm’s Judgment (CT 60):** judge a target with draconic fire; strong execute pressure.
* **R8 Passive — Throne of Heat:** while above a Heat threshold, you gain armor and damage.
* **R9 Active — Dragon Monarch (CT 70):** summon the crown-drake for a powerful assault sequence.
* **R10 Passive — Absolute Crown:** once per battle, your first kill refunds CT and boosts all stats briefly.

---

# 2) Bull Cathedral Lineage

Theme: sanctum, endurance, shield, ritual defense.

## T5 — Stone Oathbearer

Role: simple tank. CT: medium. Resource: none.
Core loop: stay planted, absorb, and retaliate.

* **R1 Basic Attack — Hammer Tap:** basic bash that slightly reduces enemy CT.
* **R2 Passive — Oathskin:** taking hits builds Oath stacks that increase defense.
* **R3 Active — Shelter Stance (CT 20):** assume a defensive stance, reducing damage taken.
* **R4 Passive — Granite Breath:** while in stance, regen a small amount of HP.
* **R5 Active — Sentinel Push (CT 30):** shove enemy back and draw attention.
* **R6 Passive — Stoneheart:** below half HP, shields become stronger.
* **R7 Active — Bell Guard (CT 40):** ring the cathedral bell; allies gain defense.
* **R8 Passive — Cathedral Weight:** your presence slightly reduces enemy speed.
* **R9 Active — Walling Blow (CT 50):** heavy hit that briefly taunts nearby enemies.
* **R10 Passive — First Oath:** at battle start, gain a shield and taunt resistance.

## T4 — Sanctum Brute

Role: heavy defense bruiser. CT: medium. Resource: MP.
Core loop: punish aggression while staying hard to move.

* **R1 Basic Attack — Basilica Smash:** heavy strike with armor-heavy scaling.
* **R2 Passive — Heavy Vow:** defense increases your damage output.
* **R3 Active — Sanctum Brace (CT 25):** brace and reduce incoming burst.
* **R4 Passive — Iron Prayer:** receiving damage builds prayer stacks that empower the next skill.
* **R5 Active — Crash Hymn (CT 35):** slam ground and deal area damage.
* **R6 Passive — Enduring Mass:** healing effects are stronger on you.
* **R7 Active — Relic Throw (CT 45):** hurl a relic that stuns on impact.
* **R8 Passive — Sainted Hide:** shields also grant brief damage reduction.
* **R9 Active — Shelterbreaker (CT 55):** break enemy guard and weaken their offense.
* **R10 Passive — Unmoving Hymn:** the longer you stand still, the more durable you become.

## T3 — Cathedral Bastion

Role: anchor tank/support. CT: medium-slow. Resource: MP.
Core loop: protect the team, then convert protection into pressure.

* **R1 Basic Attack — Pillar Bash:** basic melee with stagger chance.
* **R2 Passive — Mason’s Duty:** your shields last slightly longer.
* **R3 Active — Choir Shield (CT 30):** create a shield that spreads to nearby allies.
* **R4 Passive — Chiseled Faith:** repeated guarding increases defense.
* **R5 Active — Rampart Pulse (CT 40):** pulse a wave that reduces enemy attack.
* **R6 Passive — Fortified Chant:** skills used while shielded cost less CT.
* **R7 Active — Bell Tower (CT 50):** summon a tower that taunts and blocks line attacks.
* **R8 Passive — Blessed Stone:** healing you receive also heals nearby allies slightly.
* **R9 Active — Hold the Nave (CT 60):** massively reduce enemy movement and CT gain.
* **R10 Passive — Bastion Benediction:** whenever an ally is protected by your shield, you gain power.

## T2 — Aegis Minotaur

Role: control tank. CT: medium. Resource: HP.
Core loop: force positioning, then punish anything trapped.

* **R1 Basic Attack — Labyrinth Gore:** horn strike that slows.
* **R2 Passive — Minotaur Might:** defense scales from your current HP.
* **R3 Active — Maze Wall (CT 25):** create an earth wall that redirects enemy movement.
* **R4 Passive — Sacred Horns:** charging skills can interrupt enemy actions.
* **R5 Active — Charge of Refuge (CT 35):** slam forward and shield allies you pass.
* **R6 Passive — Stone Maze:** enemies slowed by you take extra damage from your team.
* **R7 Active — Sanctuary Stampede (CT 45):** rush enemies and create a safe zone behind you.
* **R8 Passive — Stubborn Grace:** when low HP, shields become more efficient.
* **R9 Active — Gate of Silence (CT 55):** block an area and suppress enemy skill usage.
* **R10 Passive — Mazeheart:** leaving a walled zone grants a burst of defense and CT reduction.

## T1 — Hierophant Colossus

Role: apex defense/authority. CT: slow. Resource: MP.
Core loop: turn defense into battlefield law.

* **R1 Basic Attack — Doctrine Slam:** grounded strike that scales with defense.
* **R2 Passive — Divine Mass:** your shields also increase your damage.
* **R3 Active — Colossus Aegis (CT 30):** grant massive shield to self and allies.
* **R4 Passive — Enduring Liturgy:** every shield you apply strengthens the next one.
* **R5 Active — Judgment Pillar (CT 45):** summon a stone pillar that damages and blocks.
* **R6 Passive — Immutable Faith:** control effects last shorter on you.
* **R7 Active — Mass Miracle (CT 60):** heal allies and cleanse one debuff.
* **R8 Passive — Unshaken Creed:** when enemies attack you, they lose some CT progress.
* **R9 Active — Cathedral Collapse (CT 70):** deliver a colossal strike with defense pierce.
* **R10 Passive — True Doctrine:** once per battle, your shields cannot be broken for a short time.

---

# 3) Twin Mirror Lineage

Theme: duplication, reflection, trickery, paired actions.

## T5 — Mirror Spark

Role: simple trickster. CT: fast. Resource: none.
Core loop: create echoes and use repeated timing.

* **R1 Basic Attack — Spark Flick:** basic ranged hit that can bounce once.
* **R2 Passive — Reflective Instinct:** first hit taken each battle is reduced.
* **R3 Active — Split Image (CT 20):** create a decoy that draws a hit.
* **R4 Passive — Prism Skin:** after taking damage, gain a small dodge boost.
* **R5 Active — Echo Dart (CT 30):** fire a dart that repeats a second time after delay.
* **R6 Passive — Self-Reflection:** echoed attacks deal slightly more damage.
* **R7 Active — Twin Flash (CT 40):** reposition and strike twice.
* **R8 Passive — Shard Veil:** decoys inherit some of your defensive stats.
* **R9 Active — Mirror Step (CT 50):** swap places with your echo or clone.
* **R10 Passive — First Reflection:** at battle start, create a free decoy.

## T4 — Splitblade Savant

Role: dual-weapon burst. CT: fast-medium. Resource: MP.
Core loop: alternate slashes to stack echo pressure.

* **R1 Basic Attack — Divide Cut:** a cut that splits into two hits.
* **R2 Passive — Twin Timing:** alternating skills increases damage.
* **R3 Active — Copystrike (CT 25):** repeat your last basic attack at reduced power.
* **R4 Passive — Refined Echo:** echoed attacks cost less CT.
* **R5 Active — Shatter Pattern (CT 35):** strike and shatter clones/illusions.
* **R6 Passive — Multiplying Focus:** each clone increases crit chance.
* **R7 Active — Split Horizon (CT 45):** attack two targets, then one of them again.
* **R8 Passive — Glass Footwork:** moving after using a skill gives dodge.
* **R9 Active — Dual Verdict (CT 55):** perform two finishing blows back-to-back.
* **R10 Passive — Perfect Split:** when alternating skills correctly, gain a free mini-turn.

## T3 — Double Glyph Adept

Role: spell duplicator. CT: medium. Resource: MP.
Core loop: cast once, get more than one result.

* **R1 Basic Attack — Sigil Tap:** light magic hit with a mark.
* **R2 Passive — Glyph Echo:** marks can be copied once.
* **R3 Active — Twin Sigils (CT 30):** place two glyphs that explode together.
* **R4 Passive — Arcane Reflection:** reflected magic deals more damage.
* **R5 Active — Mirror Rune (CT 40):** copy the last buff or debuff on the field.
* **R6 Passive — Stacked Script:** duplicate effects have extended duration.
* **R7 Active — Duplicate Seal (CT 50):** apply the same debuff to two targets.
* **R8 Passive — Prism Logic:** if one glyph triggers, the second triggers faster.
* **R9 Active — Rune Pairing (CT 60):** combine two active glyphs for a stronger effect.
* **R10 Passive — Second Meaning:** copied skills cost less MP.

## T2 — Refraction Oracle

Role: foresight support/control. CT: medium-slow. Resource: MP.
Core loop: predict, redirect, and punish choice.

* **R1 Basic Attack — Bend Light:** basic spell that weakens accuracy.
* **R2 Passive — Seen Twice:** you gain insight into the next enemy action.
* **R3 Active — Refraction Veil (CT 25):** distort targeting and reduce incoming hit chance.
* **R4 Passive — Oracle Lens:** buffs are more effective if applied after reading enemy CT.
* **R5 Active — False Path (CT 35):** create a decoy timeline that misleads enemies.
* **R6 Passive — Shimmer Memory:** repeated enemy skills become easier to predict.
* **R7 Active — Divided Fate (CT 45):** split one enemy’s damage into two weaker outcomes.
* **R8 Passive — Clear Prediction:** your first action after enemy movement is cheaper.
* **R9 Active — Prism Prophecy (CT 55):** reveal and punish the highest-threat target.
* **R10 Passive — Truth in Two:** when prediction is correct, gain bonus CT and crit.

## T1 — Eclipse Paragon

Role: apex mirror master. CT: slow. Resource: none.
Core loop: dominate through perfect duplication and contradiction.

* **R1 Basic Attack — Paragon Split:** strike that creates a mirror afterimage.
* **R2 Passive — Dark Mirror:** enemies mirror a portion of their own pressure.
* **R3 Active — Total Echo (CT 30):** replay your last active skill at full value.
* **R4 Passive — Eclipse Grace:** when an echo resolves, gain a shield.
* **R5 Active — Twin Apex (CT 45):** two powerful hits from alternate angles.
* **R6 Passive — Shattering Insight:** mirrored enemies take more damage from the second hit.
* **R7 Active — Mirror Dominion (CT 60):** take control of echo space and distort enemy turns.
* **R8 Passive — Black Prism:** reflected effects also apply a small debuff.
* **R9 Active — Final Reflection (CT 70):** copy the most dangerous enemy effect and turn it back.
* **R10 Passive — One Becomes Two:** once per battle, every skill you use can duplicate.

---

# 4) Tide Shell Lineage

Theme: moonlit defense, water rhythm, flow, safeguarding.

## T5 — Shellstep Warden

Role: simple evasive guardian. CT: fast. Resource: none.
Core loop: dodge, reposition, protect.

* **R1 Basic Attack — Shell Kick:** light strike that nudges the enemy.
* **R2 Passive — Tide Footing:** moving improves dodge briefly.
* **R3 Active — Shell Hop (CT 20):** leap and reduce incoming damage.
* **R4 Passive — Waterline Skin:** shields are slightly stronger on you.
* **R5 Active — Riptide Guard (CT 30):** guard an ally and absorb part of the hit.
* **R6 Passive — Fading Shore:** each dodge lowers your next CT cost.
* **R7 Active — Tidal Nudge (CT 40):** push an enemy’s CT backward slightly.
* **R8 Passive — Calm Shell:** after defending, gain a small regen.
* **R9 Active — Coastbreaker (CT 50):** fast strike that punishes overextended foes.
* **R10 Passive — First Tide:** start battle with bonus speed and a small shield.

## T4 — Tidebound Scout

Role: mobile pressure. CT: fast. Resource: MP.
Core loop: hit, slip, reposition.

* **R1 Basic Attack — Surf Knife:** quick blade strike.
* **R2 Passive — Wet Trail:** enemies struck by you become easier to track and punish.
* **R3 Active — Undertow Dash (CT 25):** dash through an enemy and leave a slowing wake.
* **R4 Passive — Salt Veil:** your first dodge each fight reduces CT.
* **R5 Active — Current Mark (CT 35):** mark a target and amplify follow-up damage.
* **R6 Passive — Foam Reflex:** getting hit may grant a small move/CT boost.
* **R7 Active — Breaker Hook (CT 45):** pull an enemy slightly and interrupt them.
* **R8 Passive — Moonwet:** your healing effects are stronger after dashing.
* **R9 Active — Swell Step (CT 55):** your next two actions become faster.
* **R10 Passive — Bound by Tide:** every movement action strengthens your next attack.

## T3 — Mooncurrent Defender

Role: defensive support. CT: medium. Resource: MP.
Core loop: protect, redirect, and heal in waves.

* **R1 Basic Attack — Crescent Shield:** shield bash that heals slightly.
* **R2 Passive — Lunar Tides:** your shields regenerate over time.
* **R3 Active — Current Ward (CT 30):** place a ward that reduces damage to allies.
* **R4 Passive — Moonlit Shell:** defensive actions also grant small crit resistance.
* **R5 Active — Undertow Pulse (CT 40):** pulse water that slows enemies.
* **R6 Passive — Silver Drift:** damage taken is reduced after using a support skill.
* **R7 Active — Shoreline Guard (CT 50):** block a lane and protect the backline.
* **R8 Passive — Reflecting Tide:** a portion of blocked damage returns as water damage.
* **R9 Active — Moonrise Stance (CT 60):** enter a stance that boosts allies’ defense.
* **R10 Passive — Defender’s Moon:** when an ally is threatened, you gain extra CT priority.

## T2 — Reef Sentinel

Role: barrier tank. CT: medium-slow. Resource: HP.
Core loop: create living barriers and outlast pressure.

* **R1 Basic Attack — Coral Bash:** solid strike with stun chance.
* **R2 Passive — Reef Armor:** your defense grows when you are shielded.
* **R3 Active — Living Barrier (CT 25):** summon a reef wall that blocks attacks.
* **R4 Passive — Tidebinding:** enemies slowed by you take more damage.
* **R5 Active — Breakwater (CT 35):** reduce incoming burst for the whole team.
* **R6 Passive — Salted Resolve:** taking repeated hits improves your shield efficiency.
* **R7 Active — Deep Reef Call (CT 45):** summon reef creatures for disruption.
* **R8 Passive — Pearl Guard:** healing creates a temporary shield.
* **R9 Active — Flood Gate (CT 55):** flood an area, pushing enemies and lowering CT.
* **R10 Passive — Reef Sanctuary:** allies near you slowly recover HP and MP.

## T1 — Leviathan Crest

Role: apex ocean guardian. CT: slow. Resource: none.
Core loop: control the battlefield through overwhelming tidal authority.

* **R1 Basic Attack — Crestbreaker:** crushing strike from the deep.
* **R2 Passive — Deepborn:** you gain resistance as battle length increases.
* **R3 Active — Leviathan Surge (CT 30):** erupt with tidal force and stagger enemies.
* **R4 Passive — Abyssal Shell:** large shields become stronger on you.
* **R5 Active — Ocean Gate (CT 45):** open a water gate that protects allies and slows enemies.
* **R6 Passive — Titan Current:** your support effects gain extra strength when you are low.
* **R7 Active — Tempest Maw (CT 60):** summon the maw of the deep for area pressure.
* **R8 Passive — Crest of the Deep:** your defense also improves your damage.
* **R9 Active — Worldwave (CT 70):** massive wave that repositions all enemies.
* **R10 Passive — Prime Leviathan:** once per battle, your first defeat trigger becomes a full recovery shield.

---

# 5) Sunfang Court Lineage

Theme: pride, light, royal aggression, noble burst.

## T5 — Dawncub Duelist

Role: simple aggressive duelist. CT: fast. Resource: none.
Core loop: move fast, hit first, keep pride stacks.

* **R1 Basic Attack — Sun Claw:** quick strike with light damage.
* **R2 Passive — Pride Heat:** attacking builds Pride for extra power.
* **R3 Active — Dawn Pounce (CT 20):** leap at target and gain speed.
* **R4 Passive — Lion Blood:** low HP increases crit chance.
* **R5 Active — Gleam Slash (CT 30):** bright slash that blinds briefly.
* **R6 Passive — Regal Reflex:** dodging grants damage on next attack.
* **R7 Active — Radiant Roar (CT 40):** short-range burst that weakens nearby enemies.
* **R8 Passive — Warm Mane:** battle buffs last slightly longer.
* **R9 Active — Pride Leap (CT 50):** heavy leap attack with bonus if you are buffed.
* **R10 Passive — First Sun:** battle start grants Pride and extra CT speed.

## T4 — Fanglight Heir

Role: fast burst fighter. CT: fast-medium. Resource: MP.
Core loop: inherit buffs, cash them into damage.

* **R1 Basic Attack — Heir Strike:** sword slash that marks the target.
* **R2 Passive — Bright Fang:** marked enemies take more damage from you.
* **R3 Active — Court Charge (CT 25):** charge to target and break their guard.
* **R4 Passive — Noble Ember:** buffs on you also increase your attack slightly.
* **R5 Active — Searing Line (CT 35):** draw a burning line across the field.
* **R6 Passive — Heirloom Guard:** when healed, gain a small shield.
* **R7 Active — Crowned Bite (CT 45):** execute-style bite/strike against wounded foes.
* **R8 Passive — Solar Poise:** while buffed, your CT costs are lower.
* **R9 Active — Royal Pounce (CT 55):** leap and strike twice.
* **R10 Passive — Heir of Dawn:** after an execution, gain a short damage boost.

## T3 — Solar Blade

Role: balanced radiant warrior. CT: medium. Resource: MP.
Core loop: buffer, slash, and punish debuffed targets.

* **R1 Basic Attack — Blade Sun:** light-infused sword strike.
* **R2 Passive — Solar Discipline:** skill use increases your next basic attack.
* **R3 Active — Dazzle Cut (CT 30):** slash that lowers enemy accuracy.
* **R4 Passive — Burning Grace:** buffs on you slightly heal you.
* **R5 Active — Crown Sweep (CT 40):** sweeping strike with radiant splash.
* **R6 Passive — Radiant Guard:** defense rises after using a light skill.
* **R7 Active — Noonfall (CT 50):** drop a solar strike that punishes grouped enemies.
* **R8 Passive — Golden Edge:** hitting a blinded target restores a bit of CT.
* **R9 Active — Oracle Slash (CT 60):** judgment-style hit with high success rate.
* **R10 Passive — Sunlit Edge:** once per battle, your first light skill costs no CT penalty.

## T2 — Lionheart Regent

Role: leadership support/bruiser. CT: medium-slow. Resource: MP.
Core loop: command allies, then convert team strength into personal value.

* **R1 Basic Attack — Regent Roar:** roar and strike; boosts ally morale.
* **R2 Passive — Throne Pulse:** allies gain minor stats when you act.
* **R3 Active — Court Aegis (CT 25):** shield allies around you.
* **R4 Passive — Heart of Gold:** healing effects on allies also benefit you slightly.
* **R5 Active — Pride Channel (CT 35):** channel court energy to amplify the team.
* **R6 Passive — Solar Command:** support skills lower your next CT.
* **R7 Active — Banner Pounce (CT 45):** leap to a target and inspire allies.
* **R8 Passive — Noble Ember:** your buffs also slightly burn enemies.
* **R9 Active — Decree of Fire (CT 55):** command a burst of fire from the court.
* **R10 Passive — Regal Heart:** once per battle, team buffs from you are doubled briefly.

## T1 — Solar Sovereign

Role: apex royal burst. CT: slow. Resource: none.
Core loop: dominate through authority, burst, and court-wide law.

* **R1 Basic Attack — Sovereign Sun:** overwhelming radiant strike.
* **R2 Passive — Imperial Bright:** all damage rises when you are fully buffed.
* **R3 Active — Crownfire (CT 30):** ignite a target with royal flame.
* **R4 Passive — Dominion of Light:** enemy debuffs last longer when applied by you.
* **R5 Active — Apex Radiance (CT 45):** brilliant explosion that hits all enemies.
* **R6 Passive — King’s Mercy:** healing effects on you also refresh a little CT.
* **R7 Active — Sun Throne (CT 60):** create a throne field that empowers allies.
* **R8 Passive — Blinding Law:** blinded enemies take more of your damage.
* **R9 Active — Final Coronation (CT 70):** powerful finisher against weakened enemies.
* **R10 Passive — Absolute Noon:** once per battle, your next 3 skills act at reduced CT.

---

# 6) Thorn Ledger Lineage

Theme: debt, rules, poison, punishment, execution through precision.

## T5 — Quill Cutter

Role: simple debuffer. CT: fast. Resource: none.
Core loop: write marks, cut, and collect damage.

* **R1 Basic Attack — Quill Jab:** small physical hit that writes a mark.
* **R2 Passive — Ink Discipline:** marked targets take slightly more damage.
* **R3 Active — Paper Cut (CT 20):** light strike that stacks bleed.
* **R4 Passive — Ledger Weight:** each bleed stack slightly slows the target.
* **R5 Active — Mark for Debt (CT 30):** mark a target to take extra damage from your next skill.
* **R6 Passive — Quiet Hand:** your first skill each battle costs less CT.
* **R7 Active — Slash of Records (CT 40):** quick multi-cut that refreshes debuffs.
* **R8 Passive — Dusty Clarity:** debuffs you apply become easier to maintain.
* **R9 Active — Receipt Wound (CT 50):** heavy cut that deals more damage per debuff.
* **R10 Passive — First Charge:** when a marked target dies, you gain a CT refund.

## T4 — Venom Scribe

Role: poison support. CT: medium. Resource: MP.
Core loop: apply toxins, then amplify them with records/marks.

* **R1 Basic Attack — Vile Script:** basic hit that adds a poison tick.
* **R2 Passive — Toxin Ink:** poison effects you apply last longer.
* **R3 Active — Written Poison (CT 25):** apply poison and reduce healing received.
* **R4 Passive — Scribe’s Veil:** while poisoned enemies are alive, you gain small defense.
* **R5 Active — Marginal Debt (CT 35):** mark target; each damage over time tick adds bonus damage.
* **R6 Passive — Rot Notes:** poison stacks can be refreshed instead of overwritten.
* **R7 Active — Annotated Strike (CT 45):** damage a target more if they have multiple debuffs.
* **R8 Passive — Foul Margin:** debuff-based damage scales from enemy max HP.
* **R9 Active — Last Edit (CT 55):** reroute part of an enemy’s healing into damage.
* **R10 Passive — Poisoned Record:** when poison kills, you gain a short MP surge.

## T3 — Verdict Thorn

Role: execution debuffer. CT: medium. Resource: none.
Core loop: punish mistakes, then execute through debuffs.

* **R1 Basic Attack — Verdict Pierce:** piercing stab that marks guilt.
* **R2 Passive — Judged Flesh:** marked targets take extra critical damage.
* **R3 Active — Thorn Sentence (CT 30):** strike that applies a heavy debuff.
* **R4 Passive — Acquittal Fade:** after dealing damage, gain a small evasive boost.
* **R5 Active — Punishing Note (CT 40):** enemies with debuffs take stronger damage.
* **R6 Passive — Bitter Balance:** your debuffs are harder to cleanse.
* **R7 Active — Sentence Bloom (CT 50):** poison-like burst from existing marks.
* **R8 Passive — Red Ink:** each debuff you apply adds a tiny CT discount to your next move.
* **R9 Active — Execution Line (CT 60):** finisher if enemy health is below threshold.
* **R10 Passive — Final Verdict:** when a marked enemy dies, another nearby enemy inherits a weak mark.

## T2 — Briar Arbiter

Role: control/punish. CT: medium-slow. Resource: MP.
Core loop: establish law, then let the briars enforce it.

* **R1 Basic Attack — Arbiter Lash:** lash that slows the target.
* **R2 Passive — Briar Law:** enemies slowed by you take more damage.
* **R3 Active — Fence of Guilt (CT 25):** create a barrier that limits enemy movement.
* **R4 Passive — Lawthorn:** your control effects last slightly longer.
* **R5 Active — Sentence Bloom (CT 35):** burst all debuffs into damage.
* **R6 Passive — Quieted Guilt:** controlled targets deal less damage.
* **R7 Active — Clause Breaker (CT 45):** strike that bypasses one defense layer.
* **R8 Passive — Bitter Standard:** debuffed enemies are easier to hit.
* **R9 Active — Tribunal Thorns (CT 55):** unleash thorn punishment across the field.
* **R10 Passive — Arbiter’s End:** once per battle, a debuffed target can be executed below a higher threshold.

## T1 — Seraphic Inquisitor

Role: apex judgment debuffer. CT: slow. Resource: MP.
Core loop: establish doctrine, then finish everything with punishment.

* **R1 Basic Attack — Inquisitor Brand:** holy thorn strike.
* **R2 Passive — Holy Penalty:** punished targets take increased damage from all sources.
* **R3 Active — Heaven’s Ruling (CT 30):** apply a powerful debuff to a target.
* **R4 Passive — Cleansing Thorn:** your debuffs resist cleansing.
* **R5 Active — Testament of Pain (CT 45):** burst all accumulated marks and toxins.
* **R6 Passive — Silent Prayer:** enemies struck by your judgment have reduced skill output.
* **R7 Active — Burning Doctrine (CT 60):** area judgment that damages and weakens.
* **R8 Passive — Unforgiven:** each execution lowers your next CT penalty.
* **R9 Active — Exile Seal (CT 70):** banish a target’s buffs and reduce its defenses.
* **R10 Passive — Last Confession:** once per battle, the first debuffed enemy to fall grants you a huge recovery surge.

---

# 7) Balance Reins Lineage

Theme: symmetry, paired power, measured tempo, equalized force.

## T5 — Reinbound Initiate

Role: simple balanced fighter. CT: fast. Resource: none.
Core loop: stay even, scale from symmetry.

* **R1 Basic Attack — Rein Tap:** small hit that grants balance stacks.
* **R2 Passive — Balanced Breath:** equal offense and defense improves your stats.
* **R3 Active — Twin Tug (CT 20):** pull enemy closer while shifting your CT slightly.
* **R4 Passive — Sure Hoof:** each balanced action improves your accuracy.
* **R5 Active — Equal Pace (CT 30):** normalize your CT gain and gain small buff.
* **R6 Passive — Calm Hands:** while buffs are balanced, you take less damage.
* **R7 Active — Tandem Clip (CT 40):** strike two targets in sequence.
* **R8 Passive — Steady Soul:** when you’re not overstacking one stat, your passives are stronger.
* **R9 Active — Matching Step (CT 50):** mirror an enemy’s speed increase briefly.
* **R10 Passive — First Balance:** battle start grants one of each stat: small attack, defense, and CT boost.

## T4 — Twinbridle Rider

Role: mobility support/brawler. CT: medium-fast. Resource: MP.
Core loop: momentum and paired action.

* **R1 Basic Attack — Dual Rein Cut:** paired blade strike.
* **R2 Passive — Pair Rhythm:** alternating skills increases damage and speed.
* **R3 Active — Bridled Charge (CT 25):** rush with force, then recoil into guard.
* **R4 Passive — Split Pace:** moving after acting slightly refunds CT.
* **R5 Active — Horse and Hand (CT 35):** buff ally and debuff enemy simultaneously.
* **R6 Passive — Joint Momentum:** if you act after an ally, your next skill is stronger.
* **R7 Active — Reined Volley (CT 45):** rapid strike sequence that scales with buffs.
* **R8 Passive — Two-Beat Guard:** every second hit against you is softened.
* **R9 Active — Synchronized Strike (CT 55):** coordinated blow that gets stronger if a party ally acted just before.
* **R10 Passive — Rider’s Measure:** balanced stat spread grants bonus CT stability.

## T3 — Equilibrium Marshal

Role: control/support. CT: medium. Resource: MP.
Core loop: regulate the battlefield and keep every side in balance.

* **R1 Basic Attack — Marshal Order:** basic strike that applies order stacks.
* **R2 Passive — Fair Weight:** your buffs are slightly more efficient on allies with lower stats.
* **R3 Active — Balance Law (CT 30):** equalize one ally’s and one enemy’s effective speed slightly.
* **R4 Passive — Centered Will:** you resist interruption.
* **R5 Active — Equalized March (CT 40):** grant the team a synchronized speed buff.
* **R6 Passive — Calm Decree:** your debuffs are harder to ignore.
* **R7 Active — Marshal’s Echo (CT 50):** repeat the previous support effect at reduced power.
* **R8 Passive — Harmonized Guard:** balanced teams gain defense and CT stability.
* **R9 Active — Measured Advance (CT 60):** direct your party to act with improved queue positioning.
* **R10 Passive — Neutral Crown:** once per battle, reduce the cost of the next three support skills.

## T2 — Harmony Lancer

Role: support lancer. CT: medium-slow. Resource: MP.
Core loop: unify allies, then pierce enemy advantage.

* **R1 Basic Attack — Lancer Tuning:** thrust that amplifies ally rhythm.
* **R2 Passive — Accord Pulse:** allies near you gain small buffs after your turn.
* **R3 Active — Peacepoint (CT 25):** place a point that reduces enemy aggression.
* **R4 Passive — Shared Rhythm:** buff duration is slightly extended for the party.
* **R5 Active — Resonant Thrust (CT 35):** pierce and apply a team buff.
* **R6 Passive — Equal Joy:** healing effects are stronger if the party’s HP is evened out.
* **R7 Active — Concordance Line (CT 45):** create a line effect that buffs allies crossing it.
* **R8 Passive — Resonant Step:** after using a support skill, your next attack is faster.
* **R9 Active — Accordance (CT 55):** copy your strongest ally buff onto yourself.
* **R10 Passive — Perfect Harmony:** the first time each battle that all allies are buffed, gain bonus CT.

## T1 — Concord Tribunal

Role: apex balance judge. CT: slow. Resource: none.
Core loop: enforce equilibrium and punish extremes.

* **R1 Basic Attack — Tribunal Spear:** precise strike that measures the target.
* **R2 Passive — Verdict of Two:** if two enemies differ in health by a lot, you hit harder.
* **R3 Active — Concord Chain (CT 30):** bind two units in shared outcome.
* **R4 Passive — Law of Balance:** your buffs become stronger when allies are weaker.
* **R5 Active — Twin Sentence (CT 45):** strike two enemies and equalize their pressure.
* **R6 Passive — Judged Together:** all your team buffs slightly affect the whole party.
* **R7 Active — Equalization Field (CT 60):** create a field that suppresses extremes.
* **R8 Passive — Measured Mercy:** damaged allies gain more from your healing.
* **R9 Active — Final Accord (CT 70):** deliver a finishing strike that benefits the whole team.
* **R10 Passive — Supreme Concord:** once per battle, your next four actions become cheaper if the party is balanced.

---

# 8) Black Nest Lineage

Theme: shadow, nesting, poison-feather execution, silent death.

## T5 — Nestling Shade

Role: simple stealth attacker. CT: fast. Resource: none.
Core loop: dip in, poison, leave.

* **R1 Basic Attack — Nest Peck:** small hit with bleed chance.
* **R2 Passive — Dark Feathers:** first hit from stealth deals more damage.
* **R3 Active — Shade Dip (CT 20):** vanish briefly and reappear with a strike.
* **R4 Passive — Tiny Talons:** repeated hits slightly increase crit.
* **R5 Active — Quiet Sting (CT 30):** poison strike that slows.
* **R6 Passive — Nest Warmth:** while hidden or buffed, you recover slightly faster.
* **R7 Active — Hollow Flight (CT 40):** reposition and avoid one incoming hit.
* **R8 Passive — Soft Silence:** your poison effects are harder to cleanse.
* **R9 Active — Night Peep (CT 50):** reveal enemy weakness and strike it.
* **R10 Passive — First Darkness:** battle start grants stealth-like protection.

## T4 — Razor Roost

Role: bleed pressure. CT: fast-medium. Resource: HP.
Core loop: nest, strike, and overwhelm with cuts.

* **R1 Basic Attack — Roost Slash:** sharp slash with bleed.
* **R2 Passive — Cutting Perch:** staying in the fight improves damage.
* **R3 Active — Talon Rain (CT 25):** raining slashes over multiple enemies.
* **R4 Passive — Blood Feathers:** enemies bleeding from you take more damage from future bleeds.
* **R5 Active — Nest Ambush (CT 35):** burst attack from hiding that deals bonus damage.
* **R6 Passive — Sharp Rest:** resting between fights strengthens your first skill.
* **R7 Active — Roost Break (CT 45):** shatter enemy guard and apply bleed.
* **R8 Passive — Hollow Crest:** bleeding targets deal less damage to the team.
* **R9 Active — Feather Flay (CT 55):** attack and spread bleeds across enemies.
* **R10 Passive — Roost Blade:** bleed kills refund part of your HP cost.

## T3 — Dusk Talon

Role: assassin/debuffer. CT: medium. Resource: MP.
Core loop: mark, cut, and execute under darkness.

* **R1 Basic Attack — Dusk Strike:** simple dark strike.
* **R2 Passive — Gloom Claw:** enemies with low HP are easier to crit.
* **R3 Active — Talon Split (CT 30):** split attack into two hits.
* **R4 Passive — Ash Wing:** moving after an attack lowers your CT.
* **R5 Active — Afterdark Hunt (CT 40):** mark a target and increase your damage to it.
* **R6 Passive — Hollow Hunger:** killing a marked target gives CT refund.
* **R7 Active — Silent Dive (CT 50):** dive strike with silence chance.
* **R8 Passive — Black Feather:** when you dodge, you gain a bit of damage.
* **R9 Active — Sunset Rend (CT 60):** execute a wounded target with precision.
* **R10 Passive — Night Talon:** first target marked each battle takes extra damage from all sources.

## T2 — Vesper Reaper

Role: executioner/poison hybrid. CT: medium-slow. Resource: MP.
Core loop: pressure health, then harvest.

* **R1 Basic Attack — Reaper Peck:** basic hit that causes a decay stack.
* **R2 Passive — Twilight Feed:** kills restore a small amount of HP and MP.
* **R3 Active — Mooncut (CT 25):** slash with a moon edge and apply decay.
* **R4 Passive — Vesper Veil:** low HP slightly increases dodge.
* **R5 Active — Death Roost (CT 35):** summon a roosting curse on a target.
* **R6 Passive — Plume of Dust:** your debuffs spread more easily.
* **R7 Active — Funeral Dive (CT 45):** dive with strong execute potential.
* **R8 Passive — Quiet Grave:** debuffed enemies hit by you suffer reduced healing.
* **R9 Active — Harvest Wing (CT 55):** reap all debuffed enemies for burst damage.
* **R10 Passive — Vesper End:** when your debuff kills, you gain a temporary damage spike.

## T1 — Night Eclipse

Role: apex assassin. CT: slow. Resource: none.
Core loop: disappear, overwhelm, and erase.

* **R1 Basic Attack — Eclipse Wing:** heavy shadow strike.
* **R2 Passive — Blackout Heart:** you start battle with stealth pressure.
* **R3 Active — Total Devour (CT 30):** damage and absorb a portion of the target’s HP.
* **R4 Passive — Shadow Funeral:** enemies under your debuffs lose speed.
* **R5 Active — Dread Nest (CT 45):** summon a darkness zone that punishes enemies.
* **R6 Passive — Hollow Soul:** you gain resistance while hidden or after executing.
* **R7 Active — Dusk Requiem (CT 60):** area shadow burst that weakens the field.
* **R8 Passive — Nocturne Cloak:** your first dodge each battle is free.
* **R9 Active — Final Feather (CT 70):** finishing strike against a target below threshold.
* **R10 Passive — Absolute Eclipse:** once per battle, your next three shadow skills act faster.

---

# 9) Arrow Creed Lineage

Theme: discipline, range, pursuit, oath, execution by precision.

## T5 — Pathshot Scout

Role: basic ranged fighter. CT: fast. Resource: none.
Core loop: mark targets and keep line pressure.

* **R1 Basic Attack — Path Shot:** ranged hit with tracking.
* **R2 Passive — Keen Eye:** your accuracy rises against marked targets.
* **R3 Active — Track Step (CT 20):** reposition and reveal weak enemies.
* **R4 Passive — Arrow Breeze:** moving after a shot increases speed.
* **R5 Active — Scout’s Mark (CT 30):** mark a target for follow-up damage.
* **R6 Passive — Light Quiver:** your first ranged attack each battle is stronger.
* **R7 Active — Trail Volley (CT 40):** shoot a spread of arrows.
* **R8 Passive — Map Sense:** you take less penalty from enemy stealth.
* **R9 Active — Follow Through (CT 50):** shoot through the first target and hit the backline.
* **R10 Passive — First Trail:** battle start grants a mark to the nearest enemy.

## T4 — Oath Archer

Role: disciplined burst. CT: fast-medium. Resource: MP.
Core loop: swear an oath, then cash it with a deadly shot.

* **R1 Basic Attack — Oath Arrow:** precision shot that marks.
* **R2 Passive — Promise Draw:** marked enemies are easier to crit.
* **R3 Active — True Shot (CT 25):** guaranteed-hit style shot with armor pierce.
* **R4 Passive — Creed Focus:** after standing still, your ranged damage increases.
* **R5 Active — Binding Volley (CT 35):** arrows that slow and bind.
* **R6 Passive — Mark of Service:** your marks last longer.
* **R7 Active — Restless Aim (CT 45):** fire a shot that gains power from CT waiting.
* **R8 Passive — Faithful Quiver:** skill casts lower your next CT slightly.
* **R9 Active — Oath Breaker (CT 55):** big execute shot against debuffed targets.
* **R10 Passive — Archer’s Promise:** the first enemy you mark each battle takes more damage from you.

## T3 — Creed Ranger

Role: sustained ranged pressure. CT: medium. Resource: MP.
Core loop: keep opponents in a line and never let them recover.

* **R1 Basic Attack — Ranger Shot:** basic bow shot with tracking.
* **R2 Passive — Creed Path:** movement and attack synergy.
* **R3 Active — Hawkeye (CT 30):** reveal target vulnerabilities and boost damage.
* **R4 Passive — Order of Range:** your attacks gain damage if you keep distance.
* **R5 Active — Long Pursuit (CT 40):** fire a shot that follows the target.
* **R6 Passive — Judge Wind:** crit chance rises after hitting from range.
* **R7 Active — Volley Line (CT 50):** set up a lane of arrows.
* **R8 Passive — Surefoot:** moving while ranged grants dodge.
* **R9 Active — Command Arrow (CT 60):** give an ally or summon a quick damage boost.
* **R10 Passive — Creedmaster:** marked targets become easier to finish.

## T2 — Longwatch Paladin

Role: ranged support/guard. CT: medium-slow. Resource: MP.
Core loop: hold position, protect allies, and fire judgment shots.

* **R1 Basic Attack — Watchlight:** light arrow that weakens a target.
* **R2 Passive — Vigil Pact:** allies near you gain small accuracy.
* **R3 Active — Longshot Blessing (CT 25):** bless an ally and improve their next skill.
* **R4 Passive — Sentinel String:** your shots can intercept weak projectiles.
* **R5 Active — Paladin Volley (CT 35):** multiple arrows that heal allies slightly on hit.
* **R6 Passive — Watchful Grace:** defending increases your damage a little.
* **R7 Active — Firm Aiming (CT 45):** next two shots gain heavy precision.
* **R8 Passive — Barrier Bolt:** firing from a protected state gives a shield.
* **R9 Active — Horizon Guard (CT 55):** cover allies with a long-range protective shot.
* **R10 Passive — Longwatch Oath:** your first support action each battle costs less CT.

## T1 — Horizon Judge

Role: apex ranged execution. CT: slow. Resource: none.
Core loop: judge from afar, then end the fight cleanly.

* **R1 Basic Attack — Horizon Verdict:** far-reaching shot with high accuracy.
* **R2 Passive — Far Sight:** you detect enemy threats earlier in the queue.
* **R3 Active — Judgment Arrow (CT 30):** powerful piercing shot.
* **R4 Passive — Endless Line:** ranged attacks can chain to secondary targets.
* **R5 Active — Distance Law (CT 45):** enemies farther away take more damage from you.
* **R6 Passive — Clear Sentence:** marks from you are harder to remove.
* **R7 Active — Apex Range (CT 60):** your next shot has critical pressure and pierce.
* **R8 Passive — Sky Splitter:** hitting a debuffed target reduces your CT penalty.
* **R9 Active — Final Line (CT 70):** lethal shot if the target is below threshold.
* **R10 Passive — Beyond the Horizon:** once per battle, one shot may ignore all defense layers.

---

# 10) Iron Covenant Lineage

Theme: sacrifice, corruption, greed, forged power, brutal authority.

## T5 — Forgebound Acolyte

Role: basic risk-reward fighter. CT: medium. Resource: MP.
Core loop: pay a little, gain a lot.

* **R1 Basic Attack — Forge Tap:** basic strike that builds Heat.
* **R2 Passive — Iron Prayer:** taking damage slightly increases power.
* **R3 Active — Bound Smithing (CT 20):** temper yourself or an ally for a stat buff.
* **R4 Passive — Heat Debt:** the stronger your buffs, the more CT they cost.
* **R5 Active — Oath Spark (CT 30):** strike with a fiery pact.
* **R6 Passive — Metal Hunger:** gear effects are stronger on you.
* **R7 Active — Covenant Hammer (CT 40):** heavy hammer blow with stun chance.
* **R8 Passive — Quench Blood:** low HP makes your shields stronger.
* **R9 Active — Nail of Vows (CT 50):** pin an enemy in place and mark it.
* **R10 Passive — First Pact:** battle start grants a minor self-buff.

## T4 — Brass Revenant

Role: undead bruiser. CT: medium. Resource: none.
Core loop: die a little, come back stronger.

* **R1 Basic Attack — Brass Cut:** sharp strike with decay.
* **R2 Passive — Dead Metal:** healing received converts partly to armor.
* **R3 Active — Revenant Clamp (CT 25):** clamp the target and reduce their CT gain.
* **R4 Passive — Old Oath:** repeated damage makes you harder to kill.
* **R5 Active — Gilded Return (CT 35):** recover a chunk of lost HP and counterattack.
* **R6 Passive — Rusted Memory:** taking a debuff grants damage reduction.
* **R7 Active — Brass Pulse (CT 45):** pulse that weakens enemy offense.
* **R8 Passive — Vaulted Soul:** if you survive a lethal hit, gain a shield.
* **R9 Active — Echo Forge (CT 55):** repeat your last active skill at reduced cost.
* **R10 Passive — Revenant Crown:** surviving with low HP boosts all damage briefly.

## T3 — Oathbreaker

Role: high-risk bruiser. CT: medium-fast. Resource: HP.
Core loop: break rules, gain power from the break.

* **R1 Basic Attack — Broken Vow:** strike that inflicts corruption.
* **R2 Passive — Shattered Intent:** when a buff ends, you gain power.
* **R3 Active — Covenant Slash (CT 30):** attack that deals more damage if you are under a debuff.
* **R4 Passive — Debt Mark:** enemies you hit become easier to execute.
* **R5 Active — Betrayer’s Heat (CT 40):** sacrifice HP for a major damage spike.
* **R6 Passive — Hard Reminder:** HP-cost skills also improve your next defense.
* **R7 Active — Contract Burn (CT 50):** burn enemies and amplify their damage taken.
* **R8 Passive — Lapsed Faith:** if an enemy debuff is cleansed, you regain CT.
* **R9 Active — Last Amendment (CT 60):** rewrite your stats temporarily toward offense.
* **R10 Passive — Oath Ruin:** once per battle, a self-sacrifice skill refunds a portion of HP.

## T2 — Iron Devil

Role: corrupting bruiser. CT: medium-slow. Resource: HP.
Core loop: spend HP, gain domination, close the fight.

* **R1 Basic Attack — Hell Nail:** crude strike with armor break.
* **R2 Passive — Tempting Armor:** gear bonuses are amplified while in low HP.
* **R3 Active — Cinder Contract (CT 25):** trade HP for a heavy buff.
* **R4 Passive — Chain of Greed:** every buff you gain slightly raises your attack.
* **R5 Active — Hellforge Kick (CT 35):** kick an enemy and stun if corrupted.
* **R6 Passive — Cruel Temper:** enemies below half HP take more damage from you.
* **R7 Active — Devil’s Bargain (CT 45):** accept a debuff to gain a strong offensive boost.
* **R8 Passive — Gilded Sin:** your buffs also strengthen your next basic attack.
* **R9 Active — False Crown (CT 55):** seize enemy morale and lower their damage.
* **R10 Passive — Iron Temptation:** the first time each battle you drop low, gain a huge power surge.

## T1 — Covenant Tyrant

Role: apex authority bruiser. CT: slow. Resource: none.
Core loop: command through corruption and overwhelming power.

* **R1 Basic Attack — Tyrant Brand:** brutal strike that marks the target.
* **R2 Passive — Dominion Debt:** marked enemies become easier to control.
* **R3 Active — Absolute Contract (CT 30):** impose a deadly contract on a target.
* **R4 Passive — Unyielding Forge:** buffs on you are harder to remove.
* **R5 Active — Crown of Chains (CT 45):** bind several enemies and lower their power.
* **R6 Passive — Greed Ascendant:** each kill increases your offensive ceiling.
* **R7 Active — Iron Verdict (CT 60):** judgment strike with extreme break power.
* **R8 Passive — Ruthless Standard:** your damage rises against controlled enemies.
* **R9 Active — Final Clause (CT 70):** execute an enemy under contract.
* **R10 Passive — Total Tyranny:** once per battle, your next three actions ignore part of enemy defense.

---

# 11) Star Circuit Lineage

Theme: signals, logic, voltage, pattern control, systems mastery.

## T5 — Spark Node

Role: basic utility caster. CT: fast. Resource: MP.
Core loop: build charge, then redirect it.

* **R1 Basic Attack — Node Spark:** basic electric hit.
* **R2 Passive — Charged Logic:** repeated use builds voltage.
* **R3 Active — Pulse Relay (CT 20):** send a short burst through an enemy.
* **R4 Passive — Tiny Circuit:** your first buff each battle is stronger.
* **R5 Active — Signal Bolt (CT 30):** precise lightning hit with accuracy bonus.
* **R6 Passive — Quick Current:** electric attacks slightly lower CT costs.
* **R7 Active — Branch Flash (CT 40):** lightning arcs to nearby enemies.
* **R8 Passive — Wired Mind:** each successful hit increases skill reliability.
* **R9 Active — Spark Loop (CT 50):** repeat an electric strike on the same target.
* **R10 Passive — First Circuit:** battle start grants a charge stack and bonus MP.

## T4 — Circuit Adept

Role: control caster. CT: medium. Resource: MP.
Core loop: build and discharge patterns.

* **R1 Basic Attack — Adept Arc:** electric arc hit.
* **R2 Passive — Wired Pattern:** repeated patterns improve damage and CT efficiency.
* **R3 Active — Relay Surge (CT 25):** redirect electricity between targets.
* **R4 Passive — Precision Flow:** after a spell lands, your next spell is more accurate.
* **R5 Active — Branching Voltage (CT 35):** choose one of two electric outcomes.
* **R6 Passive — Conductive Soul:** shocks you apply last longer.
* **R7 Active — Loop Cutter (CT 45):** interrupt a target’s chain of actions.
* **R8 Passive — Stored Charge:** if you wait, your next skill is stronger.
* **R9 Active — Rapid Sync (CT 55):** synchronize ally actions for CT efficiency.
* **R10 Passive — Circuit Mind:** once per battle, a spell can be cast at reduced CT.

## T3 — Star Tuner

Role: tempo support. CT: medium. Resource: MP.
Core loop: tune the battlefield to your rhythm.

* **R1 Basic Attack — Tune Star:** small electric attack.
* **R2 Passive — Guiding Light:** allies gain minor CT help after you act.
* **R3 Active — Frequency Shift (CT 30):** alter an enemy’s timing and slow them.
* **R4 Passive — Sync Path:** your buffs align better with ally turns.
* **R5 Active — Cosmic Pulse (CT 40):** pulse the field and amplify ally damage.
* **R6 Passive — Calibration:** your skills become more efficient when used in order.
* **R7 Active — Phase Tune (CT 50):** reduce a chosen ally’s next CT cost.
* **R8 Passive — Bright Timing:** well-timed hits improve critical chance.
* **R9 Active — Feedback Loop (CT 60):** repeat a prior support effect.
* **R10 Passive — Star Alignment:** when allies act in sequence, they gain a bonus.

## T2 — Flux Savant

Role: adaptive tempo manipulator. CT: medium-fast. Resource: none.
Core loop: swing with changing conditions and ride the volatility.

* **R1 Basic Attack — Flux Needle:** fast strike with electrical shift.
* **R2 Passive — Fast Change:** switching targets empowers your next action.
* **R3 Active — Current Bend (CT 25):** bend the battle flow and alter CT slightly.
* **R4 Passive — Variable State:** your stats adapt a little to the enemy’s strongest stat.
* **R5 Active — Overclock (CT 35):** greatly boost speed but increase incoming CT cost later.
* **R6 Passive — Drift Control:** you resist slow effects better.
* **R7 Active — Unstable Genius (CT 45):** powerful randomized effect based on current state.
* **R8 Passive — Flux Guard:** volatility slightly increases your defense.
* **R9 Active — Oscillation (CT 55):** toggle between offense and defense modes.
* **R10 Passive — Savant Overflow:** once per battle, your next three actions receive a small random bonus.

## T1 — Astral Architect

Role: apex systems caster. CT: slow. Resource: MP.
Core loop: redesign the battlefield and force your system on it.

* **R1 Basic Attack — Astral Draft:** precise magical strike.
* **R2 Passive — Celestial Blueprint:** your buffs grant more if applied in planned order.
* **R3 Active — Orbit Command (CT 30):** command a target to move through a fixed orbit pattern.
* **R4 Passive — Pattern of Stars:** repeating the same sequence increases output.
* **R5 Active — Worldline Diagram (CT 45):** preview and modify the next CT sequence slightly.
* **R6 Passive — Cosmic Build:** your scaling improves as battle length increases.
* **R7 Active — Blueprint Collapse (CT 60):** detonate your planned pattern for burst damage.
* **R8 Passive — Prime Signal:** the first successful control skill each battle gains bonus duration.
* **R9 Active — Final Theory (CT 70):** a large, high-impact spell that rewrites resistances briefly.
* **R10 Passive — True Design:** once per battle, one skill may ignore its usual CT penalty.

---

# 12) Dream Ocean Lineage

Theme: moon, sleep, healing, serenity, dream-state control.

## T5 — Tide Dreamer

Role: basic support. CT: fast. Resource: MP.
Core loop: soften the battlefield and sustain allies.

* **R1 Basic Attack — Dream Ripple:** light water strike that heals a little.
* **R2 Passive — Soft Wake:** healing makes your next support skill stronger.
* **R3 Active — Sleepcurrent (CT 20):** lull enemies, slightly lowering their damage.
* **R4 Passive — Misty Pulse:** support skills grant tiny shields.
* **R5 Active — Drowsy Wave (CT 30):** wave that slows enemies and heals allies.
* **R6 Passive — Sea Breath:** MP recovery is slightly higher on you.
* **R7 Active — Slumber Drift (CT 40):** induce sleepiness, causing enemy CT delay.
* **R8 Passive — Calm Tides:** the lower your party HP, the stronger your healing becomes.
* **R9 Active — Gentle Surge (CT 50):** restore HP and remove one minor debuff.
* **R10 Passive — First Dream:** battle start grants a small regen aura.

## T4 — Moonwake Mystic

Role: heal/control hybrid. CT: medium. Resource: MP.
Core loop: maintain serenity while bending enemy rhythm.

* **R1 Basic Attack — Moonwake Spark:** water-light hit.
* **R2 Passive — Lunar Comfort:** heals also slightly reduce enemy aggression.
* **R3 Active — Dream Tether (CT 25):** link an ally and share healing efficiency.
* **R4 Passive — Moonlit Hum:** buffs on allies last a little longer.
* **R5 Active — Wakeful Mist (CT 35):** mist that reduces enemy accuracy.
* **R6 Passive — Silver Sleep:** sleeping enemies take more damage when awakened.
* **R7 Active — Tidal Hymn (CT 45):** song that heals over time and steadies CT.
* **R8 Passive — Star Water:** healing above full HP converts to shields.
* **R9 Active — Night Lullaby (CT 55):** lull enemies and slow their next action.
* **R10 Passive — Moonwake:** once per battle, your first healing skill is amplified.

## T3 — Veil Shepherd

Role: sustain controller. CT: medium. Resource: none.
Core loop: keep allies calm and lead enemies into weakness.

* **R1 Basic Attack — Veil Touch:** soft hit that weakens.
* **R2 Passive — Dream Herd:** allies near you gain minor regen.
* **R3 Active — Mist Guard (CT 30):** place a mist barrier that reduces damage.
* **R4 Passive — Gentle Veil:** control effects on allies are shorter.
* **R5 Active — Sheaf of Sleep (CT 40):** place enemies into a drowsy state.
* **R6 Passive — Soft Boundary:** your shields also boost recovery.
* **R7 Active — Hushed Current (CT 50):** lower enemy CT through calming pressure.
* **R8 Passive — Shelter Tide:** healing skills gain small defense scaling.
* **R9 Active — Shepherd’s Echo (CT 60):** repeat your last heal or control skill.
* **R10 Passive — Veilborn:** the first time each battle an ally drops low, they receive a safety shield.

## T2 — Current Oracle

Role: predictive healer/control. CT: medium-slow. Resource: MP.
Core loop: foresee damage, then counter it with oceans of calm.

* **R1 Basic Attack — Current Eye:** soft strike that reveals danger.
* **R2 Passive — Prophetic Drift:** you see a bit more of the next enemy CT shift.
* **R3 Active — Surf Reading (CT 25):** predict incoming damage and reduce it.
* **R4 Passive — Tide Map:** your healing is stronger on low-HP allies.
* **R5 Active — Forecast Seal (CT 35):** seal an area with future healing.
* **R6 Passive — Ripple Truth:** your debuffs are easier to time correctly.
* **R7 Active — Dream Current (CT 45):** shift ally CT slightly toward safety.
* **R8 Passive — Deep Insight:** the first targeted skill against you each battle is softened.
* **R9 Active — Ocean Sign (CT 55):** release a vision pulse that weakens enemy burst.
* **R10 Passive — Oracle Flow:** if you correctly predict enemy intent, your next support skill is cheaper.

## T1 — Ocean Eclipse

Role: apex dream-state controller. CT: slow. Resource: none.
Core loop: calm the sea, then end the battle through overwhelming serenity.

* **R1 Basic Attack — Eclipse Wave:** heavy water strike that slows.
* **R2 Passive — Abyssal Calm:** you and allies resist panic effects.
* **R3 Active — Lunar Abyss (CT 30):** create a deep sleep field.
* **R4 Passive — Deep Reversal:** healing overflow becomes shields.
* **R5 Active — Final Tide (CT 45):** a sweeping wave that heals allies and weakens enemies.
* **R6 Passive — Black Water:** your control effects last longer on targets already damaged.
* **R7 Active — Horizon Sink (CT 60):** drag enemies into reduced CT gain.
* **R8 Passive — World Sleep:** when allies are near defeat, your healing rises sharply.
* **R9 Active — Last Moon (CT 70):** powerful recovery and debuff cleanse for the party.
* **R10 Passive — Total Eclipse:** once per battle, all support skills cost less CT for a short window.

---

# Closing note

This gives you a complete **60-class playable breakdown** with:

* lineage identity,
* tiered progression,
* 4 actives,
* rank-based passives,
* CT-driven combat roles,
* and unique mechanics per class.

The next clean step is to convert this into a **data-first TypeScript schema** or a **Firestore-ready class JSON set** so it can be loaded directly into the game.


# 60-Class Breakdown Document
## CT-Roguelite RPG Class Design Reference

This document defines **60 unique classes** across **12 lineages** and **5 tiers per lineage**.

Format for each class:
- **Role / CT profile / Resource**
- **Rank 1 basic attack**
- **Rank 2 passive**
- **Rank 3 active**
- **Rank 4 passive**
- **Rank 5 active**
- **Rank 6 passive**
- **Rank 7 active**
- **Rank 8 passive**
- **Rank 9 active**
- **Rank 10 capstone passive**
- **Evolution note**

Tier meaning:
- **T1** = simplest / most basic
- **T2** = adds one key mechanic
- **T3** = established identity
- **T4** = advanced specialist
- **T5** = strongest / most complex

---

# 1) Drakehorn Forge
Theme: charge, draconic fire, aggression, momentum, break-through power.

## 1. Ashhorn Initiate (T1)
Role: burst starter | CT: fast | Resource: none
- **R1 Basic — Ashlash:** quick horn-blade strike; applies 1 Heat on hit.
- **R2 Passive — Cinder Discipline:** first skill each battle costs -10 CT.
- **R3 Active — Spark Charge:** dash strike; bonus damage if target is Burning.
- **R4 Passive — Furnace Skin:** above 70% HP, gain light armor.
- **R5 Active — Ember Volley:** 3-hit line attack; extends Burn duration.
- **R6 Passive — Kindling:** Burning enemies take extra crit damage from you.
- **R7 Active — Drakeflare:** cone flame attack; consumes Heat for bonus damage.
- **R8 Passive — Ashguard:** kill a Burning target to gain a shield.
- **R9 Active — Crownbrand:** single-target finisher; stronger below 35% HP.
- **R10 Passive — Oath of the Forge:** after Drakeflare or Crownbrand, next basic is free.
- **Evolution:** into Cinderbreaker.

## 2. Cinderbreaker (T2)
Role: pressure striker | CT: fast-medium | Resource: Heat
- **R1 Basic — Ember Tap:** light strike that builds 2 Heat.
- **R2 Passive — Smoldering Momentum:** gaining Heat reduces next CT cost slightly.
- **R3 Active — Furnace Kick:** melee hit that pushes targets back.
- **R4 Passive — Ashhide:** Heat above 6 grants damage reduction.
- **R5 Active — Molten Hook:** pulls a target and applies Burn.
- **R6 Passive — Charline:** Burned targets deal less damage to you.
- **R7 Active — Searing Break:** heavy blow that consumes Heat for armor pierce.
- **R8 Passive — Blaze Guard:** using Furnace Kick grants a small shield.
- **R9 Active — Pyre Crash:** ground slam; damage scales with Heat spent.
- **R10 Passive — Tempered Resolve:** when HP falls below 50%, Gain Heat each tick.
- **Evolution:** into Drakebound Vanguard.

## 3. Drakebound Vanguard (T3)
Role: frontline bruiser | CT: medium | Resource: Heat + HP
- **R1 Basic — Vanguard Thrust:** spear strike; builds Heat and threat.
- **R2 Passive — War Tempering:** attacking a burning target restores small HP.
- **R3 Active — Scorch Guard:** attack and gain a brief barrier.
- **R4 Passive — Linebreaker:** enemies hit by thrust take increased next-fire damage.
- **R5 Active — Drake March:** advance and hit all enemies in your path.
- **R6 Passive — Forgeblood:** taking damage adds Heat.
- **R7 Active — Brand of Ruin:** mark a target; marked target explodes on death.
- **R8 Passive — Ash Fortress:** at high Heat, gain defense and CDR.
- **R9 Active — Crown Cleave:** two-stage cleave; second hit benefits from all Burn stacks.
- **R10 Passive — Vow of Embers:** after Crown Cleave, next 2 skills cost less CT.
- **Evolution:** into Hornfire Reaver.

## 4. Hornfire Reaver (T4)
Role: explosive melee hybrid | CT: medium-slow | Resource: Heat
- **R1 Basic — Horn Splitter:** heavy strike that can cleave a second target.
- **R2 Passive — Furnace Spine:** Heat also increases crit chance.
- **R3 Active — Reaver Leap:** leap attack; landing applies Burn in a small radius.
- **R4 Passive — Molten Hide:** when damaged, gain a small Heat refund.
- **R5 Active — Pyro Rend:** multi-hit slash; final hit consumes Heat for a blast.
- **R6 Passive — Ash Momentum:** each kill temporarily speeds up your CT.
- **R7 Active — Dragonclaw Verdict:** powerful finisher; extra damage against shields.
- **R8 Passive — Cinder Crown:** while above 8 Heat, basic attacks apply armor shred.
- **R9 Active — Infernal Breakpoint:** sacrifice HP to reset Reaver Leap.
- **R10 Passive — Law of the Forge:** after Infernal Breakpoint, the next skill cannot miss.
- **Evolution:** into Ember Crown Warden.

## 5. Ember Crown Warden (T5)
Role: apex burn monarch | CT: medium | Resource: Heat + HP
- **R1 Basic — Royal Cinder:** fast blade-and-flame strike; always builds Heat.
- **R2 Passive — Crown Furnace:** Heat generation is higher while below 70% HP.
- **R3 Active — Thronespark:** summon a burning ring that damages enemies and protects allies.
- **R4 Passive — Ember Authority:** nearby enemies deal less damage while Ring is active.
- **R5 Active — Warden’s Flame:** large cone of fire; if it hits 3+ targets, refund CT.
- **R6 Passive — Dragon Oath:** every 3rd Burn you apply is twice as long.
- **R7 Active — Forge Tyrant:** spend Heat to create a massive single-target execution.
- **R8 Passive — Ashen Dominion:** kills grant a shield and a small ATK buff.
- **R9 Active — Crownfall:** battlefield-wide fire surge; stronger if Ring is active.
- **R10 Passive — Eternal Ember:** after Crownfall, your basic attack becomes instant for 2 turns.
- **Evolution:** apex form of the lineage.

---

# 2) Bull Cathedral
Theme: sanctuary, defense, ritual endurance, shield walls, slow inevitability.

## 6. Stone Oathbearer (T1)
Role: basic tank | CT: medium | Resource: HP
- **R1 Basic — Oath Bash:** shield bash that builds Guard.
- **R2 Passive — Stone Promise:** Guard slightly reduces incoming damage.
- **R3 Active — Sanctuary Step:** move to protect an ally; share a portion of damage.
- **R4 Passive — Heavy Faith:** taking hits increases your mitigation briefly.
- **R5 Active — Chapel Slam:** heavy strike that taunts enemies.
- **R6 Passive — Enduring Mass:** each taunt restores a little HP.
- **R7 Active — Bell of Duty:** allies gain a short damage shield.
- **R8 Passive — Resolved Stone:** if HP falls below 50%, Guard effects strengthen.
- **R9 Active — Oath Seal:** target enemy deals less damage for a few turns.
- **R10 Passive — Immutable Faith:** after Bell of Duty, your next taunt lasts longer.
- **Evolution:** into Sanctum Brute.

## 7. Sanctum Brute (T2)
Role: bruiser-tank | CT: medium-slow | Resource: HP
- **R1 Basic — Brick Fist:** heavy punch; builds Guard and threat.
- **R2 Passive — Pulpit Frame:** Guard also increases your healing received.
- **R3 Active — Pillar Rush:** charge that knocks enemies back.
- **R4 Passive — Stalwart Mass:** after taking a big hit, gain small armor.
- **R5 Active — Hallowed Crush:** slam the ground; damage scales with Guard.
- **R6 Passive — Cathedral Skin:** each enemy taunted gives a small shield.
- **R7 Active — Requiem Stance:** enter stance; convert part of damage taken into Guard.
- **R8 Passive — Iron Psalm:** while stance is active, basic attacks heal a little.
- **R9 Active — Sanctify:** cleanse a debuff from self or ally and fortify them.
- **R10 Passive — Unbroken Hymn:** after Sanctify, all mitigation effects gain duration.
- **Evolution:** into Cathedral Bastion.

## 8. Cathedral Bastion (T3)
Role: defense anchor | CT: slow-medium | Resource: HP + MP
- **R1 Basic — Bastion Strike:** wall-like hit; applies pressure.
- **R2 Passive — Choir Armor:** damage reduction increases when allies are nearby.
- **R3 Active — Nave Wall:** form a defensive wall for the party.
- **R4 Passive — Sacred Weight:** enemies attacking you suffer reduced accuracy.
- **R5 Active — Reliquary Slam:** enormous ground slam that roots targets.
- **R6 Passive — Stone Benediction:** when an ally falls low, you gain CT faster.
- **R7 Active — Rosary Guard:** shield all allies and extend your own Guard.
- **R8 Passive — Fortified Hymn:** shields you apply last longer.
- **R9 Active — Pilgrim’s Verdict:** a single-target strike that scales with missing HP.
- **R10 Passive — Ever-Chapel:** after Rosary Guard, the next ally shield is stronger.
- **Evolution:** into Aegis Minotaur.

## 9. Aegis Minotaur (T4)
Role: guardian shock-unit | CT: slow | Resource: MP
- **R1 Basic — Hornwall Ram:** charge and bash; hard to interrupt.
- **R2 Passive — Labyrinth Hide:** each enemy hit grants brief damage reduction.
- **R3 Active — Maze Charge:** force enemies to retarget you.
- **R4 Passive — Bull’s Sanctuary:** allies behind you take reduced damage.
- **R5 Active — Minotaur Psalm:** a loud roar that weakens enemy attack.
- **R6 Passive — Sacred Impact:** when you block, reflect some damage.
- **R7 Active — Gate of Penance:** trap enemies in a sacred zone.
- **R8 Passive — Thorned Reliance:** damage you take fuels your next shield.
- **R9 Active — Horned Judgement:** huge single-target smash; stronger on marked foes.
- **R10 Passive — Cathedral Lock:** Gate of Penance becomes longer and harder to escape.
- **Evolution:** into Hierophant Colossus.

## 10. Hierophant Colossus (T5)
Role: apex fortress | CT: slow | Resource: HP + MP
- **R1 Basic — Colossus Requiem:** crushing strike that slows enemies.
- **R2 Passive — Ritual Bulk:** your shields scale from max HP more strongly.
- **R3 Active — Mass of the Cathedral:** create an enormous sanctuary zone.
- **R4 Passive — Holy Momentum:** when attacked, gain Guard and small CT refund.
- **R5 Active — Bull of Benediction:** charge through enemies; allies behind you gain armor.
- **R6 Passive — Pillar of Faith:** your taunts cannot be ignored by normal enemies.
- **R7 Active — Consecration:** all enemies inside your zone take reduced healing and movement.
- **R8 Passive — Massive Presence:** your shields also increase your allies’ shield strength.
- **R9 Active — Final Mass:** a devastating strike that scales with Guard and ally count.
- **R10 Passive — Eternal Cathedral:** after Final Mass, all defensive effects last longer.
- **Evolution:** apex form of the lineage.

---

# 3) Twin Mirror
Theme: duplication, reflection, misdirection, copy logic, paired effects.

## 11. Mirror Spark (T1)
Role: trickster starter | CT: fast | Resource: MP
- **R1 Basic — Shard Flick:** quick magic shard with a small bounce.
- **R2 Passive — Glass Temper:** first hit each battle has a small crit bonus.
- **R3 Active — Copy Spark:** repeat your last basic attack at reduced power.
- **R4 Passive — Split Light:** crits generate a small mirror charge.
- **R5 Active — Echo Needle:** hit a second enemy at lower damage.
- **R6 Passive — Reflective Mind:** small chance to reflect minor debuffs.
- **R7 Active — Twin Glimmer:** create a decoy that absorbs one hit.
- **R8 Passive — Shimmer Step:** after using a mirror skill, gain dodge.
- **R9 Active — Prism Burst:** unleash a burst that changes element based on charge.
- **R10 Passive — Two Faces:** when decoy is active, your next skill costs less CT.
- **Evolution:** into Splitblade Savant.

## 12. Splitblade Savant (T2)
Role: dual-weapon pressure | CT: fast-medium | Resource: none
- **R1 Basic — Twin Cut:** two quick slashes.
- **R2 Passive — Paired Rhythm:** alternating skills deal more damage.
- **R3 Active — Split Step:** reposition and strike a nearby target.
- **R4 Passive — Shatterline:** repeated hits on the same target reduce their defense.
- **R5 Active — Mirror Guard:** next hit is partially reflected.
- **R6 Passive — Double Tempo:** after a reflected hit, gain CT refund.
- **R7 Active — Lattice Slash:** attack two targets and copy one debuff between them.
- **R8 Passive — Glass Edge:** critical hits apply a small bleed.
- **R9 Active — Fracture Pulse:** force a duplicate strike from your last attack.
- **R10 Passive — Savant’s Advantage:** copied attacks cannot miss once per battle.
- **Evolution:** into Double Glyph Adept.

## 13. Double Glyph Adept (T3)
Role: copy-caster | CT: medium | Resource: MP
- **R1 Basic — Glyph Tap:** magic hit that stores a small glyph.
- **R2 Passive — Script Memory:** each glyph slightly boosts the next copied skill.
- **R3 Active — Duplicate Rune:** cast a weaker copy of your previous skill.
- **R4 Passive — Mirror Syntax:** copies inherit part of the original skill’s bonus effects.
- **R5 Active — Twin Sigil:** place a sigil that repeats the first ally skill used near it.
- **R6 Passive — Paired Lines:** copied skills cost less CT when used back-to-back.
- **R7 Active — Recursive Ward:** shield yourself and reflect a debuff.
- **R8 Passive — Rewritten Flow:** every third cast refunds MP.
- **R9 Active — Glyph Break:** convert copied damage into a burst hit.
- **R10 Passive — Master Script:** Duplicate Rune now also copies one passive-type effect.
- **Evolution:** into Refraction Oracle.

## 14. Refraction Oracle (T4)
Role: prediction control | CT: medium-slow | Resource: MP
- **R1 Basic — Oracle Lens:** precise bolt that reveals enemy intent.
- **R2 Passive — Forecasting:** you gain a small bonus when acting before enemies.
- **R3 Active — Split Visions:** create two future-action previews and choose one.
- **R4 Passive — Prism Shield:** damage reduction scales with the number of visible enemies.
- **R5 Active — Refract Fate:** redirect a hostile effect to a different target.
- **R6 Passive — Seen Twice:** repeated enemy actions become weaker.
- **R7 Active — Mirror Verdict:** duplicate your strongest active skill at reduced power.
- **R8 Passive — Clear Reflection:** after redirecting an effect, gain crit.
- **R9 Active — Oracle Bloom:** large area blast that becomes stronger for each mirrored effect active.
- **R10 Passive — Perfect Angle:** once per battle, your first copied skill is free.
- **Evolution:** into Eclipse Paragon.

## 15. Eclipse Paragon (T5)
Role: apex duplication judge | CT: medium | Resource: MP
- **R1 Basic — Eclipse Needle:** precise strike that can hit twice if used at dusk/low HP.
- **R2 Passive — Paragon Reflection:** copied effects are stronger and cleaner.
- **R3 Active — Black Prism:** split damage into three smaller hits; each can crit.
- **R4 Passive — Twin Truth:** when one mirrored skill hits, the second gains bonus power.
- **R5 Active — Mirror Crown:** create a crown of illusions that repeats your next skill.
- **R6 Passive — Hidden Geometry:** moving the battle queue in your favor grants a shield.
- **R7 Active — False Horizon:** enemy targeting becomes unstable for a short time.
- **R8 Passive — Glass Dominion:** repeated actions by the same enemy are progressively weaker.
- **R9 Active — Parallax Collapse:** collapse all mirrors into one catastrophic burst.
- **R10 Passive — One Becomes Many:** after Parallax Collapse, your next 2 skills are duplicated.
- **Evolution:** apex form of the lineage.

---

# 4) Tide Shell
Theme: moonlit protection, evasive defense, tide rhythm, flow and rebound.

## 16. Shellstep Warden (T1)
Role: evasive defender | CT: fast | Resource: none
- **R1 Basic — Shell Tap:** quick strike and step away.
- **R2 Passive — Soft Current:** dodging grants tiny CT refund.
- **R3 Active — Tidal Slip:** move through enemy space and avoid retaliation.
- **R4 Passive — Pearl Guard:** small shields form after evasive actions.
- **R5 Active — Moon Shell:** protect yourself with a tide barrier.
- **R6 Passive — Drift Memory:** repeated dodges become easier to chain.
- **R7 Active — Surf Cut:** damage an enemy and push them back.
- **R8 Passive — Calm Waters:** while shielded, healing works better.
- **R9 Active — Undertow Step:** pull a target slightly out of formation.
- **R10 Passive — Shell Cycle:** after Moon Shell expires, gain a small speed buff.
- **Evolution:** into Tidebound Scout.

## 17. Tidebound Scout (T2)
Role: mobile skirmisher | CT: fast | Resource: MP
- **R1 Basic — Tide Jab:** precise hit that slightly lowers enemy accuracy.
- **R2 Passive — Flow Sense:** acting after a dodge increases damage.
- **R3 Active — Salt Skip:** short teleport-like hop that avoids damage.
- **R4 Passive — Shoreline Guard:** when HP is high, gain defense.
- **R5 Active — Foam Strike:** multi-hit attack that scales with movement.
- **R6 Passive — Brine Rhythm:** each successful evasion increases next CT gain.
- **R7 Active — Breakwater:** create a barrier that blocks projectiles.
- **R8 Passive — Moonwashed:** shield effects last longer on you.
- **R9 Active — Ripcurrent:** force a target to lose their next dodge window.
- **R10 Passive — Scout’s Drift:** after Ripcurrent, your next basic is instant.
- **Evolution:** into Mooncurrent Defender.

## 18. Mooncurrent Defender (T3)
Role: reactive tank | CT: medium | Resource: MP + shield
- **R1 Basic — Crescent Guard:** shield bash with tide damage.
- **R2 Passive — Lunar Drift:** each block grants small defense.
- **R3 Active — Moonline:** draw a protective line that allies can stand behind.
- **R4 Passive — Tidal Retort:** blocked hits push attackers back slightly.
- **R5 Active — Current Ward:** cover an ally and absorb some damage for them.
- **R6 Passive — Foam Rebound:** when shield breaks, enemy takes small damage.
- **R7 Active — Reef Counter:** counterattack after a successful block.
- **R8 Passive — Deep Calm:** under 50% HP, shield gain is stronger.
- **R9 Active — Moonbreak:** stunning crash of tidal force.
- **R10 Passive — Tidal Oath:** after Reef Counter, your next protection skill is stronger.
- **Evolution:** into Reef Sentinel.

## 19. Reef Sentinel (T4)
Role: fortress skirmisher | CT: medium-slow | Resource: MP
- **R1 Basic — Coral Jab:** piercing strike that applies a slow.
- **R2 Passive — Coral Shell:** shields grant you temporary armor.
- **R3 Active — Barrier Reef:** create a zone that reduces enemy damage.
- **R4 Passive — Living Tide:** after taking a hit, gain attack speed briefly.
- **R5 Active — Reef Surge:** burst of water that knocks back foes.
- **R6 Passive — Moon Anchors:** you cannot be displaced while Barrier Reef is active.
- **R7 Active — Undertide Hunt:** strike a target and steal a bit of their CT.
- **R8 Passive — Stone Water:** low HP makes you harder to crit.
- **R9 Active — Crestfall:** crash waves onto multiple enemies.
- **R10 Passive — Sentinel’s Depth:** after Crestfall, the next barrier is stronger.
- **Evolution:** into Leviathan Crest.

## 20. Leviathan Crest (T5)
Role: apex tide guardian | CT: medium | Resource: shield + MP
- **R1 Basic — Leviathan Scale:** hard strike that builds tide stacks.
- **R2 Passive — Deep Water Crown:** tide stacks increase all defense.
- **R3 Active — Abyssal Shell:** massive shield that grows with missing HP.
- **R4 Passive — Pressure Bone:** shields convert a portion of damage taken into attack.
- **R5 Active — Crescent Maelstrom:** large whirlpool that drags enemies inward.
- **R6 Passive — Moon Pressure:** the more enemies nearby, the stronger your shields.
- **R7 Active — Tidal Sovereignty:** lock an area; allies in it gain speed and defense.
- **R8 Passive — Reef Memory:** every shield you create slightly improves the next one.
- **R9 Active — Ocean Breaker:** a devastating finisher that consumes tide stacks.
- **R10 Passive — Eternal Tide:** after Ocean Breaker, you immediately regain a smaller shield.
- **Evolution:** apex form of the lineage.

---

# 5) Sunfang Court
Theme: royalty, radiance, predator authority, judgment, burst timing.

## 21. Dawncub Duelist (T1)
Role: basic burst | CT: fast | Resource: none
- **R1 Basic — Dawnbite:** quick strike that marks the target.
- **R2 Passive — Young Sun:** marked targets take slightly more damage from you.
- **R3 Active — Pride Step:** quick lunge that sets up the next hit.
- **R4 Passive — Golden Mane:** first hit after moving deals more damage.
- **R5 Active — Sunpounce:** leap into a target with a bright burst.
- **R6 Passive — Courtly Instinct:** while above 80% HP, crit rises.
- **R7 Active — Radiant Claw:** damage plus a small blind.
- **R8 Passive — Noble Hunger:** kills restore a small amount of CT.
- **R9 Active — Royal Snap:** execute-style bite that scales with missing HP.
- **R10 Passive — Young Crown:** after Royal Snap, your next basic attack is instant.
- **Evolution:** into Fanglight Heir.

## 22. Fanglight Heir (T2)
Role: burst duelist | CT: fast-medium | Resource: MP
- **R1 Basic — Heir Slash:** blade strike that builds Sun stacks.
- **R2 Passive — Legacy of Light:** Sun stacks increase crit damage.
- **R3 Active — Banner Rush:** charge forward and strike a line.
- **R4 Passive — Court Poise:** after a clean hit, gain speed.
- **R5 Active — Solar Bite:** powerful strike; stronger if target is blinded or marked.
- **R6 Passive — Crowning Pain:** taking damage grants Sun stacks.
- **R7 Active — Pride Roar:** buff yourself and nearby allies.
- **R8 Passive — Bright Blood:** critical hits refresh part of Banner Rush.
- **R9 Active — Sunfang Finish:** huge finishing blow against low-health targets.
- **R10 Passive — Heir Apparent:** after Pride Roar, your next 2 attacks cost less CT.
- **Evolution:** into Solar Blade.

## 23. Solar Blade (T3)
Role: royal attacker | CT: medium | Resource: MP
- **R1 Basic — Brighthilt:** precise sword cut.
- **R2 Passive — Court Radiance:** attack power rises when allies are healthy.
- **R3 Active — Sun Cleave:** heavy slash that hits in an arc.
- **R4 Passive — Noble Guard:** after using a sword skill, gain short defense.
- **R5 Active — Solar Decree:** command a target and deal extra damage if they act next.
- **R6 Passive — Regal Tempo:** acting first in a sequence increases crit.
- **R7 Active — Glare Lance:** beam-thrust that pierces armor.
- **R8 Passive — White Mane:** kills increase your next CT gain slightly.
- **R9 Active — King’s Verdict:** an execution strike that scales with your current buffs.
- **R10 Passive — Law of the Court:** after King’s Verdict, your Sword skills ignore part of defense.
- **Evolution:** into Lionheart Regent.

## 24. Lionheart Regent (T4)
Role: battlefield commander | CT: medium-slow | Resource: none
- **R1 Basic — Regent Cut:** commanding slash that affects nearby foes.
- **R2 Passive — Lion Pride:** allies near you gain small crit.
- **R3 Active — Court Charge:** rush and scatter enemies.
- **R4 Passive — Gold Standard:** buffed allies deal more damage.
- **R5 Active — Sunlit Edict:** mark enemies to take more damage from your team.
- **R6 Passive — Proud Guard:** while marked enemies are alive, you gain defense.
- **R7 Active — Regal Roar:** big party buff and enemy debuff.
- **R8 Passive — Crowned Tactics:** when an ally crits, your CT nudges forward.
- **R9 Active — Linebreaker:** huge strike that weakens the target’s next action.
- **R10 Passive — Regent’s Mandate:** after Regal Roar, your team’s first attack gains bonus damage.
- **Evolution:** into Solar Sovereign.

## 25. Solar Sovereign (T5)
Role: apex radiant monarch | CT: medium | Resource: MP + authority stacks
- **R1 Basic — Sovereign Slash:** high-pressure sword strike.
- **R2 Passive — Radiant Throne:** authority stacks raise damage and defense.
- **R3 Active — Daycourt:** create a bright zone that strengthens allies.
- **R4 Passive — Royal Decree:** enemies in Daycourt deal less damage.
- **R5 Active — Sun Crownfall:** massive burst strike that hits the main target and a second foe.
- **R6 Passive — Noble Flame:** each kill slightly refills MP.
- **R7 Active — Judgment Parade:** multi-hit royal assault with armor pierce.
- **R8 Passive — Golden Discipline:** if you act after an ally, your next skill costs less CT.
- **R9 Active — Eclipse Order:** invert enemy buffs into damage reduction debuffs.
- **R10 Passive — Eternal Sun:** after Judgment Parade, your team receives a shield.
- **Evolution:** apex form of the lineage.

---

# 6) Thorn Ledger
Theme: precision, punishment, poison, legal judgment, execution windows.

## 26. Quill Cutter (T1)
Role: precise starter | CT: fast | Resource: none
- **R1 Basic — Quill Jab:** clean pierce that applies a small bleed.
- **R2 Passive — Ink Focus:** bleeding targets take slightly more crit damage.
- **R3 Active — Margin Cut:** slash that weakens enemy defense.
- **R4 Passive — Red Ink:** your critical hits extend bleed slightly.
- **R5 Active — Citation Strike:** strike and mark a target for future punishment.
- **R6 Passive — Sharp Syntax:** if a marked target attacks, gain CT.
- **R7 Active — Paper Trail:** spread your bleed to one nearby target.
- **R8 Passive — Fine Print:** marked enemies deal less damage to you.
- **R9 Active — Final Note:** execute-style strike when target is below threshold.
- **R10 Passive — Ledger Closed:** after Final Note, your next mark is stronger.
- **Evolution:** into Venom Scribe.

## 27. Venom Scribe (T2)
Role: poison debuffer | CT: fast-medium | Resource: MP
- **R1 Basic — Ink Needle:** ranged puncture that applies poison.
- **R2 Passive — Tainted Record:** poison also lowers healing received.
- **R3 Active — Poison Clause:** add a stronger poison stack.
- **R4 Passive — Sharp Evidence:** poison ticks have a small chance to crit.
- **R5 Active — Verdict Stab:** strike a marked enemy; stronger if they are poisoned.
- **R6 Passive — Judicial Burn:** poisons last longer when the target is slowed.
- **R7 Active — Black Seal:** place a seal that punishes repeated actions.
- **R8 Passive — No Appeal:** marked enemies cannot fully negate your poison.
- **R9 Active — Inkwell Burst:** burst damage based on poison stacks.
- **R10 Passive — Scribe’s Authority:** after Inkwell Burst, poison on that target refreshes once.
- **Evolution:** into Verdict Thorn.

## 28. Verdict Thorn (T3)
Role: control punisher | CT: medium | Resource: MP
- **R1 Basic — Thorn Pen:** piercing hit that slows the target.
- **R2 Passive — Sentence Weight:** slowed targets take more damage from you.
- **R3 Active — Rulebreak:** force a target to lose a small amount of CT.
- **R4 Passive — Cruel Margin:** if the same target is hit twice in a row, the second hit is stronger.
- **R5 Active — Guilty Cut:** heavy strike against marked targets.
- **R6 Passive — Iron Footnote:** whenever a debuff expires, you gain a small shield.
- **R7 Active — Sentence Net:** trap a target in poison thorns.
- **R8 Passive — Appeal Denied:** your debuffs resist cleansing once per battle.
- **R9 Active — Final Judgement:** burst an enemy based on how many debuffs they carry.
- **R10 Passive — Thorned Doctrine:** after Final Judgement, marked enemies take more crit damage.
- **Evolution:** into Briar Arbiter.

## 29. Briar Arbiter (T4)
Role: debuff judge | CT: medium-slow | Resource: MP + focus stacks
- **R1 Basic — Arbiter’s Prick:** precise strike that begins focus.
- **R2 Passive — Focus of Briars:** focus stacks improve debuff duration.
- **R3 Active — Hedge Sentence:** create a thorn field that punishes movement.
- **R4 Passive — Cold Quill:** focused enemies lose some attack speed.
- **R5 Active — Redline Decision:** choose to weaken an enemy or strengthen an ally.
- **R6 Passive — Paper Crown:** if a debuffed target dies, gain a stack of focus.
- **R7 Active — Thorns of Law:** multiple hits on one target increase your damage.
- **R8 Passive — Unfair Advantage:** targets with 3+ debuffs are easier to execute.
- **R9 Active — Penalty Burst:** burst damage that scales with missing enemy HP.
- **R10 Passive — Arbiter’s Finality:** after Penalty Burst, your next debuff cannot be resisted.
- **Evolution:** into Seraphic Inquisitor.

## 30. Seraphic Inquisitor (T5)
Role: apex executioner | CT: medium | Resource: MP
- **R1 Basic — Inquisitor’s Tap:** precise light-and-thorn strike.
- **R2 Passive — Holy Punishment:** debuffed enemies take more damage from all sources.
- **R3 Active — Penitent Brand:** brand a target so repeated hits hurt more.
- **R4 Passive — Confession Chain:** when a branded target acts, your CT moves forward.
- **R5 Active — Vow of Thorns:** strong line attack that bleeds and slows.
- **R6 Passive — Court of Ash:** your poison/bleed effects last longer in boss fights.
- **R7 Active — Verdict of Fire:** convert all poison on one target into a burst explosion.
- **R8 Passive — Final Clause:** enemies below a threshold are easier to mark.
- **R9 Active — Inquisition Ray:** huge single-target judgment beam.
- **R10 Passive — Unsealed Sentence:** after Inquisition Ray, your next 2 debuffs are free.
- **Evolution:** apex form of the lineage.

---

# 7) Balance Reins
Theme: symmetry, paired forces, tempo control, coordinated support, duality.

## 31. Reinbound Initiate (T1)
Role: balanced starter | CT: medium | Resource: none
- **R1 Basic — Reins Tap:** balanced strike that slightly buffs self.
- **R2 Passive — Even Pace:** your first skill each battle is a little faster.
- **R3 Active — Twin Tug:** attack and lightly pull the enemy.
- **R4 Passive — Centerline:** when above half HP, you gain more defense.
- **R5 Active — Equal Step:** shift yourself and one ally toward safer positions.
- **R6 Passive — Stable Grip:** you resist knockback more easily.
- **R7 Active — Mirror Pace:** choose one ally to share your speed bonus.
- **R8 Passive — Shared Weight:** when an ally is buffed, you gain a lesser version.
- **R9 Active — Balance Break:** strike a target and reduce their next CT gain.
- **R10 Passive — Foundational Equilibrium:** after Balance Break, your next support skill is stronger.
- **Evolution:** into Twinbridle Rider.

## 32. Twinbridle Rider (T2)
Role: paired support-skirmisher | CT: fast-medium | Resource: MP
- **R1 Basic — Bridle Jab:** hit and grant a small buff to a nearby ally.
- **R2 Passive — Double Rhythm:** alternating between attack and support grants bonus CT.
- **R3 Active — Match Step:** move both you and an ally forward in the queue slightly.
- **R4 Passive — Shared Hooves:** you take less damage while an ally is also buffed.
- **R5 Active — Dual Call:** buff two allies at once with a minor effect.
- **R6 Passive — Gentle Pull:** your debuffs also slow enemy movement.
- **R7 Active — Tandem Strike:** attack and copy a small portion of that damage to a second enemy.
- **R8 Passive — Coordinated Pulse:** buffs you apply last longer if cast after a support skill.
- **R9 Active — Reins of Motion:** grant a large speed boost to one ally and yourself.
- **R10 Passive — Pairing Law:** after Reins of Motion, your next buff is duplicated at reduced power.
- **Evolution:** into Equilibrium Marshal.

## 33. Equilibrium Marshal (T3)
Role: tempo commander | CT: medium | Resource: MP
- **R1 Basic — Marshal Cut:** attack that slightly buffs allies.
- **R2 Passive — Command Balance:** your buffs gain more value when allies are low.
- **R3 Active — Ordered Advance:** move the party’s CT in a favorable direction.
- **R4 Passive — Weighted Hands:** repeated support skills cost less CT.
- **R5 Active — Dual Edict:** strengthen one ally while weakening one enemy.
- **R6 Passive — Tactician’s Poise:** when a buff expires, gain a small shield.
- **R7 Active — Crossbar:** strike two targets and copy one buff or debuff.
- **R8 Passive — Harmonized Lines:** if your team is evenly buffed, all buffs last longer.
- **R9 Active — Marshal’s Decree:** large field buff that improves team consistency.
- **R10 Passive — Perfect Equilibrium:** after Decree, your first attack and first buff both cost less CT.
- **Evolution:** into Harmony Lancer.

## 34. Harmony Lancer (T4)
Role: frontline support | CT: medium-slow | Resource: none
- **R1 Basic — Lancer’s Tap:** polearm strike that grants a team pulse.
- **R2 Passive — Balanced Guard:** when your team has mixed roles alive, you gain defense.
- **R3 Active — Triune March:** move and buff the line behind you.
- **R4 Passive — Synchronized Breath:** buff durations increase when cast near allies.
- **R5 Active — Harmony Spear:** heavy strike that also heals the party slightly.
- **R6 Passive — Weighted Grace:** taking a hit can increase your next buff’s power.
- **R7 Active — Equinox Rally:** team buff with a small debuff cleanse.
- **R8 Passive — Shared Cadence:** allies receiving a buff from you also gain minor CT reduction.
- **R9 Active — Banner Split:** split one buff into two weaker versions for more allies.
- **R10 Passive — Lancer’s Peace:** after Equinox Rally, your next heal or buff is instant.
- **Evolution:** into Concord Tribunal.

## 35. Concord Tribunal (T5)
Role: apex balance judge | CT: medium | Resource: MP + harmony stacks
- **R1 Basic — Tribunal Cut:** precise strike that gathers harmony.
- **R2 Passive — Balanced Sentence:** harmony stacks increase both attack and defense slightly.
- **R3 Active — Twin Axiom:** duplicate a selected buff onto an ally or enemy.
- **R4 Passive — Equal Measure:** if the enemy is heavily buffed, your debuffs become stronger.
- **R5 Active — Concordance:** create a field where all allies gain speed and all enemies lose speed.
- **R6 Passive — Fair Weight:** your first support action after taking damage is stronger.
- **R7 Active — Judgement Pair:** a two-target strike that mirrors the damage to a second target.
- **R8 Passive — Law of Symmetry:** copied effects cannot be weaker than a minimum threshold.
- **R9 Active — Final Accord:** massive team-wide buff that also weakens the strongest enemy.
- **R10 Passive — Eternal Accord:** after Final Accord, your team’s first attack each gets bonus CT efficiency.
- **Evolution:** apex form of the lineage.

---

# 8) Black Nest
Theme: stealth, death, poison, inevitability, ambush, rebirth through ending.

## 36. Nestling Shade (T1)
Role: stealth starter | CT: fast | Resource: none
- **R1 Basic — Shadow Peck:** quick strike with a tiny bleed.
- **R2 Passive — Quiet Nest:** your first hit from stealth deals more damage.
- **R3 Active — Dark Flit:** move unseen and prepare your next hit.
- **R4 Passive — Feathermask:** when unhurt, you gain dodge.
- **R5 Active — Night Plunge:** dive attack that applies fear.
- **R6 Passive — Under Wing:** if you attack from stealth, gain a shield.
- **R7 Active — Tangle Plumage:** confuse a target and lower accuracy.
- **R8 Passive — Gloom Hatch:** killing a feared enemy restores a little CT.
- **R9 Active — Silent Talon:** high-damage strike against low-HP targets.
- **R10 Passive — Shadow Nesting:** after Silent Talon, your next stealth action costs less CT.
- **Evolution:** into Razor Roost.

## 37. Razor Roost (T2)
Role: bleed assassin | CT: fast-medium | Resource: HP
- **R1 Basic — Roost Cut:** slash that applies bleed.
- **R2 Passive — Blood Plumage:** bleeding targets are easier to crit.
- **R3 Active — Hook Talon:** pull a target slightly toward you.
- **R4 Passive — Feathered Escape:** after a kill, gain dodge.
- **R5 Active — Roost Ambush:** attack from stealth and apply fear.
- **R6 Passive — Sharp Circle:** bleeding targets deal less damage to your allies.
- **R7 Active — Nest Breaker:** multi-hit strike that refreshes your bleed.
- **R8 Passive — Red Wing:** taking damage while below half HP increases attack speed.
- **R9 Active — Talon Sentence:** execute-style hit that scales with bleed stacks.
- **R10 Passive — Razor Instinct:** after Talon Sentence, your next basic is instant.
- **Evolution:** into Dusk Talon.

## 38. Dusk Talon (T3)
Role: execution stalker | CT: medium | Resource: MP
- **R1 Basic — Evening Slash:** precise hit that marks the target.
- **R2 Passive — Duskmark:** marked targets bleed longer.
- **R3 Active — Hollow Dive:** blink into the target and strike twice.
- **R4 Passive — Twilight Hide:** when you are not targeted, your damage rises.
- **R5 Active — Raven Chain:** chain a bleed to nearby enemies.
- **R6 Passive — Night Feint:** after a dodge, your next attack crits more often.
- **R7 Active — Funeral Talon:** heavy strike that deals more damage to bleeding foes.
- **R8 Passive — Grave Wing:** kills lower your CT briefly.
- **R9 Active — Dusk Execution:** high-damage finisher on marked enemies.
- **R10 Passive — Final Feather:** after Dusk Execution, you gain stealth for a moment.
- **Evolution:** into Vesper Reaper.

## 39. Vesper Reaper (T4)
Role: stealth reaper | CT: fast-medium | Resource: none
- **R1 Basic — Reaper Cut:** clean hit that increases mark stacks.
- **R2 Passive — Silent Harvest:** killing a marked foe increases your crit.
- **R3 Active — Grave Step:** short teleport with a guaranteed crit on the next hit.
- **R4 Passive — Hollow Cloak:** while stealthed, you take less damage.
- **R5 Active — Moon Scythe:** sweeping strike that hits multiple enemies.
- **R6 Passive — Black Harvest:** your bleed effects heal you a little.
- **R7 Active — Widow’s Kiss:** very strong strike against the lowest-health enemy.
- **R8 Passive — Quiet Reaping:** crits on bleeding enemies restore CT.
- **R9 Active — Harvest Eclipse:** large burst attack if targets are marked and bleeding.
- **R10 Passive — Reaper’s Stillness:** after Harvest Eclipse, your next stealth move is free.
- **Evolution:** into Night Eclipse.

## 40. Night Eclipse (T5)
Role: apex assassin | CT: medium | Resource: HP + shadow stacks
- **R1 Basic — Eclipse Talon:** dark strike that builds shadow stacks.
- **R2 Passive — Evernight:** shadow stacks increase damage and evade.
- **R3 Active — Blackout Dive:** vanish, then strike from behind.
- **R4 Passive — Funeral Silence:** damaged enemies lose a bit of accuracy.
- **R5 Active — Eclipse Mark:** mark a target; your next 2 attacks on it gain bonus crit.
- **R6 Passive — Hollow Feast:** kills restore HP and a small shield.
- **R7 Active — Grave Orbit:** damage all enemies around a chosen target.
- **R8 Passive — Dusk Hunger:** if you remain unseen, your next hit costs less CT.
- **R9 Active — Nightfall Verdict:** massive execute blow against marked or bleeding targets.
- **R10 Passive — Endless Eclipse:** after Nightfall Verdict, you gain stealth and a crit bonus.
- **Evolution:** apex form of the lineage.

---

# 9) Arrow Creed
Theme: discipline, archery, oath, sustained precision, ranged punishment.

## 41. Pathshot Scout (T1)
Role: ranger starter | CT: fast | Resource: none
- **R1 Basic — Path Arrow:** clean shot that marks the target.
- **R2 Passive — Road Sense:** marked targets are easier to hit.
- **R3 Active — Quick Draw:** next shot is instant and stronger.
- **R4 Passive — Field Eye:** crits briefly reveal enemy intent.
- **R5 Active — Long Step:** retreat and gain a ranged bonus.
- **R6 Passive — Straight Path:** moving before attacking improves your next basic.
- **R7 Active — Creed Volley:** 3 arrows in a straight line.
- **R8 Passive — Calm Hands:** every miss increases the next hit chance slightly.
- **R9 Active — Oath Piercer:** heavy shot that bypasses some armor.
- **R10 Passive — Scout’s Promise:** after Oath Piercer, your next basic attack is free.
- **Evolution:** into Oath Archer.

## 42. Oath Archer (T2)
Role: disciplined ranged DPS | CT: fast-medium | Resource: MP
- **R1 Basic — Oath Arrow:** shot that gains power if you did not repeat your last skill.
- **R2 Passive — Stance of Accuracy:** accuracy rises when you keep moving.
- **R3 Active — True Flight:** piercing arrow that ignores some defense.
- **R4 Passive — Hunter’s Restraint:** not repeating skills increases crit.
- **R5 Active — Pinning Shot:** slow a target and reduce their CT gain.
- **R6 Passive — Creed Focus:** Pinning Shot on a slowed target gains bonus damage.
- **R7 Active — Arcing Atonement:** projectile that bounces to nearby foes.
- **R8 Passive — Tight String:** after a crit, your next shot costs less CT.
- **R9 Active — Judgment Quiver:** release a volley that scales with your accuracy streak.
- **R10 Passive — No False Shot:** after Judgment Quiver, your first shot cannot miss.
- **Evolution:** into Creed Ranger.

## 43. Creed Ranger (T3)
Role: ranged control | CT: medium | Resource: MP
- **R1 Basic — Ranger’s Mark:** arrow strike that increases damage taken from you.
- **R2 Passive — Steady Creed:** marked targets can’t easily evade you.
- **R3 Active — Hawkline:** long-range line shot that hits multiple enemies.
- **R4 Passive — Still Bow:** acting without moving gives more damage.
- **R5 Active — Binding Arrow:** root a target for a short time.
- **R6 Passive — Scout Oath:** you gain a shield if Binding Arrow hits.
- **R7 Active — Volley Break:** unleash a controlled volley that strips buffs.
- **R8 Passive — Weather the Field:** enemies affected by your mark take more crit damage.
- **R9 Active — Ranger’s Sentence:** execute-style shot against marked low-HP targets.
- **R10 Passive — Hunter Creed:** after Ranger’s Sentence, your next mark applies instantly.
- **Evolution:** into Longwatch Paladin.

## 44. Longwatch Paladin (T4)
Role: holy marksman | CT: medium-slow | Resource: none
- **R1 Basic — Longwatch Shot:** precision shot that shields nearby allies slightly.
- **R2 Passive — Vigil:** allies near your target gain minor defense.
- **R3 Active — Lantern Arrow:** illuminate and reveal hidden or stealthy foes.
- **R4 Passive — Faithful Aim:** hitting a marked target grants you CT.
- **R5 Active — Oath Barrage:** heavy multi-shot that scales with current buffs.
- **R6 Passive — Watchman’s Grace:** every 3rd basic shot also heals the lowest ally a little.
- **R7 Active — Starfall Spear:** divine arrow that pierces armor and shields.
- **R8 Passive — Purposed Breathing:** after a heal or buff, your next shot gains damage.
- **R9 Active — Verdict Volley:** large fan-shaped strike that punishes clustered enemies.
- **R10 Passive — Everwatch:** after Verdict Volley, your next support action is instant.
- **Evolution:** into Horizon Judge.

## 45. Horizon Judge (T5)
Role: apex ranged judge | CT: medium | Resource: MP + focus
- **R1 Basic — Horizon Bolt:** long-range strike that builds focus.
- **R2 Passive — Distant Authority:** the farther the target, the stronger your shot.
- **R3 Active — Farline:** hit two enemies in a line and mark them both.
- **R4 Passive — Open Sky:** moving less increases accuracy and crit.
- **R5 Active — Creed Tribunal:** heavy judgment shot that weakens enemy buffs.
- **R6 Passive — Clear Sight:** marked enemies cannot easily hide or evade.
- **R7 Active — Meridian Rain:** rain arrows across the battlefield.
- **R8 Passive — Lockstep Oath:** if you keep firing at the same target, damage ramps.
- **R9 Active — Horizon Execution:** extreme finisher shot with armor pierce.
- **R10 Passive — Unbroken Line:** after Horizon Execution, your next 2 shots gain CT reduction.
- **Evolution:** apex form of the lineage.

---

# 10) Iron Covenant
Theme: sacrifice, corruption, raw power, pact logic, self-risk power spikes.

## 46. Forgebound Acolyte (T1)
Role: sacrifice starter | CT: fast-medium | Resource: HP
- **R1 Basic — Pact Strike:** solid hit that costs a little HP to empower.
- **R2 Passive — Iron Promise:** spending HP slightly increases damage.
- **R3 Active — Blood Oath:** trade HP for more attack and crit.
- **R4 Passive — Rustproof:** self-damage effects hurt you less.
- **R5 Active — Chain Omen:** hit a target and apply a weakening pact mark.
- **R6 Passive — Furnace Debt:** after you spend HP, gain a bit of CT refund.
- **R7 Active — Anvil Push:** knock the target back and gain a shield.
- **R8 Passive — Gilded Scar:** low HP boosts your damage.
- **R9 Active — Covenant Cut:** heavy strike that scales with HP spent this fight.
- **R10 Passive — Oath Seal:** after Covenant Cut, your next HP-cost skill costs less.
- **Evolution:** into Brass Revenant.

## 47. Brass Revenant (T2)
Role: durable power user | CT: medium | Resource: HP + MP
- **R1 Basic — Brass Hook:** strike and reclaim a little HP.
- **R2 Passive — Reclaimed Iron:** life spent this battle boosts your next skill.
- **R3 Active — Revenant Drive:** spend HP to raise damage and defense briefly.
- **R4 Passive — Corroded Strength:** the lower your HP, the more dangerous you become.
- **R5 Active — Pact Forge:** create a weapon echo that repeats one hit.
- **R6 Passive — Brass Skin:** repeated hits against you restore a little CT.
- **R7 Active — Debt Collector:** strike and siphon a bit of HP from the target.
- **R8 Passive — Waning Mercy:** if a pact target falls below 30% HP, you gain crit.
- **R9 Active — Revenant Brand:** mark a target so your next 2 hits are stronger.
- **R10 Passive — Iron Debt:** after Revenant Brand expires, you regain a portion of HP spent.
- **Evolution:** into Oathbreaker.

## 48. Oathbreaker (T3)
Role: risk bruiser | CT: medium-slow | Resource: HP
- **R1 Basic — Broken Seal:** heavy blow that lowers enemy damage.
- **R2 Passive — Ruinous Pact:** HP-cost skills gain bonus damage.
- **R3 Active — Shatter Oath:** sacrifice HP to break shields.
- **R4 Passive — Red Iron:** when below 50% HP, you gain defense.
- **R5 Active — Sinbrand:** apply a curse that improves all your damage on the target.
- **R6 Passive — Forsaken Will:** if you survive a lethal blow once, gain huge damage briefly.
- **R7 Active — Debt Hammer:** slow massive strike that refunds some HP if it kills.
- **R8 Passive — Blackened Oath:** curses last longer on bosses.
- **R9 Active — Ruin Sentence:** strike based on missing HP and current curses.
- **R10 Passive — Lost Covenant:** after Ruin Sentence, your next HP-cost skill is instant.
- **Evolution:** into Iron Devil.

## 49. Iron Devil (T4)
Role: corruption engine | CT: slow-medium | Resource: HP + corruption stacks
- **R1 Basic — Hellforge Tap:** corrupted strike that builds stacks.
- **R2 Passive — Devil’s Tribute:** corruption stacks increase both attack and HP drain.
- **R3 Active — Burning Pact:** spend HP to gain a large attack boost.
- **R4 Passive — Black Anvil:** damage you take may be partially converted to power.
- **R5 Active — Guilt Chain:** strike one enemy and chain a weaker curse to another.
- **R6 Passive — Red Market:** when you hit a cursed target, gain small HP.
- **R7 Active — Infernal Audit:** remove one buff from a target and convert it into damage.
- **R8 Passive — Ash Contract:** your HP-cost skills become harder hitting when below 40% HP.
- **R9 Active — Devil’s Writ:** a large curse blast that scales with all spent HP.
- **R10 Passive — Contract Sealed:** after Devil’s Writ, you gain a shield and a damage bonus.
- **Evolution:** into Covenant Tyrant.

## 50. Covenant Tyrant (T5)
Role: apex pact lord | CT: slow | Resource: HP + corruption
- **R1 Basic — Tyrant Brand:** command strike that marks a target for punishment.
- **R2 Passive — Supreme Debt:** the more HP you spend, the stronger your next 2 skills.
- **R3 Active — Blood Tax:** sacrifice HP to deal massive damage and drain the target.
- **R4 Passive — Tyrant’s Armor:** the lower your HP, the harder you are to kill.
- **R5 Active — Covenant Reign:** create a zone of authority that weakens enemies.
- **R6 Passive — Ruthless Economy:** kills refund some HP or CT.
- **R7 Active — Iron Exile:** banish a target briefly and return them with a heavy hit.
- **R8 Passive — Scarlet Crown:** corrupted targets are easier to execute.
- **R9 Active — Final Clause:** huge single-target finisher that scales with every HP cost used this fight.
- **R10 Passive — Eternal Covenant:** after Final Clause, your next 2 attacks cannot be interrupted.
- **Evolution:** apex form of the lineage.

---

# 11) Star Circuit
Theme: logic, electricity, resource conversion, CT control, pattern mastery.

## 51. Spark Node (T1)
Role: utility starter | CT: fast | Resource: MP
- **R1 Basic — Spark Tap:** quick electric shot.
- **R2 Passive — Live Wire:** hitting an enemy slightly restores MP.
- **R3 Active — Current Step:** move and gain a small speed buff.
- **R4 Passive — Circuit Calm:** using a skill on cooldown grants a tiny shield.
- **R5 Active — Pulse Shot:** chain damage to a second target.
- **R6 Passive — Node Memory:** repeated hits on the same enemy increase damage.
- **R7 Active — Static Loop:** slow a target and mildly reduce their CT gain.
- **R8 Passive — Voltage Discipline:** after a crit, your next skill costs less MP.
- **R9 Active — Bright Spike:** strong single-target electric burst.
- **R10 Passive — Closed Circuit:** after Bright Spike, your next basic attack is instant.
- **Evolution:** into Circuit Adept.

## 52. Circuit Adept (T2)
Role: resource builder | CT: fast-medium | Resource: MP
- **R1 Basic — Coil Flick:** electric hit that generates circuit charge.
- **R2 Passive — Charged Thought:** charge increases spell efficiency.
- **R3 Active — Grid Mark:** place a mark that improves your next lightning hit.
- **R4 Passive — Wireframe:** shields become stronger if you have charge.
- **R5 Active — Overcurrent:** spend charge for a large burst attack.
- **R6 Passive — Feedback Loop:** damaging enemies can restore a bit of charge.
- **R7 Active — Node Swap:** swap CT positions with a target slightly.
- **R8 Passive — Clean Signal:** if no damage taken for a turn, gain charge.
- **R9 Active — Bright Relay:** bounce electricity through multiple targets.
- **R10 Passive — Stable Node:** after Bright Relay, your next spell gains reduced CT.
- **Evolution:** into Star Tuner.

## 53. Star Tuner (T3)
Role: CT specialist | CT: medium | Resource: MP + charge
- **R1 Basic — Tuning Bolt:** strike that nudges CT in your favor.
- **R2 Passive — Harmonic State:** charge improves your speed and crit.
- **R3 Active — Frequency Shift:** accelerate an ally or slow an enemy.
- **R4 Passive — Resonant Thread:** repeated lightning hits shorten cooldowns.
- **R5 Active — Circuit Burst:** a powerful electrical blast with splash damage.
- **R6 Passive — Phase Lock:** enemies you slow become easier to crit.
- **R7 Active — Relay Command:** move a stored buff from one ally to another.
- **R8 Passive — Clean Harmony:** if your team is low on MP, your skills cost less.
- **R9 Active — Signal Break:** interrupt a target and strip one buff.
- **R10 Passive — Perfect Tune:** after Signal Break, your next 2 skills gain CT efficiency.
- **Evolution:** into Flux Savant.

## 54. Flux Savant (T4)
Role: advanced tempo engineer | CT: medium-slow | Resource: MP
- **R1 Basic — Flux Tap:** electric hit that stores a flux charge.
- **R2 Passive — Adjustable Flow:** charge can be used to improve attack or support.
- **R3 Active — Overclock:** give yourself or an ally a big speed spike.
- **R4 Passive — Smart Circuitry:** every third skill costs less CT.
- **R5 Active — Static Gate:** trap enemies in a field that slows movement and CT.
- **R6 Passive — Conductive Will:** your debuffs on lightning-affected targets last longer.
- **R7 Active — Relay Storm:** large chain lightning that scales with charge.
- **R8 Passive — Adaptive Current:** if an ally is down, your first support skill is stronger.
- **R9 Active — Breaker Pulse:** damage and silence the target briefly.
- **R10 Passive — Savant Protocol:** after Breaker Pulse, gain a refund on your next skill.
- **Evolution:** into Astral Architect.

## 55. Astral Architect (T5)
Role: apex logic engine | CT: medium | Resource: MP + flux
- **R1 Basic — Star Wire:** precise electric strike that builds flux.
- **R2 Passive — Architecture of Motion:** flux increases both damage and utility.
- **R3 Active — Blueprint Shift:** reorder an ally’s CT position slightly.
- **R4 Passive — Structural Current:** your shields scale with total flux.
- **R5 Active — Circuit Crown:** a field that boosts ally speed and weakens enemy recovery.
- **R6 Passive — Calculated Flow:** if you act after a support skill, your next attack is stronger.
- **R7 Active — Equation Break:** massive lightning burst that targets the weakest enemy.
- **R8 Passive — Stable Equation:** repeated use of the same skill gets cheaper once per battle.
- **R9 Active — Stellar Overload:** high-end area strike with a brief stun.
- **R10 Passive — Final Design:** after Stellar Overload, your next CT cost is reduced.
- **Evolution:** apex form of the lineage.

---

# 12) Dream Ocean
Theme: moon, waves, healing, illusion, soft control, delayed payoff.

## 56. Tide Dreamer (T1)
Role: support starter | CT: fast-medium | Resource: MP
- **R1 Basic — Tide Touch:** light hit that heals self a little.
- **R2 Passive — Sleepy Current:** healing slightly increases your next CT gain.
- **R3 Active — Moon Mist:** heal one ally and reduce enemy accuracy in a small zone.
- **R4 Passive — Gentle Drift:** buffs you apply last a little longer.
- **R5 Active — Wave Veil:** create a small shield on an ally.
- **R6 Passive — Soft Shore:** if you heal a full-HP ally, gain a small shield.
- **R7 Active — Drowsy Tide:** slow one enemy and lower their damage.
- **R8 Passive — Lunar Calm:** when low HP, your healing is stronger.
- **R9 Active — Dream Wash:** heal and cleanse one ally.
- **R10 Passive — Quiet Moon:** after Dream Wash, your next support skill costs less CT.
- **Evolution:** into Moonwake Mystic.

## 57. Moonwake Mystic (T2)
Role: healer-illusionist | CT: medium | Resource: MP
- **R1 Basic — Moonbeam Tap:** light magic hit that gently heals allies nearby.
- **R2 Passive — High Tide:** healing spells scale a little with missing ally HP.
- **R3 Active — Sleepwater:** apply a sleepy slow to enemies.
- **R4 Passive — Reflection Pool:** shields gain a small return heal when broken.
- **R5 Active — Moonrise Mist:** large heal over time on allies.
- **R6 Passive — Dream Pulse:** enemies affected by slow take more damage from your team.
- **R7 Active — Gentle Mirage:** create an illusion that draws enemy attacks.
- **R8 Passive — Calm Undertow:** after using a heal, gain small CT reduction.
- **R9 Active — Crescent Bloom:** burst heal plus a small buff to ally crit.
- **R10 Passive — Mystic Tides:** after Crescent Bloom, your next illusion skill is instant.
- **Evolution:** into Veil Shepherd.

## 58. Veil Shepherd (T3)
Role: sustain controller | CT: medium | Resource: MP
- **R1 Basic — Veil Pulse:** strike and heal the lowest ally a little.
- **R2 Passive — Hidden Shore:** allies under your heals take less damage briefly.
- **R3 Active — Dream Drift:** move an ally or enemy slightly in the CT queue.
- **R4 Passive — Mist Memory:** if an ally survives at low HP, your next heal is stronger.
- **R5 Active — Lull Field:** reduce enemy damage and accuracy in an area.
- **R6 Passive — Water Recall:** when a heal lands on a nearly full ally, restore MP.
- **R7 Active — Shepherd’s Veil:** create a large zone that protects allies.
- **R8 Passive — Moon Stitch:** shields you create also heal slightly over time.
- **R9 Active — Twilight Reprise:** repeat the last support effect at reduced strength.
- **R10 Passive — Shepherd’s Promise:** after Twilight Reprise, your next heal or shield is stronger.
- **Evolution:** into Current Oracle.

## 59. Current Oracle (T4)
Role: future-reader healer | CT: medium-slow | Resource: MP
- **R1 Basic — Oracle Tide:** hit and preview the next enemy action.
- **R2 Passive — Forecast Healing:** heals on low-HP targets are stronger.
- **R3 Active — Tidal Reading:** reveal a target’s weakness and boost team damage against it.
- **R4 Passive — Still Pool:** while a shield is active, your CT cost is lower.
- **R5 Active — Moonline Forecast:** create a zone that predicts and softens incoming damage.
- **R6 Passive — Soft Destiny:** if you prevent damage with shields, gain a small buff.
- **R7 Active — Undertow Prophecy:** reduce enemy CT gain and heal allies over time.
- **R8 Passive — Clear Reflection:** support skills that affect 2+ allies are stronger.
- **R9 Active — Surge of Calm:** large heal and a team-wide speed bump.
- **R10 Passive — Oracle’s Trust:** after Surge of Calm, your next support skill is instant.
- **Evolution:** into Ocean Eclipse.

## 60. Ocean Eclipse (T5)
Role: apex tide mystic | CT: medium | Resource: MP + moon stacks
- **R1 Basic — Eclipse Tide:** wave strike that heals allies and hurts enemies.
- **R2 Passive — Deep Moon:** moon stacks increase healing and control strength.
- **R3 Active — Lunar Flood:** large heal-over-time to allies in an area.
- **R4 Passive — Silent Depths:** enemies in your zones deal less damage.
- **R5 Active — Eclipse Veil:** hide allies in a protective mist.
- **R6 Passive — Flow Memory:** every heal you cast slightly improves the next one.
- **R7 Active — Ocean Sleep:** lull one target into a delayed action state.
- **R8 Passive — Drowning Calm:** enemies that attack through your zones lose a little CT.
- **R9 Active — Moonfall Surge:** huge burst heal plus splash damage to enemies.
- **R10 Passive — Endless Tide:** after Moonfall Surge, your team gains a short shield and CT boost.
- **Evolution:** apex form of the lineage.

---

# 60-Class Summary Notes

- Each lineage contains one clear path from **T1 basic** to **T5 apex**.
- Each class has **4 active rank-gated abilities plus a basic attack**, and **5 passive rank gates**.
- The structure is intentionally data-driven so the whole class set can be stored in JSON/Firestore or a local TypeScript content file.
- The class identities are built from AQ-style archetypal patterns: burst, sustain, tank, support, control, and resource manipulation, but adapted to a **CT-queue combat system**.
- The content is designed so the combat system can later be tuned by adjusting CT cost, cooldown, damage scaling, and passive strength without rewriting the class identities.

