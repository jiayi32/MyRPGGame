# UI Design System — MyRPGGame

> **Version:** 1.0 · **Date:** June 1, 2026 · **Status:** Phase 1 Complete, Phase 2+ Planned
>
> **Design Direction:** Hybrid dark/parchment theme · Pixel typography for key elements · Progressive icon-based art · Rich animation layer
>
> This document defines the complete visual system. Every screen, component, and interaction follows these specifications.

---

## 1. Design Pillars

These 5 principles are derived from analysis of 16+ successful mobile RPG roguelites (Darkest Dungeon, Slay the Spire, Brave Frontier, Rage of Bahamut, Wildfrost, Dicey Dungeons, Peglin, Voidpets, Hades, Into the Breach, Shattered Pixel Dungeon, Soda Dungeon, Kingdom of Loathing, Luck be a Landlord, Knights of Pen and Paper, A Dark Room). Every UI decision must satisfy at least 3 of these pillars.

### Pillar 1: Readability Before Ornament
Mobile screens are small. Combat information (HP, CT, status, intent) must be scannable in under 2 seconds. Darkest Dungeon and Slay the Spire succeed because their critical data (health bars, intent icons, energy) is instantly legible. Decorative flourishes frame information — they never obscure it.

### Pillar 2: Mood Matches Mode
The hybrid theme serves a functional purpose: dark, high-contrast backgrounds reduce eye strain during extended combat sessions and make colored elements (HP bars, CT ticks, status badges) pop. Warm parchment tones in hub/narrative screens signal safety, reflection, and progression. This is the Rage of Bahamut principle — battle screens feel dangerous; town screens feel like home.

### Pillar 3: Every Number Tells a Story
Pixel typography for damage numbers, CT ticks, and resource values isn't just nostalgic — it makes numeric changes feel consequential. When "247" pops in a pixel font, it lands differently than in system sans-serif. This is the Brave Frontier + classic JRPG principle.

### Pillar 4: Touch is The Only Input
Every interactive element must be ≥44pt in its smallest dimension (Apple HIG). The bottom-third of the screen is the primary interaction zone (thumb reach). Critical actions live in the action dock; secondary actions live in the header. No gesture requires precision beyond a thumb tap.

### Pillar 5: Motion Has Meaning
Animations aren't decoration — they're information. CT bar pulsing communicates urgency. Card flips communicate discovery. Screen transitions communicate journey direction (push right = forward, push left = back). Particles on crits communicate impact. Every animation answers "what just happened?"

---

## 2. Color System

### 2.1 Dual-Mode Palette

The hybrid theme uses two background contexts. Components consume colors via `useTheme()` which automatically resolves to the current mode.

#### Dark Mode (Combat, Dungeon, Boss, Draft, Run Map screens)

| Token | Hex | Usage |
|---|---|---|
| `bg-dark-primary` | `#1a1410` | Battle screen background |
| `bg-dark-secondary` | `#231d16` | Card backgrounds on dark |
| `bg-dark-tertiary` | `#2d261e` | Elevated surfaces (modals, tooltips) |
| `text-dark-primary` | `#f0e8d8` | Primary text on dark |
| `text-dark-secondary` | `#b8a890` | Secondary/muted text on dark |
| `text-dark-dim` | `#706858` | Disabled/hint text on dark |
| `border-dark` | `#3d3628` | Card borders on dark |
| `border-dark-active` | `#8b7355` | Active/selected borders on dark |

#### Parchment Mode (Hub, Narrative, Shop, Equipment, Profile, Sign In screens)

| Token | Hex | Usage |
|---|---|---|
| `bg-parchment-primary` | `#f5f0e8` | Hub/main screen background |
| `bg-parchment-secondary` | `#fefcf7` | Card backgrounds on parchment |
| `bg-parchment-tertiary` | `#ede4d3` | Elevated surfaces on parchment |
| `text-parchment-primary` | `#2b1f10` | Primary text on parchment |
| `text-parchment-secondary` | `#6b5d4a` | Secondary/muted text on parchment |
| `text-parchment-dim` | `#a89880` | Disabled/hint text on parchment |
| `border-parchment` | `#d8cdbb` | Card borders on parchment |
| `border-parchment-active` | `#8b6914` | Active/selected borders on parchment |

#### Accent & Feedback Colors (mode-independent)

