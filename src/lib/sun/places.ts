// Coordinates are approximate (±0.01°, about ±3 seconds of sunrise). Elevation is used only
// for summits people climb for the sunrise; every other spot uses a sea-level horizon.
export const SPOT_REGIONS = ['east', 'south', 'jeju', 'west', 'seoul', 'mountain'] as const
export type SpotRegion = typeof SPOT_REGIONS[number]
export const SPOTS = [
  { id: 'dokdo', region: 'east', lat: 37.241, lon: 131.865, elevation: 0 },
  { id: 'sokcho', region: 'east', lat: 38.191, lon: 128.602, elevation: 0 },
  { id: 'naksansa', region: 'east', lat: 38.125, lon: 128.632, elevation: 0 },
  { id: 'gyeongpo', region: 'east', lat: 37.806, lon: 128.909, elevation: 0 },
  { id: 'jeongdongjin', region: 'east', lat: 37.691, lon: 129.034, elevation: 0 },
  { id: 'chuam', region: 'east', lat: 37.477, lon: 129.163, elevation: 0 },
  { id: 'samsa', region: 'east', lat: 36.386, lon: 129.375, elevation: 0 },
  { id: 'homigot', region: 'east', lat: 36.077, lon: 129.568, elevation: 0 },
  { id: 'daewangam', region: 'south', lat: 35.492, lon: 129.443, elevation: 0 },
  { id: 'ganjeolgot', region: 'south', lat: 35.359, lon: 129.360, elevation: 0 },
  { id: 'haeundae', region: 'south', lat: 35.159, lon: 129.160, elevation: 0 },
  { id: 'hyangiram', region: 'south', lat: 34.592, lon: 127.803, elevation: 0 },
  { id: 'seongsan', region: 'jeju', lat: 33.459, lon: 126.942, elevation: 182 },
  { id: 'waemok', region: 'west', lat: 37.031, lon: 126.514, elevation: 0 },
  { id: 'seoul', region: 'seoul', lat: 37.567, lon: 126.978, elevation: 0 },
  { id: 'namsan', region: 'seoul', lat: 37.551, lon: 126.988, elevation: 262 },
  { id: 'achasan', region: 'seoul', lat: 37.570, lon: 127.104, elevation: 295 },
  { id: 'taebaeksan', region: 'mountain', lat: 37.096, lon: 128.916, elevation: 1567 },
  { id: 'cheonwangbong', region: 'mountain', lat: 35.337, lon: 127.731, elevation: 1915 },
] as const satisfies readonly { id: string; region: SpotRegion; lat: number; lon: number; elevation: number }[]
export type SpotId = typeof SPOTS[number]['id']
export const isSpot = (v: unknown): v is SpotId => SPOTS.some(s => s.id === v)

// Sunrise-sunset calculator cities (metropolitan cities, provincial seats and a few large cities).
export const CITIES = [
  { id: 'seoul', lat: 37.567, lon: 126.978 }, { id: 'incheon', lat: 37.456, lon: 126.705 },
  { id: 'suwon', lat: 37.263, lon: 127.029 }, { id: 'chuncheon', lat: 37.881, lon: 127.730 },
  { id: 'gangneung', lat: 37.752, lon: 128.876 }, { id: 'daejeon', lat: 36.351, lon: 127.385 },
  { id: 'sejong', lat: 36.480, lon: 127.289 }, { id: 'cheongju', lat: 36.642, lon: 127.489 },
  { id: 'cheonan', lat: 36.815, lon: 127.114 }, { id: 'jeonju', lat: 35.825, lon: 127.148 },
  { id: 'gwangju', lat: 35.160, lon: 126.851 }, { id: 'mokpo', lat: 34.812, lon: 126.392 },
  { id: 'yeosu', lat: 34.760, lon: 127.662 }, { id: 'daegu', lat: 35.871, lon: 128.601 },
  { id: 'andong', lat: 36.568, lon: 128.730 }, { id: 'pohang', lat: 36.019, lon: 129.343 },
  { id: 'ulsan', lat: 35.538, lon: 129.311 }, { id: 'busan', lat: 35.180, lon: 129.075 },
  { id: 'changwon', lat: 35.228, lon: 128.681 }, { id: 'jeju', lat: 33.499, lon: 126.531 },
  { id: 'seogwipo', lat: 33.254, lon: 126.560 },
] as const
export type CityId = typeof CITIES[number]['id']
export const isCity = (v: unknown): v is CityId => CITIES.some(c => c.id === v)
