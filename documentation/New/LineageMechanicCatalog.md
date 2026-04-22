# Lineage Mechanic Catalog

Authoritative spec for the **unique mechanic** attached to each of the 12 lineages, and how that mechanic evolves across the T1 → T5 tier arc. This catalog is the working reference for P1.5 class authoring.

Framework (adopted from the class design review of [ClassDesignBrainstorm.md](ClassDesignBrainstorm.md)):

- `CLASS = (Lineage) × (CombatArchetype)`. Lineage supplies the unique mechanic and elemental flavor; `combatArchetype ∈ { burst_dps, sustain_dps, tank, support, trickster }` supplies the combat-role shape.
- Tier convention is **T1 = simplest starter, T5 = apex** (aligned with [INTEGRATION_REPORT.md](../INTEGRATION_REPORT.md) canonical decisions). If older source material uses the reverse direction, treat it as superseded and translate into T1 → T5 progression.
- Skill and class names in the brainstorm are **inspiration only**. Authoritative names live in code and in [ClassDesignDeepResearch.md](ClassDesignDeepResearch.md). Do not rename existing ids.
- Each lineage eventually covers all 5 combat archetypes as a soft goal. Drakehorn is intentionally offense-skewed; other lineages should spread the archetype slots more evenly.

Status legend:

- **authored** — mechanic is defined in code and the Drakehorn class file implements it.
- **seeded** — mechanic is proposed here; no class content written yet (P1.5 owns the fan-out).

---

## 1. Drakehorn Forge — `heat` — *authored*

- **Unique mechanic:** *Heat*. Drakehorn classes accumulate Heat from basics and DoTs, then spend it for amplified bursts, HP-cost refunds, and cooldown resets.
- **Encoding:** stack-based, modeled as `StatusInstance.stacks` with a `heat_stack` statTag. Not a new `primaryResource`.
- **Cross-ref:** [ClassDesignDeepResearch.md](ClassDesignDeepResearch.md) §Ignis; [src/content/classes/drakehornForge.ts](../../src/content/classes/drakehornForge.ts); brainstorm lines 178–234 (first breakdown, matches tier direction).

| Tier | Class | combatArchetype | Evolution note |
| --- | --- | --- | --- |
| T1 | Ember Initiate | burst_dps | Heat introduced as a ramp buff — consecutive casts boost the next skill. |
| T2 | Flame Berserker | sustain_dps | Heat taxes resources — skills cost HP; Rage Fuel / Berserker’s Pact refund. |
| T3 | Pyre Warlord | support | Heat becomes dual-system — buffs amplify AoE; multi-hit Dragon’s Breath refreshes cooldowns. |
| T4 | Inferno Executioner | burst_dps | Heat converts to execution pressure — low-HP thresholds trigger amplified finishers. |
| T5 | Apocalypse Bringer | trickster | Heat masters tempo — End of Days resets cooldowns on multi-kill; Phoenix Heart loops ultimates. |

---

## 2. Bull Cathedral — `guard_stacks` — *seeded*

- **Unique mechanic:** *Guard Stacks*. Taking hits builds Guard; Guard scales defense AND scales offensive damage through sanctuary / pillar-style finishers.
- **Why this mechanic:** plays into the lineage's "sanctuary / retaliation / immovable presence" theme ([src/content/lineages.ts](../../src/content/lineages.ts)) and gives tanks a damage-via-defense conversion instead of a purely passive role.
- **Cross-ref:** brainstorm lines 571–653, 1634–1705.

| Tier | Working name | combatArchetype | Evolution note |
| --- | --- | --- | --- |
| T5 | Shield Initiate | tank | Guard stacks introduced — taking hits builds Guard, Guard slightly reduces incoming damage. |
| T4 | Bastion Guard | tank | Guard starts scaling offense — heavy strikes deal bonus damage per Guard stack. |
| T3 | Fortress Knight | support | Guard shares — shield effects propagate to nearby allies; CT discounts while shielded. |
| T2 | Iron Warder | tank | Guard becomes control — taunts cannot be ignored; enemies attacking you lose CT progress. |
| T1 | Immutable Wall | trickster | Guard becomes law — once-per-battle "shields cannot break" window; ally shields scale off yours. |