| Token | Hex | Usage |
|---|---|---|
| `accent-gold` | `#c8a040` | Primary action buttons, rare items, CT ready pulse |
| `accent-crimson` | `#c04040` | Damage numbers, enemy HP, danger, destructive actions |
| `accent-emerald` | `#3a8a5a` | Healing, player HP, buffs, success |
| `accent-sapphire` | `#4070c0` | MP/mana, magic skills, shield, info |
| `accent-amethyst` | `#7040a0` | Anomaly, corruption, void, special/ultimate skills |
| `accent-amber` | `#d08030` | Crit damage, warnings, elite markers |
| `accent-frost` | `#60a0c0` | Frost/ice skills, slow/control effects |
| `accent-shadow` | `#504060` | Shadow/umbral skills, stealth |

#### Augment Tier Colors

| Tier | Background | Text | Border |
|---|---|---|---|
| Bronze | `#fdf2e0` | `#8b6914` | `#c8a040` |
| Silver | `#eceff1` | `#546e7a` | `#90a4ae` |
| Gold | `#fff8e1` | `#b8860b` | `#ffd54f` |
| Prismatic | `#f3e5f5` | `#7b1fa2` | `#ce93d8` |

#### Augment Category Colors

| Category | Background | Border | Text |
|---|---|---|---|
| Neutral | `#f5f5f5` | `#9e9e9e` | `#555555` |
| Positive | `#e8f5e9` | `#4a7a3a` | `#2e5d24` |
| Sacrificial | `#fdecea` | `#c0392b` | `#8b1a12` |

#### Room Type & Stage Colors

| Type | Background | Border | Text |
|---|---|---|---|
| Normal | `#f2f4f8` | `#c2cad9` | `#384860` |
| Elite | `#fee9df` | `#d77b50` | `#8b3516` |
| Event | `#efe8ff` | `#8f79d6` | `#48308e` |
| Treasure | `#fff2d6` | `#d4a248` | `#805407` |
| Rest | `#e9f7eb` | `#65a974` | `#1f6433` |
| Merchant | `#e4f4ff` | `#4d91c4` | `#165984` |
| Anomaly | `#f8e5ff` | `#b76dd1` | `#6d2e8f` |
| Mini-Boss | `#ffe6dc` | `#d1653a` | `#8d2d10` |
| Gate Boss | `#e8f6ed` | `#5ea577` | `#215f39` |
| Counter Boss | `#ffe4e4` | `#c75d5d` | `#7b1f1f` |

#### Forecast Intent Colors (Battle CT Timeline)

| Intent | Background | Foreground |
|---|---|---|
| Player | `#dff2e5` | `#1f5f3a` |
| Burst | `#fde3e3` | `#8b1a1a` |
| Sustain | `#e4f2e7` | `#245b2f` |
| Control | `#e3ecfb` | `#2b4f93` |
| Summon | `#efe4fb` | `#5d3a8f` |
| Basic | `#eceef5` | `#465078` |
| Unknown | `#f1f2f7` | `#606a88` |

#### Damage Popup Colors

| Type | Color |
|---|---|
| Damage | `#c04040` |
| Heal | `#3a8a5a` |
| Crit | `#ff7030` |
| Mana | `#4070c0` |
| Shield | `#60a0c0` |

### 2.2 Semantic Color Usage Rules

1. **Red/crimson** = damage, enemy HP, danger, loss. Never use for positive effects.
2. **Green/emerald** = healing, player HP, buffs, success. Never use for enemy elements.
3. **Gold/amber** = premium, rare, crit, CT-ready. Use sparingly — overuse diminishes impact.
4. **Blue/sapphire** = mana, magic, shield, information. Neutral, calming.
5. **Purple/amethyst** = anomaly, corruption, void, ultimate abilities. Otherworldly.
6. **Parchment backgrounds** = safety, hub, narrative, progression. Never use for active combat.
7. **Dark backgrounds** = danger, combat, focus, dungeon. Never use for relaxed browsing screens.

---

## 3. Typography System

### 3.1 Font Family Stack

| Role | Font | Fallback | Weight | Usage |
|---|---|---|---|---|
| **Display (Pixel)** | `"Press Start 2P"` | `monospace` | 400 | Damage numbers, CT ticks, stage counter, gold count |
| **Heading** | `"Cinzel"` | `serif` | 600–700 | Screen titles, boss names, lineage names |
| **Body** | `"Inter"` | `sans-serif` | 400–500 | Descriptions, stats, labels, body text |
| **UI Label** | `"Inter"` | `sans-serif` | 600 | Button text, tab labels, section headers |
| **Mono Data** | `"JetBrains Mono"` | `monospace` | 400 | Stat values, combat log, debug info |

**Implementation Note:** `"Press Start 2P"` is a Google Font (free, OFL licensed). It's intentionally chunky at small sizes — use only at ≥12px. All four fonts are loaded via `@expo-google-fonts` in `App.tsx`.

