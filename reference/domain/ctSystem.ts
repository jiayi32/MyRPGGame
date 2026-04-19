// CT (Charge Time) system core logic
// Implements the timeline and queue for all entities

export interface CTEntity {
  id: string;
  ct: number;
  maxCt: number;
}

export class CTQueue {
  private entities: CTEntity[] = [];

  constructor(entities: CTEntity[]) {
    this.entities = entities;
  }

  advance(time: number) {
    this.entities.forEach(e => { e.ct = Math.max(0, e.ct - time); });
  }

  nextReady(): CTEntity | undefined {
    return this.entities.find(e => e.ct === 0);
  }

  setCT(id: string, ct: number) {
    const entity = this.entities.find(e => e.id === id);
    if (entity) entity.ct = ct;
  }

  getEntities() {
    return this.entities;
  }
}