---

## 3. Twin Mirror — `echo` — *seeded*

- **Unique mechanic:** *Echo / Duplicate*. The last active skill repeats at reduced power; decoys absorb hits; mirrored effects amplify.
- **Why this mechanic:** maps directly to the lineage's duplication / misdirection theme; gives casters an adaptive loop instead of fixed rotation.
- **Cross-ref:** brainstorm lines 657–739, 1709–1780.

| Tier | Working name | combatArchetype | Evolution note |
| --- | --- | --- | --- |
| T5 | Arcane Initiate | trickster | Echo introduced — spawn a decoy that draws a hit; simple repeated-skill bonus. |
| T4 | Spellbinder | burst_dps | Echo amplifies — alternating skills deals bonus damage; copies cost less CT. |
| T3 | Chaos Mage | support | Echo shares — copy buffs/debuffs between targets; sigils repeat ally skills. |
| T2 | Reality Weaver | support | Echo predicts — reveal + redirect enemy effects; copied skills cannot miss. |
| T1 | Probability Architect | trickster | Echo dominates — once-per-battle "every skill duplicates" window; mirror crown repeats next skill. |

---

## 4. Tide Shell — `flow_stacks` — *seeded*

- **Unique mechanic:** *Flow Stacks* (dodge / shield rhythm). Successful evasions and shield rebounds feed CT refunds, damage bonuses, and counter-windows.
- **Why this mechanic:** the lineage's "phase drift, CT-skipping, unpredictable positioning" theme ([src/content/lineages.ts](../../src/content/lineages.ts)) resolves into a defense-via-tempo identity.
- **Cross-ref:** brainstorm lines 743–825, 1784–1855.

| Tier | Working name | combatArchetype | Evolution note |
| --- | --- | --- | --- |
| T5 | Rift Initiate | tank | Flow introduced — dodging grants CT refund; first shield each battle is cheaper. |
| T4 | Blink Assassin | burst_dps | Flow accelerates — post-dodge attacks gain speed and damage; moving empowers next skill. |
| T3 | Phase Walker | support | Flow protects allies — guard ally and absorb part of their hit; reflect portion of blocked damage. |
| T2 | Dimensional Hunter | tank | Flow becomes pressure — steal enemy CT on hit; shield breaks deal splash damage. |
| T1 | Singularity Fracture | trickster | Flow masters tempo — reposition all enemies; low-HP trigger becomes full-recovery shield. |

---

## 5. Sunfang Court — `pride_stacks` — *seeded*

- **Unique mechanic:** *Pride Stacks + Blind/Mark*. Buffed state amplifies offense; marked/blinded targets feed execute windows.
- **Why this mechanic:** royalty + radiance + predator authority theme translates into a "bonuses-while-buffed" identity with crit-on-mark execute.
- **Cross-ref:** brainstorm lines 829–911, 1859–1930.

| Tier | Working name | combatArchetype | Evolution note |
| --- | --- | --- | --- |
| T5 | Aspirant Radiant | burst_dps | Pride introduced — attacking builds Pride; low-HP raises crit chance. |
| T4 | Dawnblade Initiate | burst_dps | Pride marks — marked enemies take bonus damage; buffs empower attacks. |
| T3 | Solarian Vanguard | support | Pride buffs team — solar buffs share with allies; blinded targets feed CT refund. |
| T2 | Lumen Judge | support | Pride dominates — team buff + enemy debuff in one cast; crit→CT nudge for allies. |
| T1 | Helios Arbiter | trickster | Pride masters authority — enemy buffs invert into debuffs; judgment parade shields team. |

---

## 6. Thorn Ledger — `marks` — *seeded*

- **Unique mechanic:** *Marks + Debuff Density*. Damage scales with the number of debuffs on the target; execute windows open when debuff count crosses a threshold.
- **Why this mechanic:** precision / DoT / venom-stacking theme resolves into a "more debuffs = more damage" core loop distinct from plain DoT.
- **Cross-ref:** brainstorm lines 915–997, 1934–1999+.