### 3.2 Type Scale

| Token | Size | Line Height | Usage |
|---|---|---|---|
| `text-xs` | 10px | 14px | Tiny labels, cooldown counters |
| `text-sm` | 12px | 16px | Body small, secondary info, stat labels |
| `text-base` | 14px | 20px | Body text, card descriptions, skill text |
| `text-md` | 16px | 22px | Button text, list items, section headers |
| `text-lg` | 20px | 26px | Screen titles, card titles |
| `text-xl` | 24px | 30px | Boss names, major headings |
| `text-2xl` | 32px | 38px | Victory/defeat screen, main title |
| **Pixel scale** | | | |
| `pixel-sm` | 12px | 16px | CT counter, small damage pops |
| `pixel-md` | 16px | 20px | Standard damage numbers, gold count |
| `pixel-lg` | 22px | 26px | Crit damage, stage counter |
| `pixel-xl` | 30px | 34px | Victory gold total, boss HP |

### 3.3 Typography Rules

1. Pixel font (`Press Start 2P`) applies ONLY to: damage/healing numbers, CT countdown digits, gold/currency values, stage counter, and combo/crit labels.
2. Never use pixel font for body text or descriptions — readability would suffer.
3. Serif heading font applies to: screen titles, boss names, lineage names, narrative text.
4. All interactive labels (buttons, tabs, chips) use sans-serif at `font-weight: 600`.
5. Maximum 3 font families visible on any single screen.

---

## 4. Icon & Emblem Language

### 4.1 Design Philosophy

Since the art direction is progressive (icon-based v1, portraits later), the icon system carries significant identity weight. Every lineage, class, skill type, and room type needs a distinct, readable symbol. All icons are 24×24dp viewBox SVG, stroke-based at 1.5px stroke width, implemented in `src/components/atoms/Icon.tsx`.

### 4.2 Icon Categories

#### Tab Bar Icons
| Name | Concept |
|---|---|
| `castle` | Keep/tower silhouette — Home tab |
| `coin-sack` | Bag with coin circles — Shop tab |
| `shield` | Shield with checkmark — Equipment tab |
| `crest` | Diamond with circle center — Profile tab |

#### Action Icons
| Name | Concept |
|---|---|
| `sword` | Crossed blades — attack/battle |
| `close` | X mark — dismiss/cancel |
| `back` | Chevron left — navigation back |
| `settings` | Gear/cog — settings |
| `info` | Circle with "i" — information |
| `lock` | Padlock — locked content |
| `check` | Checkmark — confirm/success |

#### Room Type Icons (geometric sigils)
| Name | Shape |
|---|---|
| `battle` | Circle |
| `elite` | Diamond |
| `event` | Hexagon |
| `treasure` | Octagon |
| `rest` | Cross/plus |
| `merchant` | Scales/bag |
| `anomaly` | Inverted triangle |
| `mini-boss` | Pentagon |
| `gate-boss` | Shield shape |
| `counter-boss` | Circle with X |

#### Skill Tag Icons
| Name | Concept |
|---|---|
| `burst` | Starburst/explosion |
| `sustain` | Circular arrows |
| `control` | Linked circles |
| `ct-manipulation` | Clock with arrows |
| `defense-break` | Cracked shield |
| `execute` | Circle with X |

#### Element Runes
| Name | Concept |
|---|---|
| `fire` | Flame teardrop |
| `frost` | Crystal/ice shard |
| `shadow` | Filled circle with ring |
| `light` | Sun with rays |
| `physical` | Square with cross |
| `arcane` | Star polygon |

#### Status & Resource Icons
| Name | Concept |
|---|---|
| `heart` | Heart — HP |
| `mana` | Star — MP |
| `shield-icon` | Shield — shield/defense |
| `skull` | Skull — death/elite |
| `clock` | Clock — CT/wait |
| `gold` | Circle with up-arrow |
| `cell` | Hexagonal crystal |

### 4.3 Portrait Zones (Future Art)

All character/enemy display areas must reserve space for future sprite/portrait art. Standard sizes:

| Context | Reserved Space | Aspect Ratio |
|---|---|---|
| Player unit (battle) | 80×80px | 1:1 |
| Enemy unit (battle) | 64×64px | 1:1 |
| Boss unit (battle) | 120×120px | 1:1 |
| Class card (selection) | 48×48px | 1:1 |
| Companion (if added) | 56×56px | 1:1 |

In v1, these zones display the emblem/crest on a colored background.

---

## 5. Component Library

### 5.1 Cards (`<Card>`)

The universal container for selectable content. Implemented at `src/components/atoms/Card.tsx`.

