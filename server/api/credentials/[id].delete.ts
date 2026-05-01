import { CredentialTable } from "#/database/credentials"

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const credTable = new CredentialTable(db)
  await credTable.init()

  const id = Number(getRouterParam(event, "id"))
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: "无效的 id" })
  }

  const success = await credTable.delete(id)
  if (!success) {
    throw createError({ statusCode: 404, message: "凭证不存在" })
  }

  return { success: true }
})
