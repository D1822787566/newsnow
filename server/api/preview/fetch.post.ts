import { CredentialTable } from "#/database/credentials"
import { extractContent } from "#/utils/content-extractor"
import { getDomainFromSourceId } from "#/utils/sources-domains"

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const credTable = new CredentialTable(db)
  await credTable.init()

  const body = await readBody(event)
  const { url, sourceId }: { url: string, sourceId: string } = body

  if (!url || !sourceId) {
    throw createError({ statusCode: 400, message: "url 和 sourceId 为必填" })
  }

  const expectedDomain = getDomainFromSourceId(sourceId as any)
  if (!expectedDomain) {
    throw createError({ statusCode: 400, message: `未知的 sourceId: ${sourceId}` })
  }

  try {
    const urlObj = new URL(url)
    const actualHostname = urlObj.hostname.toLowerCase()
    const expectedLower = expectedDomain.toLowerCase()
    // Match exact domain or subdomain (e.g., "www.zhihu.com" matches "zhihu.com")
    if (actualHostname !== expectedLower && !actualHostname.endsWith(`.${expectedLower}`)) {
      throw createError({ statusCode: 400, message: "URL 域名与 sourceId 不匹配" })
    }
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 400, message: "URL 格式无效" })
  }

  const credential = await credTable.getBySourceId(sourceId)
  const cookie = credential?.cookieValue

  const startTime = Date.now()
  try {
    const content = await extractContent({ url, sourceId, cookie })
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    return {
      ...content,
      elapsed,
      credentialExpired: credential ? credTable.isExpired(credential) : false,
    }
  } catch (error: any) {
    throw createError({
      statusCode: 502,
      message: error.message || "内容提取失败",
    })
  }
})
