/** Currency is rounded before splitting so all shares add up to the displayed total. */
export function calculateTripCosts(settlement: number, tollFee: number, parkingFee: number, people: number) {
  const fuel = Math.round(settlement)
  const toll = Math.round(tollFee)
  const parking = Math.round(parkingFee)
  const total = fuel + toll + parking
  const count = Math.max(1, Math.min(100, Math.trunc(people) || 1))
  const perPerson = Math.floor(total / count)
  const remainder = total % count
  return { fuel, toll, parking, total, people: count, perPerson, remainder, lastPerson: perPerson + remainder }
}

/** Untrusted URL / saved values must not produce NaN, Infinity, or unsupported ranges. */
export function fuelNumber(value: unknown, fallback: number, min: number, max: number, integer = false): number {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return fallback
  const n = Number(value)
  return Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n)) ? n : fallback
}

/** Older logs use current settings; new records retain the amount at the time they were saved. */
export function logFuelCost(savedSettlement: number | undefined, currentEstimate: number): number {
  return typeof savedSettlement === 'number' && Number.isFinite(savedSettlement) && savedSettlement >= 0 ? Math.round(savedSettlement) : Math.round(currentEstimate)
}
