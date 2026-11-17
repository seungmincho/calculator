/** Attendance belongs to the current screen; saved rosters always keep their full names. */
export function attendingTeamMembers(names: string[], absent: ReadonlySet<string>): string[] {
  return names.filter(name => !!name.trim() && !absent.has(name))
}

export function setTeamAttendance(absent: ReadonlySet<string>, name: string, attending: boolean): Set<string> {
  const next = new Set(absent)
  if (attending) next.delete(name)
  else next.add(name)
  return next
}
