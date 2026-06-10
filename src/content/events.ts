// ─── Event Room Content ──────────────────────────────────────────
// Simple tradeoff scenarios for Event rooms on the Run Map.
// Events present 2-3 choices with costs and rewards.

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  /** What the player pays or risks. */
  cost?: {
    hpPercent?: number;
    gold?: number;
    tempDebuff?: string;
  };
  /** What the player gains. */
  reward?: {
    gold?: number;
    healPercent?: number;
    stims?: string[];
    passiveId?: string;
    revealMap?: boolean;
  };
}

export interface RunEvent {
  id: string;
  name: string;
  flavor: string;
  choices: readonly EventChoice[];
}

export const RUN_EVENTS: readonly RunEvent[] = [
  {
    id: 'event.abandoned_lab',
    name: 'Abandoned Lab',
    flavor: 'You find a derelict research station. Warning lights still flicker on a containment unit.',
    choices: [
      {
        id: 'event.abandoned_lab.scavenge',
        label: 'Scavenge Equipment',
        description: 'Search the lab for usable gear. The containment field looks unstable.',
        cost: { hpPercent: 20 },
        reward: { gold: 80, stims: ['stim.adrenal'] },
      },
      {
        id: 'event.abandoned_lab.hack',
        label: 'Hack the Terminal',
        description: 'Download research data. Might contain useful schematics.',
        reward: { passiveId: 'passive.wild_adaptive' },
      },
      {
        id: 'event.abandoned_lab.leave',
        label: 'Leave It Alone',
        description: 'Some things are better left undisturbed.',
        reward: { healPercent: 10 },
      },
    ],
  },
  {
    id: 'event.data_terminal',
    name: 'Data Terminal',
    flavor: 'An active network terminal hums quietly. Someone forgot to log out.',
    choices: [
      {
        id: 'event.data_terminal.intel',
        label: 'Download Map Data',
        description: 'Pull the local grid map. Reveals all room types on this layer.',
        reward: { revealMap: true },
      },
      {
        id: 'event.data_terminal.transfer',
        label: 'Siphon Credits',
        description: 'Transfer unsecured funds to your account.',
        reward: { gold: 120 },
      },
      {
        id: 'event.data_terminal.trace',
        label: 'Trace the Connection',
        description: 'Follow the network trail. Might lead to a valuable contact.',
        reward: { stims: ['stim.data_spike', 'stim.nano_repair'] },
      },
    ],
  },
  {
    id: 'event.black_market',
    name: 'Black Market Contact',
    flavor: 'A hooded figure steps out of the shadows. "Looking for something… special?"',
    choices: [
      {
        id: 'event.black_market.sell',
        label: 'Sell Gear at Premium',
        description: 'Offload one piece of gear for 2× its market value.',
        reward: { gold: 150 },
      },
      {
        id: 'event.black_market.buy',
        label: 'Buy Rare Stim',
        description: 'Pay 60 gold for a military-grade stim.',
        cost: { gold: 60 },
        reward: { stims: ['stim.full_restore'] },
      },
      {
        id: 'event.black_market.decline',
        label: 'Decline',
        description: 'You don\'t trust this character.',
      },
    ],
  },
  {
    id: 'event.hacked_drone',
    name: 'Hacked Drone',
    flavor: 'A combat drone lies disabled on the ground. Its core is still intact — you could repurpose it.',
    choices: [
      {
        id: 'event.hacked_drone.repair',
        label: 'Repair & Deploy',
        description: 'Fix the drone. It fights alongside you for one stage.',
        cost: { hpPercent: 15 },
        reward: { gold: 50 },
      },
      {
        id: 'event.hacked_drone.scrap',
        label: 'Scrap for Parts',
        description: 'Salvage valuable components.',
        reward: { gold: 100, stims: ['stim.barrier_injector'] },
      },
    ],
  },
  {
    id: 'event.anomaly_field',
    name: 'Anomaly Field',
    flavor: 'Reality flickers. Your sensors go haywire. Something is wrong with this area.',
    choices: [
      {
        id: 'event.anomaly_field.enter',
        label: 'Enter the Anomaly',
        description: 'Walk into the distortion. Power awaits those who risk it.',
        cost: { hpPercent: 30, tempDebuff: 'unstable' },
        reward: { gold: 200, stims: ['stim.crit_guarantor', 'stim.cooldown_reset'] },
      },
      {
        id: 'event.anomaly_field.bypass',
        label: 'Go Around',
        description: 'Play it safe. You lose nothing but time.',
        reward: { healPercent: 5 },
      },
    ],
  },
  {
    id: 'event.cryo_pod',
    name: 'Cryo Pod',
    flavor: 'A stasis pod hums quietly. Someone — or something — is inside. The thaw sequence is primed.',
    choices: [
      {
        id: 'event.cryo_pod.thaw',
        label: 'Initiate Thaw',
        description: 'Wake the occupant. They might be grateful.',
        reward: { healPercent: 35 },
      },
      {
        id: 'event.cryo_pod.drain',
        label: 'Drain Power Cells',
        description: 'Siphon the pod\'s energy. The occupant stays frozen.',
        reward: { gold: 90, stims: ['stim.mp_cell'] },
      },
    ],
  },
];