**Base Card Spec:**
- Border radius: 10px
- Border: 1.5px solid (context-dependent via theme)
- Padding: 14px (16px for narrative variant)
- Gap between cards in a list: 10px

**Card Variants:**

| Variant | Distinguishing Feature | Used In |
|---|---|---|
| `selection` | Radio-like selection state with gold border | Class select, draft screens |
| `stat` | Internal horizontal stat rows | Equipment detail, profile |
| `draft` | Category color stripe on left edge (4px) | Augment/Passive/Skill draft |
| `room` | Room-type color background + sigil | Run Map |
| `narrative` | Larger padding (20px), serif title, italic body | Onboarding, event screens |

**Card States:**

| State | Visual Change | Animation |
|---|---|---|
| Default | Base styling | — |
| Pressed | Scale to 0.97, opacity 0.85 | 100ms spring |
| Selected | Border color → gold, border width → 2px | 200ms ease |
| Disabled | Opacity 0.5, no touch response | 200ms fade |

### 5.2 Buttons (`<PrimaryButton>`)

Implemented at `src/components/atoms/PrimaryButton.tsx`. Updated to use design tokens.

**Variants:**

| Variant | Background | Text | Usage |
|---|---|---|---|
| `primary` | `accent-gold` (#c8a040) | Dark (#1a1410) | Main actions, confirm |
| `secondary` | Transparent | `accent-gold` | Secondary actions |
| `destructive` | `accent-crimson` (#c04040) | White | Forfeit, end run, sell |

**Dimensions:**
- Height: 48px (56px for hero actions)
- Border radius: 8px
- Min width: 120px
- Full-width: stretches to container

**States:** default → pressed (scale 0.96, 100ms) → disabled (opacity 0.4) → busy (spinner replaces text)

### 5.3 Bars (`<Bar>`, `<UnitBars>`)

Animated stat bars with smooth Reanimated transitions. Implemented at `src/components/atoms/Bar.tsx`.

| Variant | Height | Fill Color | Track Color | Special Behavior |
|---|---|---|---|---|
| `hp` | 12px (player) / 8px (enemy) | Green→Amber→Red gradient | `#3d2a20` | Color interpolates by fill % |
| `mp` | 8px | Sapphire | `#1a2a3a` | — |
| `ct` | 6px | Gold | `#2d261e` | Pulsing glow at ≤30% fill |
| `shield` | 4px | Sapphire (60% opacity) | Transparent | Overlays above HP bar |

**Features:**
- `pixelLabel` prop: shows current/max in pixel font
- `showLabel` prop: toggles numeric overlay
- `width` prop: `'100%'` or numeric px
- `UnitBars` composite: stacks Shield + HP + MP in one component

### 5.4 Theme Text (`<ThemeText>`)

Typography-aware text component. Implemented at `src/components/atoms/ThemeText.tsx`.

**`textRole` prop values:**

| Role | Font | Typical Sizes | Usage |
|---|---|---|---|
| `pixel` | Press Start 2P | sm, md, lg, xl | Damage numbers, CT, currency |
| `heading` | Cinzel | lg, xl, 2xl | Titles, boss names |
| `body` | Inter | xs, sm, base, md | Descriptions, stats |
| `label` | Inter (semibold) | — | Button text, chips |
| `mono` | JetBrains Mono | sm, base | Combat log, debug |
| `narrative` | Cinzel (italic) | base | Story text |

**Additional props:** `colorKey` (primary/secondary/dim — auto-resolves per theme), `uppercase`, `align`

### 5.5 Status Chips (`<StatusChip>`, `<StatusChipRow>`)

Pill-shaped indicators for status effects. Implemented at `src/components/atoms/StatusChip.tsx`.

- Height: 20px, pill shape (border-radius: 999px)
- Variants: `positive` (emerald), `negative` (crimson), `neutral` (sapphire)
- Optional: icon character, count number
- `StatusChipRow`: horizontal row with "+N more" overflow (max 4 visible)

### 5.6 Icon (`<Icon>`)

SVG icon system. Implemented at `src/components/atoms/Icon.tsx`.

```tsx
<Icon name="sword" size={24} color={colors.accent.gold} />
```

40+ icons covering tab bar, actions, room types, skill tags, elements, status, and resources. All are 24×24dp viewBox, 1.5px stroke, pure SVG — no image assets needed.

### 5.7 Screen Wrapper (`<ScreenWrapper>`)

Per-screen theme mode + safe area handler. Implemented at `src/components/atoms/ScreenWrapper.tsx`.

```tsx
<ScreenWrapper mode="dark">
  {/* screen content auto-gets dark background + safe area padding */}
</ScreenWrapper>
```

**`mode` values per screen:**
- `"dark"`: Battle, Run Map, Passive/Skill/Augment Draft, Reward Resolution
- `"parchment"`: Hub, Sign In, Onboarding Narrative, Class Select, Risk Contract Select, Equipment, Shop, Profile, Inn Decision

### 5.8 Modals & Overlays (Planned)

**Standard Modal:**
- Background: `bg-dark-tertiary` with 95% opacity + backdrop blur
- Border: 1px `border-dark-active`, border-radius: 14px
- Max dimensions: 90vw × 80vh
- Entry: slide up + fade, 250ms spring

**Tooltip:**
- Background: `#2d261e` at 98% opacity
- Border: 1px `accent-gold` at 50% opacity, border-radius: 8px
- Entry: fade + slight translate, 150ms

**Toast Notification:**
- Position: top of screen, below status bar
- Height: 40px, auto-dismiss after 2.5s
- Types: success (green), error (red), info (blue), reward (gold)

### 5.9 CT Timeline Forecast Strip (Planned — Phase 2)

The signature UI element. Horizontal scrolling strip showing upcoming turns.

**Each slot contains:**
- Unit icon/crest (24×24px) in a circle
- CT countdown number (pixel-sm) below the circle
- Intent icon (16×16px) — what the unit will do (attack, skill, buff, unknown)

**Intent color coding:**
- Player action: light green background
- Enemy burst: light red background
- Enemy sustain: muted green background
- Enemy control: light blue background
- Enemy unknown: grey background

### 5.10 Event Log (Planned — Phase 2)

Scrollable combat log at battle screen bottom.

- Max 3 lines collapsed, expands on swipe up
- Font: 11px `JetBrains Mono`
- Color-coded: damage (crimson), heal (emerald), buff (sapphire), debuff (amethyst)
- Format: `[Turn X] Unit Action → Result`

### 5.11 Run Map Graph (Planned — Phase 2)

Branching one-way graph visualization.

- Nodes: 36×36px circles with room-type sigil icons
- Edges: 2px solid lines (traversed: gold, available: sapphire, locked: grey 30%)
- Current node: pulsing gold ring
- Boss nodes: 1.5× larger with crimson ring

---

## 6. Screen-by-Screen Design

### Screen Theme Assignment

| Screen | Theme Mode | Priority |
|---|---|---|
| SignInScreen | `parchment` | Low — first impression |
| HubScreen | `parchment` | High — home base |
| OnboardingNarrativeScreen | `parchment` | Medium — sets tone |
| ClassSelectScreen | `parchment` | High — key decision |
| RiskContractSelectScreen | `parchment` | Medium — pre-run setup |
| RunMapScreen | `dark` | High — strategic navigation |
| BattleScreen | `dark` | Critical — core gameplay |
| RewardResolutionScreen | `dark` | High — reward feedback |
| PassiveDraftScreen | `dark` | Medium — mid-run choice |
| SkillDraftScreen | `dark` | Medium — mid-run choice |
| AugmentDraftScreen | `dark` | Medium — mid-run choice |
| InnDecisionScreen | `parchment` | Low — rest nodes |
| EquipmentScreen | `parchment` | Medium — inventory |
| ShopScreen | `parchment` | Medium — economy |
| ProfileScreen | `parchment` | Low — meta-progression |

### 6.1 BattleScreen ⬛

**Purpose:** The core gameplay screen. CT-based combat with forecast, action selection, and feedback.

**Layout (top→bottom):**

1. **Enemy Display** (top 25%): Enemy rows with portrait zone (left) + HP bar + status chips + intent icon. Boss: larger portrait zone with mechanic indicators.
2. **CT Timeline Forecast** (middle-top, horizontal scrollable strip): Upcoming turns with unit icons, CT countdown numbers (pixel-sm), intent icons (16×16px). Current turn highlighted with gold ring.
3. **Player Status** (middle): Portrait zone + HP/MP bars (`<UnitBars>`) + status chips (`<StatusChipRow>`)
4. **Event Log** (middle-bottom, collapsible): 3 lines collapsed, expandable on swipe up. Mono font, color-coded.
5. **Action Dock** (bottom, fixed): 4–6 ability buttons horizontal scrollable. Each: skill glyph + CT cost badge + cooldown overlay. Basic Attack always leftmost.
6. **Target Selection Overlay**: Appears over enemies when single-target skill is selected. Highlight ring on valid targets. Cancel button.

**Key Behaviors:**
- Critical HP (<20%): HP bar pulses red, subtle screen-edge red vignette
- CT Ready (CT ≤ 0): gold pulse on action dock
- Boss encounters: boss name in serif-xl, wider layout

### 6.2 HubScreen 🟫

**Purpose:** Home base. Shows run status, progression, entry points.

**Layout:**
1. Header: Greeting + settings gear icon
2. Active Run Card (if mid-run): stage (pixel-lg), class name (serif), contract badges, prominent "Resume" button
3. "Start New Run" button (primary, 56px height — hero element when no active run)
4. Progression Summary: class rank, lineage rank, currency (pixel-md)
5. Quick-nav chips: Shop · Equipment · Profile

### 6.3 RunMapScreen ⬛

**Purpose:** Choose next room in the branching run.

**Layout:**
1. Header strip: Stage counter (pixel-xl, gold), zone name, currency
2. Main area: scrollable graph (70% of screen)
3. Room condition chips on elite/boss nodes
4. Legend bar: room type sigils + names (collapsible)
5. Selected room detail + "Enter" button

### 6.4 RewardResolutionScreen ⬛

**Purpose:** Post-battle settlement.

**Layout:**
1. Stage result banner: "Victory!" (text-2xl serif, gold)
2. Rewards: gold (pixel-lg), gear drops (cards), ascension cells, XP bar
3. Vault/Banked split (checkpoint stages 5, 10, 20, 30): two-column comparison with clear "safe" (green shield) vs "at risk" (red !) visual language
4. Decision buttons: "Vault Now" (secondary) / "Press On" (primary) — or "Continue" / "End Run"

### 6.5 Draft Screens (PassiveDraft, SkillDraft, AugmentDraft) ⬛

**Common Layout:**
1. Header: draft type + "Pick 1 of 3" + stage indicator
2. 3 draft cards vertical list
3. Each card: icon/emblem zone, name (serif), description, tags/badges
4. Category indicator: 4px left border stripe
5. "Confirm" button + "Skip" link

### 6.6 ClassSelectScreen 🟫

**Layout:**
1. Header: "Choose Your Class" (text-xl serif)
2. Grid of class cards (2 columns)
3. Each card: lineage crest, class name (serif), tier badge, unlock status
4. Selected class detail panel (bottom sheet)
5. "Select Risk Contracts" chip → "Begin Your Run" button

### 6.7 EquipmentScreen 🟫

**Layout:**
1. Header + gear slot count
2. Slot sections (Weapon / Armor / Accessory): equipped gear card or "Empty Slot" placeholder
3. Each gear card: icon, name, stats, Temper button
4. Stat summary footer

### 6.8 ShopScreen 🟫

**Layout:**
1. Header + currency display (pixel-md)
2. Filter chips: All / Weapon / Armor / Accessory
3. Offer list: gear cards with price tag + "Buy" button

### 6.9 ProfileScreen 🟫

**Layout:**
1. Header: player name, account level
2. Class progression grid
3. Lineage crests with rank indicators
4. Stats summary
5. "Sign Out" button (destructive)

### 6.10 SignInScreen 🟫

**Layout:**
1. Game title/logo (centered, text-2xl serif, gold)
2. Tagline: "Forge Your Lineage" (italic, muted)
3. Card: Email + Password fields + Sign In button
4. Toggle: "New to the realm? Register"

### 6.11 OnboardingNarrativeScreen 🟫

**Layout:**
1. Full-screen scrollable narrative cards
2. Each card: numbered beat (01, 02, 03...), italic body (serif), decorative divider
3. Progress dots
4. "Choose Your Class" button on final card + "Skip" link

---

## 7. Navigation & Shell

### 7.1 Bottom Tab Bar

**Visual:**
- Background: `#231d16` — consistent dark bar across all screens
- Height: 56px (includes safe area)
- Active tab: gold icon + label
- Inactive tab: grey icon, no label
- Divider: 1px top edge

**Tabs:** Home (castle icon) · Shop (coin-sack icon) · Equipment (shield icon) · Profile (crest icon)

### 7.2 Screen Transitions

| Transition | Direction | Animation | Duration |
|---|---|---|---|
| Hub → Narrative | Push right | Slide left | 250ms ease-out |
| Narrative → ClassSelect | Push right | Slide left | 250ms ease-out |
| ClassSelect → RunMap | Push right | Slide left | 250ms ease-out |
| RunMap → Battle | Fade through black | Crossfade | 300ms |
| Battle → Reward | Fade through gold | Crossfade + gold flash | 400ms |
| Reward → RunMap (Press On) | Push right | Slide left | 250ms |
| Reward → Hub (Vault Now) | Push left | Slide right | 350ms ease-in |
| Any → Draft screen | Scale up | Card expand | 350ms spring |
| Draft → next | Scale down + fade | Card collapse | 250ms |

### 7.3 Safe Areas

- Top: respect iOS Dynamic Island / Android notch
- Bottom: respect home indicator area
- Content never extends under system bars
- Action dock (battle) sits above bottom safe area

---

## 8. Animation Specification

### 8.1 Animation Principles

1. **No animation exceeds 400ms for interactive elements**
2. **Spring physics for direct manipulation** (button presses, card selections)
3. **Ease-out for entries**, **ease-in for exits**
4. **Stagger children by 30–80ms** in lists for perceived performance
5. **Every animation has a purpose** — if you can't answer "what does this communicate?", remove it

### 8.2 Animation Reference Table

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| **Damage popup** | Damage dealt | Float up 30px + fade out | 700ms | ease-out |
| **Crit damage** | Critical hit | Float up 40px + scale 1.3→1 + orange + screen shake 2px | 800ms | spring |
| **Heal number** | Healing | Float up 25px + fade out, green | 600ms | ease-out |
| **Ability cast pulse** | Skill used | Gold ring expand from button 0→60px + fade | 380ms | ease-out |
| **CT bar fill** | Continuous | Width tween smooth | real-time | linear |
| **CT ready pulse** | CT ≤ 30% | Bar glow pulse + subtle scale | loop 800ms | ease-in-out |
| **HP bar change** | Damage/heal | Width tween | 300ms | ease-out |
| **Enemy death** | HP = 0 | Fade out + height collapse | 300ms | ease-in |
| **Card select** | Tap | Scale 1→0.97→1 + border color | 200ms | spring |
| **Card enter (list)** | Mount | Fade in + translateY 20→0 | 250ms | ease-out |
| **Draft card reveal** | Screen mount | 3D flip (rotateY 90→0) + scale 0.8→1 | 600ms | spring |
| **Boss intro** | Boss stage start | Name plate slam + screen shake + dark vignette | 800ms | spring |
| **Victory flash** | Stage clear | Gold overlay 0→0.8→0 opacity | 400ms | ease-in-out |
| **Defeat desaturate** | Player death | Screen desaturate 0→100% | 500ms | ease-in |
| **Toast notification** | Event | Slide down from top + stay 2.5s + slide up | 300ms in, 200ms out | ease-out, ease-in |

### 8.3 Particle Effects (Planned)

| Effect | Trigger | Spec |
|---|---|---|
| **Gold sparkle** | Currency gain, vault | 8–12 small gold dots burst outward 40px, fade 600ms |
| **Crit slash** | Critical hit | 3 angled slash marks appear + fade, orange, 500ms |
| **Heal glow** | Healing | Soft green circles expand from unit center, 400ms |
| **Level-up burst** | Rank up / evolution | Gold rays burst from unit, 800ms |

### 8.4 Reduced Motion

- Respect `AccessibilityInfo.isReduceMotionEnabled()`
- When enabled: disable non-essential animations (card flips, particles, transitions)
- Keep functional animations (HP bar changes, CT bar — these convey information)

---

## 9. Mobile-First Layout Rules

### 9.1 Touch Target Minimums
- All tappable elements: ≥44×44px
- Critical actions (attack, confirm): ≥48px height
- Extend touch area beyond visual bounds using `HitSlop` (8px all sides)

### 9.2 Thumb Zone Map
- **Primary zone** (bottom 1/3): action buttons, confirm, primary navigation
- **Secondary zone** (middle 1/3): scrollable content, card selection
- **Tertiary zone** (top 1/3): information display, back navigation

### 9.3 Scroll Behavior
- All lists use `FlatList` with `keyExtractor` for performance
- Never nest scrollable views
- Pull-to-refresh only where server data is fetched

### 9.4 Orientation
- **Portrait only** for v1

---

## 10. Accessibility Guidelines

### 10.1 Contrast Ratios
- Body text: ≥4.5:1 (WCAG AA)
- Large text (≥18px bold): ≥3:1
- Pixel font damage numbers: dark outline/stroke for contrast on any background

### 10.2 Screen Reader Support
- Interactive elements: `accessibilityLabel` with descriptive text
- Decorative elements: `accessibilityHidden={true}`
- CT timeline: announce "Next: [Unit] will [Action] in [N] ticks"
- HP bars: announce "Player HP: 75 of 100, 75 percent"

### 10.3 Haptic Feedback (Planned)
- Ability cast: light impact
- Critical hit: heavy impact
- Card select: selection changed
- Stage clear: success notification

---

## 11. Asset Requirements

### 11.1 Icon Set ✅ Implemented
40+ SVG icons in `src/components/atoms/Icon.tsx`. No external image assets needed.

### 11.2 Fonts ✅ Installed
- `Press Start 2P` — Google Fonts (OFL)
- `Cinzel` — Google Fonts (OFL)
- `Inter` — Google Fonts (OFL)
- `JetBrains Mono` — Google Fonts (OFL)

### 11.3 Future Art Placeholders
- Player unit portrait: 80×80px
- Enemy portraits (6–8 archetypes): 64×64px
- Boss portraits (3): 120×120px
- Class crest variations (60): 48×48px
- Background textures: parchment pattern, dark stone pattern (tileable, 256×256px)

---

## 12. Implementation Status

### ✅ Phase 1: Design Foundation (Complete — June 1, 2026)

| File | Status |
|---|---|
| `src/design/colors.ts` | ✅ Complete — full dual-mode color token system |
| `src/design/typography.ts` | ✅ Complete — 4-font type scale + pre-built styles |
| `src/design/spacing.ts` | ✅ Complete — spacing, radius, touch target tokens |
| `src/design/ThemeContext.tsx` | ✅ Complete — theme provider + useTheme() hook |
| `src/design/index.ts` | ✅ Complete — barrel export |
| `src/components/atoms/Card.tsx` | ✅ Complete — 5 variants, all states |
| `src/components/atoms/Bar.tsx` | ✅ Complete — HP/MP/CT/Shield + UnitBars |
| `src/components/atoms/ThemeText.tsx` | ✅ Complete — 6 text roles |
| `src/components/atoms/StatusChip.tsx` | ✅ Complete — 3 variants + row |
| `src/components/atoms/Icon.tsx` | ✅ Complete — 40+ SVG icons |
| `src/components/atoms/ScreenWrapper.tsx` | ✅ Complete — per-screen theme + safe area |
| `src/components/atoms/PrimaryButton.tsx` | ✅ Updated — design token migration |
| `src/components/atoms/index.ts` | ✅ Updated — barrel exports |
| `App.tsx` | ✅ Updated — Google Fonts loading |
| `package.json` | ✅ Updated — react-native-svg + font packages |

### 🔲 Phase 2: Core Screen Polish (Planned)

1. Redesign BattleScreen with CT forecast strip, action dock, bars, status chips
2. Redesign HubScreen with active run card, progression summary
3. Redesign RunMapScreen with graph visualization and animated edges
4. Add screen transitions per animation spec

### 🔲 Phase 3: Draft & Reward Screens (Planned)

1. Build unified draft card component
2. Redesign RewardResolutionScreen with vault/banked visualization
3. Add draft card flip animation

### 🔲 Phase 4: Supporting Screens (Planned)

1. Redesign ClassSelectScreen with grid layout
2. Redesign EquipmentScreen + ShopScreen
3. Redesign ProfileScreen with progression grid
4. Redesign SignInScreen + OnboardingNarrativeScreen

### 🔲 Phase 5: Animation & Polish (Planned)

1. Implement particle effects
2. Add haptic feedback
3. Implement reduced-motion support
4. Performance audit (60fps target)
5. Accessibility audit

---

## 13. Design Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-01 | Hybrid dark/parchment theme | Chosen over pure dark or pure parchment. Dark for combat focus, parchment for hub safety. |
| 2026-06-01 | Progressive art (icons now, portraits later) | Solo dev constraints. Design UI to accommodate future portrait art zones. |
| 2026-06-01 | Pixel typography for key elements | Evokes classic RPG nostalgia. `Press Start 2P` for damage numbers, CT ticks, currency. |
| 2026-06-01 | Rich animation layer | Differentiates from "basic" current state. Full Reanimated usage for screen transitions, particles, card flips. |
| 2026-06-01 | `Press Start 2P` as primary pixel font | Free (OFL), well-known, good legibility at ≥12px. |
| 2026-06-01 | `Cinzel` for serif headings | Free (OFL), fantasy character without being illegible. |
| 2026-06-01 | `Inter` for body/UI text | Free (OFL), excellent screen readability, variable weight support. |
| 2026-06-01 | `JetBrains Mono` for combat log | Free (OFL), coding font with clear distinction between similar characters (0/O, 1/l). |
| 2026-06-01 | Portrait-only orientation | Simplifies layout. Landscape adds complexity without clear RPG benefit for v1. |
| 2026-06-01 | 40+ SVG inline icons | No external image assets needed. Stroke-based for consistent weight. |

---

*This document is the single source of truth for all visual design decisions. All PRs touching UI should reference relevant sections. When design conflicts arise, this document is authoritative — update it after resolution.*
