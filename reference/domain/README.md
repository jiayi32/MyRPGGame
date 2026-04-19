# domain/

This folder contains all pure game logic and rules.

## Key modules scaffolded:
- `ctSystem.ts`: Core CT (Charge Time) timeline and queue logic
- `lineageSystem.ts`: Lineage adjacency, evolution, and validation logic
- `runDirector.ts`: Run Director and anomaly system (pure domain logic)
- `combatEngine.ts`: CT-based combat engine (single player focus)

Next steps: Integrate skill resolution, expand combat logic, and connect with UI/features layer.