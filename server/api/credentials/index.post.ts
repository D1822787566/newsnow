import { CredentialTable } from "#/database/credentials"
import { getDomainFromSourceId } from "#/utils/sources-domains"

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const credTable = new CredentialTable(db)

  const body = await readBody(event)
  const { sourceId, cookieValue }: { sourceId: string, cookieValue: string } = body

  if (!sourceId || !cookieValue) {
    throw createError({ statusCode: 400, message: "sourceId 和 cookieValue 为必填" })
  }

  const domain = getDomainFromSourceId(sourceId as any)
  if (!domain) {
    throw createError({ statusCode: 400, message: `未知的 sourceId: ${sourceId}` })
  }

  const id = await credTable.upsert(sourceId, domain, cookieValue)
  return { id, success: true }
})