| Tier | Working name | combatArchetype | Evolution note |
| --- | --- | --- | --- |
| T5 | Venom Initiate | burst_dps | Marks introduced — bleed stacks + marked targets take bonus damage. |
| T4 | Plague Hunter | sustain_dps | Marks amplify — poison lowers healing; verdict strikes scale with poison count. |
| T3 | Rot Alchemist | trickster | Marks spread — execute windows below HP threshold; debuffs resist cleansing once. |
| T2 | Blight Tyrant | support | Marks punish control — debuffed enemies easier to execute; thorn field punishes movement. |
| T1 | Death Bloom Entity | trickster | Marks become doctrine — branded targets feed CT; once-per-battle "first debuff kill heals fully". |

---

## 7. Balance Reins — `symmetry` — *seeded*

- **Unique mechanic:** *Symmetry*. Bonuses trigger when stats, buffs, or ally HP are evenly distributed; paired actions scale harder than isolated ones.
- **Why this mechanic:** the support / symmetry / equalization theme is distinct from generic support — it rewards party composition discipline.
- **Cross-ref:** brainstorm lines 1001–1083.

| Tier | Working name | combatArchetype | Evolution note |
| --- | --- | --- | --- |
| T5 | Grace Initiate | support | Symmetry introduced — equal offense/defense boosts stats; balance stacks from paired actions. |
| T4 | Light Herald | burst_dps | Symmetry amplifies — alternating skills stronger; acting after ally empowers next skill. |
| T3 | Sanctum Protector | support | Symmetry equalizes — ally speed normalized; buffs stronger on weaker allies. |
| T2 | Divine Ascendant | support | Symmetry protects — accordance copies strongest ally buff; healing scales with HP evenness. |
| T1 | Judgment Vessel | tank | Symmetry enforces — once-per-battle "next 4 actions cheaper if party is balanced". |

---

## 8. Black Nest — `stealth_bleed` — *seeded*

- **Unique mechanic:** *Stealth + Bleed Execute*. First hit from stealth scales harder; bleeds spread across enemies; low-HP targets feed execute windows.
- **Why this mechanic:** stealth / death / CT-theft theme resolves into an "assassin with spreading pressure" identity.
- **Cross-ref:** brainstorm lines 1087–1169.

| Tier | Working name | combatArchetype | Evolution note |
| --- | --- | --- | --- |
| T5 | Shade Initiate | burst_dps | Stealth introduced — first hit from stealth deals bonus damage; basic attacks apply bleed. |
| T4 | Nightblade | sustain_dps | Bleed amplifies — nested bleeds stack; kills refund HP cost. |
| T3 | Eclipse Stalker | trickster | Marks + execute — mark target, kill refunds CT; dodge boosts damage. |
| T2 | Void Reaver | burst_dps | Decay pressure — debuffs reduce enemy healing; reap all debuffed for burst. |
| T1 | Abyss Sovereign | trickster | Stealth masters tempo — once-per-battle "next three shadow skills act faster"; darkness zone punishes field. |

---

## 9. Arrow Creed — `mark_range` — *seeded*

- **Unique mechanic:** *Mark + Range Discipline*. Damage scales with marks, distance maintained, and stillness between shots; multi-mark windows feed execute.
- **Why this mechanic:** discipline / long-range / momentum theme resolves into a position-disciplined ranged identity.
- **Cross-ref:** brainstorm lines 1173–1255.

| Tier | Working name | combatArchetype | Evolution note |
| --- | --- | --- | --- |
| T5 | Gale Initiate | burst_dps | Marks introduced — accuracy rises against marked targets; first battle mark auto-applied. |
| T4 | Wind Striker | burst_dps | Oath marks — marked enemies easier to crit; stillness after-action boosts ranged damage. |
| T3 | Storm Runner | sustain_dps | Range scales — damage rises with distance maintained; crit rises after ranged hit. |
| T2 | Cyclone Duelist | support | Ally guard — shots intercept projectiles; heal allies on hit; protective long-range buffs. |
| T1 | Skyfracture Herald | trickster | Range masters judgment — once-per-battle "shot may ignore all defense layers". |

---

