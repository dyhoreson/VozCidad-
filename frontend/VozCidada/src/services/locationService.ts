export type UserRegion = { city: string; state: string; countryCode: string; isFallback: boolean }
type IpApiResponse = { city?: unknown; region?: unknown; region_code?: unknown; country_code?: unknown }

const FALLBACK: UserRegion = { city: 'Natal', state: 'RN', countryCode: 'BR', isFallback: true }
const STORAGE_KEY = 'voz-cidada-ip-location-v1'
const MAX_AGE_MS = 24 * 60 * 60 * 1000
let memoryValue: { value: UserRegion; savedAt: number } | null = null

function cachedLocation(): UserRegion | null {
  if (memoryValue && Date.now() - memoryValue.savedAt < MAX_AGE_MS) return memoryValue.value
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as { value?: UserRegion; savedAt?: number }
    if (saved.savedAt && Date.now() - saved.savedAt < MAX_AGE_MS && saved.value?.state === 'RN') {
      memoryValue = { value: saved.value, savedAt: saved.savedAt }
      return saved.value
    }
  } catch { /* Storage may be disabled in some embedded browsers. */ }
  return null
}

export async function detectUserLocation(): Promise<UserRegion> {
  const cached = cachedLocation()
  if (cached) return cached
  try {
    const response = await fetch('https://ipapi.co/json/', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4500) })
    if (!response.ok) return FALLBACK
    const data = await response.json() as IpApiResponse
    const stateCode = typeof data.region_code === 'string' ? data.region_code.toUpperCase() : ''
    const stateName = typeof data.region === 'string' ? data.region.toLocaleLowerCase('pt-BR') : ''
    const isRn = data.country_code === 'BR' && (stateCode === 'RN' || stateName.includes('rio grande do norte'))
    if (!isRn) return FALLBACK
    const location: UserRegion = { city: typeof data.city === 'string' && data.city.trim() ? data.city.trim() : 'Natal', state: 'RN', countryCode: 'BR', isFallback: false }
    memoryValue = { value: location, savedAt: Date.now() }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryValue)) } catch { /* Cache is optional. */ }
    return location
  } catch {
    return FALLBACK
  }
}
