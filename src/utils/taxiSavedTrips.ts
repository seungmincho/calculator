import { REGION_KEYS, TAXI_TYPES, type RegionKey, type TaxiType, type Traffic } from './taxiFare.ts'

export const TAXI_SAVED_TRIPS_KEY = 'toolhub:taxi:saved-trips'
export const TAXI_SAVED_TRIPS_LIMIT = 10
export const TAXI_TRIP_NAME_LIMIT = 40

export interface TaxiTripConditions {
  distance: number
  time: number
  timeAuto: boolean
  traffic: Traffic
  region: RegionKey
  taxiType: TaxiType
  hour: number
  outOfCity: boolean
  people: number
}

export interface SavedTaxiTrip {
  id: string
  name: string
  conditions: TaxiTripConditions
}

type ReadError = 'invalidData' | 'unsupportedVersion' | 'unavailable'
export type TaxiTripsSnapshot =
  | { status: 'ready'; raw: string | null; trips: SavedTaxiTrip[] }
  | { status: ReadError }
export type TaxiTripsError = ReadError | 'conflict' | 'invalidConditions' | 'invalidName' | 'duplicateName' | 'limit' | 'missingTrip'
export type TaxiTripsAction =
  | { kind: 'add'; id: string; name: string; conditions: TaxiTripConditions }
  | { kind: 'rename'; id: string; name: string }
  | { kind: 'delete'; id: string }
export type TaxiTripsWriteResult =
  | { ok: true; snapshot: Extract<TaxiTripsSnapshot, { status: 'ready' }> }
  | { ok: false; error: TaxiTripsError }
type TripStorage = Pick<Storage, 'getItem' | 'setItem'>

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
const within = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)
const validName = (value: unknown): value is string =>
  typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= TAXI_TRIP_NAME_LIMIT && !/[\u0000-\u001f\u007f]/.test(value)
const nameKey = (value: string) => value.normalize('NFKC').toLowerCase()

export function isTaxiTripConditions(value: unknown): value is TaxiTripConditions {
  if (!record(value) || !exactKeys(value, ['distance', 'time', 'timeAuto', 'traffic', 'region', 'taxiType', 'hour', 'outOfCity', 'people'])) return false
  return within(value.distance, 1000) && within(value.time, 10000)
    && typeof value.timeAuto === 'boolean' && typeof value.outOfCity === 'boolean'
    && ['smooth', 'normal', 'heavy'].includes(value.traffic as string)
    && REGION_KEYS.includes(value.region as RegionKey) && TAXI_TYPES.includes(value.taxiType as TaxiType)
    && within(value.hour, 23) && Number.isInteger(value.hour)
    && within(value.people, 4) && value.people >= 1 && Number.isInteger(value.people)
}

/** Reject the whole record instead of silently dropping entries and overwriting a damaged/future save. */
export function parseTaxiSavedTrips(raw: string | null): TaxiTripsSnapshot {
  if (raw === null) return { status: 'ready', raw, trips: [] }
  if (raw.length > 100000) return { status: 'invalidData' }
  try {
    const data: unknown = JSON.parse(raw)
    if (!record(data) || !Number.isInteger(data.version)) return { status: 'invalidData' }
    if (data.version !== 1) return { status: 'unsupportedVersion' }
    if (!exactKeys(data, ['version', 'trips']) || !Array.isArray(data.trips) || data.trips.length > TAXI_SAVED_TRIPS_LIMIT) return { status: 'invalidData' }
    const ids = new Set<string>()
    const names = new Set<string>()
    for (const trip of data.trips) {
      if (!record(trip) || !exactKeys(trip, ['id', 'name', 'conditions']) || !validId(trip.id) || !validName(trip.name) || !isTaxiTripConditions(trip.conditions)) return { status: 'invalidData' }
      if (ids.has(trip.id) || names.has(nameKey(trip.name))) return { status: 'invalidData' }
      ids.add(trip.id)
      names.add(nameKey(trip.name))
    }
    return { status: 'ready', raw, trips: data.trips as SavedTaxiTrip[] }
  } catch {
    return { status: 'invalidData' }
  }
}

export function readTaxiSavedTrips(storage?: TripStorage): TaxiTripsSnapshot {
  try {
    return parseTaxiSavedTrips((storage ?? window.localStorage).getItem(TAXI_SAVED_TRIPS_KEY))
  } catch {
    return { status: 'unavailable' }
  }
}

/** The caller's original raw snapshot is a compare-before-write token; never rebase a stale edit silently. */
export function writeTaxiTripAction(snapshot: TaxiTripsSnapshot, action: TaxiTripsAction, storage?: TripStorage): TaxiTripsWriteResult {
  if (snapshot.status !== 'ready') return { ok: false, error: snapshot.status }
  try {
    const target = storage ?? window.localStorage
    const current = readTaxiSavedTrips(target)
    if (current.status !== 'ready') return { ok: false, error: current.status }
    if (current.raw !== snapshot.raw) return { ok: false, error: 'conflict' }
    // Mutate the validated persisted snapshot, not an array the caller may have changed in memory.
    let trips = current.trips
    if (action.kind === 'add' || action.kind === 'rename') {
      const name = action.name.trim()
      if (!validName(name)) return { ok: false, error: 'invalidName' }
      if (trips.some((trip) => (action.kind === 'add' || trip.id !== action.id) && nameKey(trip.name) === nameKey(name))) return { ok: false, error: 'duplicateName' }
      if (action.kind === 'add') {
        if (trips.length >= TAXI_SAVED_TRIPS_LIMIT) return { ok: false, error: 'limit' }
        if (!isTaxiTripConditions(action.conditions) || !validId(action.id) || trips.some((trip) => trip.id === action.id)) return { ok: false, error: 'invalidConditions' }
        trips = [...trips, { id: action.id, name, conditions: { ...action.conditions } }]
      } else {
        if (!trips.some((trip) => trip.id === action.id)) return { ok: false, error: 'missingTrip' }
        trips = trips.map((trip) => trip.id === action.id ? { ...trip, name } : trip)
      }
    } else {
      if (!trips.some((trip) => trip.id === action.id)) return { ok: false, error: 'missingTrip' }
      trips = trips.filter((trip) => trip.id !== action.id)
    }
    const raw = JSON.stringify({ version: 1, trips })
    target.setItem(TAXI_SAVED_TRIPS_KEY, raw)
    // A blocked/ineffective write or intervening writer must not display success.
    if (target.getItem(TAXI_SAVED_TRIPS_KEY) !== raw) return { ok: false, error: 'conflict' }
    return { ok: true, snapshot: { status: 'ready', raw, trips } }
  } catch {
    return { ok: false, error: 'unavailable' }
  }
}