## 10. Iron Covenant — `hp_cost_corruption` — *seeded*

- **Unique mechanic:** *HP-Cost Corruption*. Sacrifice HP or accept debuffs for amplified effects; corrupted state feeds offensive spikes.
- **Why this mechanic:** oath / endurance / sacrifice / forged power theme resolves into an HP-cost identity distinct from Drakehorn (which uses Heat as the ramp, HP as the fuel).
- **Cross-ref:** brainstorm lines 1259–1341.

| Tier | Working name | combatArchetype | Evolution note |
| --- | --- | --- | --- |
| T5 | Stone Initiate | sustain_dps | HP-cost introduced — pay to temper self/ally; heat-debt taxes CT. |
| T4 | Earthbreaker | tank | Corruption amplifies — healing converts to armor; old oath makes you harder to kill. |
| T3 | Mountain Sentinel | sustain_dps | Corruption feeds offense — debuffs grant damage reduction; contract burn amplifies. |
| T2 | World Anchor | burst_dps | Devil's bargain — accept debuff for offensive spike; low-HP amps gear bonuses. |
| T1 | Titan Core | trickster | Tyranny masters corruption — once-per-battle "next three actions ignore defense"; each kill raises damage ceiling. |

---

## 11. Star Circuit — `voltage_patterns` — *seeded*

- **Unique mechanic:** *Voltage / Pattern Stacks*. Chained skills in specific sequences grant CT discounts, accuracy bonuses, and scaling on extended patterns.
- **Why this mechanic:** CT-manipulation / resource-cycling theme resolves into a "logic pattern" identity — rewards thoughtful sequencing over raw burst.
- **Cross-ref:** brainstorm lines 1345–1427.

| Tier | Working name | combatArchetype | Evolution note |
| --- | --- | --- | --- |
| T5 | Time Initiate | burst_dps | Voltage introduced — repeated patterns build charge; first buff each battle is stronger. |
| T4 | Temporal Slicer | support | Voltage amplifies — precision flow after spell land; stored charge empowers next skill. |
| T3 | CT Strategist | support | Voltage syncs team — ally CT discounts; skills more efficient used in order. |
| T2 | Chrono Breaker | trickster | Voltage destabilizes — adaptive stat mirroring; overclock boosts speed at CT cost. |
| T1 | Timeline Disruptor | support | Voltage masters design — once-per-battle "one skill ignores its CT penalty"; rewrites resistances briefly. |

---

## 12. Dream Ocean — `calm_overflow` — *seeded*

- **Unique mechanic:** *Calm / Overflow-to-Shield*. Healing above full HP converts to shields; sleep/lull effects suppress enemy CT gain.
- **Why this mechanic:** moon / illusion / healing / reactive theme resolves into a support identity where overhealing becomes protection, not waste.
- **Cross-ref:** brainstorm lines 1431–1513.

| Tier | Working name | combatArchetype | Evolution note |
| --- | --- | --- | --- |
| T5 | Fang Initiate | support | Calm introduced — lull lowers enemy damage; support skills grant tiny shields. |
| T4 | Predator Warrior | support | Overflow activates — overheals convert to shields; sleeping enemies take bonus damage. |
| T3 | Apex Hunter | support | Calm shapes field — mist barrier reduces damage; shields boost recovery. |
| T2 | Alpha Devourer | support | Prediction — see enemy CT; heal scales on low-HP allies. |
| T1 | Primal Overlord | trickster | Calm masters ocean — once-per-battle "all support skills cost less CT for a window". |

---

## Authoring checklist for P1.5

When authoring a `seeded` lineage's 5 classes:

1. Start from the evolution table above — each tier's skill + passive design must materially exercise that tier's evolution note.
2. Write the class's `coreLoop`, `damageIdentity`, and `survivalIdentity` first; skills follow from the loop, not the other way around.
3. Keep the 5 combat archetypes roughly spread across the 5 tiers; deviations (like Drakehorn) need an explicit reason.
4. Cross-reference the brainstorm for skill name / flavor inspiration only — do not copy ids or skill lists wholesale.
5. Update this catalog's status column from *seeded* → *authored* when the lineage file lands.
