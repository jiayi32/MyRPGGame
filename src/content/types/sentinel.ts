export const UNSPECIFIED: unique symbol = Symbol.for('content.unspecified');
export type Unspecified = typeof UNSPECIFIED;

export type UnspecifiedOr<T> = T | Unspecified;

export function isUnspecified(v: unknown): v is Unspecified {
  return v === UNSPECIFIED;
}

export function isSpecified<T>(v: UnspecifiedOr<T>): v is T {
  return v !== UNSPECIFIED;
}
