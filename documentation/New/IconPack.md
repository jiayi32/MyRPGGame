# Icon Pack

## Goal

Document the placeholder icon pack available under `assets/icons/` and the typed registry exposed from `src/assets/icons/`.

The current implementation is intentionally narrow:

- it exposes the PNG pack only
- it binds to the 48px light-mode PNG variants
- it covers solid and brand icons
- it is intended as a placeholder sprite source until authored game art replaces it

## Asset layout

The raw pack lives outside `src/` at `assets/icons/`.

Available source groups:

- `assets/icons/PNG/for-light-mode/`
- `assets/icons/PNG/for-dark-mode/`
- `assets/icons/SVG/solid/`
- `assets/icons/SVG/regular/`
- `assets/icons/SVG/brands/`
- `assets/icons/SVG/purcats/`

Observed counts in the imported pack:

- `solid`: 190 icons
- `regular`: 190 icons
- `brands`: 45 icons
- `purcats`: 23 icons
- PNG sizes: 12px, 16px, 24px, 48px for both light and dark mode folders

## Runtime surface

The game-facing registry lives in `src/assets/icons/`.

Exports:

- `IconStyle = 'solid' | 'regular' | 'brands' | 'purcats'`
- `IconTheme = 'light' | 'dark'`
- `IconSize = 12 | 16 | 24 | 48`
- `SolidIconSlug` union for all 190 solid PNG placeholders
- `BrandIconSlug` union for all 45 brand PNG placeholders
- `SOLID_ICONS` and `BRAND_ICONS` typed lookup maps
- `resolveSolidIcon()` and `resolveBrandIcon()` lookup helpers
- `hasSolidIcon()` and `hasBrandIcon()` string type guards

Current implementation detail:

- only `SOLID_ICONS` and `BRAND_ICONS` are backed by bundled assets
- `regular` and `purcats` are typed as pack vocabulary only; they are not yet exposed through a runtime registry
- all current registry entries point at `PNG/for-light-mode/48px/...`

## Metro constraint

React Native Metro only bundles static image assets when `require()` receives a string literal.

That means this registry must keep explicit literal paths like:

```ts
const fire = require('../../../assets/icons/PNG/for-light-mode/48px/solid/fire.png');
```

Do not replace the registry with template literals, computed paths, `path.join`, or loop-generated `require()` calls. Those patterns typecheck, but Metro will not include the assets in the bundle.

If SVG usage is needed later, that is a separate integration track. The current Expo/Metro setup already handles PNG assets; SVG component imports would require transformer work such as `react-native-svg-transformer`.

## Naming convention

The registry normalizes file names into underscore-delimited slugs.

Examples:

- `fire.png` -> `fire`
- `align-center.png` -> `align_center`
- `arrow-alt circle down.png` -> `arrow_alt_circle_down`
- `phone-ringing high.png` -> `phone_ringing_high`
- `open-ai.png` -> `open_ai`
- `facebook-round.png` -> `facebook_round`

Some upstream filenames contain spelling issues. The exported slug preserves the source spelling so the registry remains a 1:1 mapping to disk:

- `bell-exclaimation.png` -> `bell_exclaimation`
- `calender.png` -> `calender`
- `exclaimation.png` -> `exclaimation`

## Suggested placeholder mappings

These are safe defaults for future UI wiring until bespoke sprites exist.

Suggested gameplay/UI seeds:

- combat or damage actions: `fire`, `bolt`, `sword`-adjacent substitutes such as `badge_check` or `sparkles` where needed
- tank or defense affordances: `shield` is not present, so prefer `lock`, `octagon_check`, or `users_crown`
- healing or support affordances: `heart`, `lightbulb`, `sparkles`
- inventory or loot: `shopping_cart`, `shop`, `wallet`, `box_usd`
- travel or expedition: `plane_departure`, `globe`, `location_pin`
- settings or systems: `cog`, `analytics`, `chart_line`
- social or party: `user`, `users`, `user_check`, `message_dots`
- warnings or failure states: `exclamation_triangle`, `times_circle`, `eye_cross`

Suggested brand placeholders for external links only:

- source or repo links: `github`
- video or content links: `youtube`
- social or community: `discord`, `reddit`, `x`, `threads`

## Known scope limits

- No screen currently consumes this registry.
- No automatic theme switching exists between light and dark PNG folders.
- No size-selection API exists yet; all runtime lookups bind to 48px assets.
- No purcats runtime registry exists yet.
- No component wrapper exists yet for `Image` rendering or fallback handling.

## Validation

The registry is covered by `src/assets/icons/__tests__/registry.test.ts`.

Current checks assert:

- the expected solid and brand entry counts
- every literal `require()` resolves under Jest
- known slugs resolve correctly
- typeguard helpers accept known slugs and reject unknown ones
- solid and brand namespaces do not collide

When extending this pack, keep the test counts and runtime registry in sync.