import { dashboardResponse } from '../../src/lib/everland/response.ts'
import type { Env } from '../../src/lib/everland/storage.ts'
interface Context { request: Request; env: Env }
// Optional same-origin fallback for installations that already bind Pages to D1.
export async function onRequestGet({ request, env }: Context) {
  return dashboardResponse(request, env)
}
