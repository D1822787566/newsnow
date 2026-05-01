import type { SourceID } from "@shared/types"
import { sources } from "@shared/sources"

export function getDomainFromSourceId(sourceId: SourceID): string | undefined {
  const source = sources[sourceId]
  if (!source?.home) return undefined
  try {
    const url = new URL(source.home)
    return url.hostname
  } catch {
    return undefined
  }
}

export function getAllSourceDomains(): Record<SourceID, string | undefined> {
  const result = {} as Record<SourceID, string | undefined>
  for (const [id] of Object.entries(sources)) {
    result[id as SourceID] = getDomainFromSourceId(id as SourceID)
  }
  return result
}
