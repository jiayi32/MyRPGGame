// Run Director and anomaly system (pure domain logic)
// Orchestrates procedural encounters, injects anomalies, adapts to player builds

export interface RunState {
  stage: number;
  lineageId: string;
  ctLoad: number;
  power: number;
  survivability: number;
  burst: number;
  anomalies: string[];
}

export class RunDirector {
  constructor(private state: RunState) {}

  getEncounterType(): 'mini-boss' | 'boss' | 'counter-boss' | 'normal' {
    if (this.state.stage % 30 === 0) return 'counter-boss';
    if (this.state.stage % 10 === 0) return 'boss';
    if (this.state.stage % 5 === 0) return 'mini-boss';
    return 'normal';
  }

  injectAnomaly() {
    // Example: inject a random anomaly
    const anomalies = ['class-drop', 'gear-mutation', 'lineage-shift', 'rule-break'];
    const anomaly = anomalies[Math.floor(Math.random() * anomalies.length)];
    this.state.anomalies.push(anomaly);
    return anomaly;
  }

  updateState(partial: Partial<RunState>) {
    this.state = { ...this.state, ...partial };
  }

  getState() {
    return this.state;
  }
}
