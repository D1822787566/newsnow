import { CredentialTable } from "#/database/credentials"

export default defineEventHandler(async () => {
  const db = useDatabase()
  const credTable = new CredentialTable(db)
  const credentials = await credTable.getAll()

  return {
    credentials: credentials.map(c => ({
      ...c,
      expired: credTable.isExpired(c),
      cookieValue: undefined,
    })),
  }
})
