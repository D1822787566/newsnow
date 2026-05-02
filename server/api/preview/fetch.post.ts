import { CredentialTable } from "#/database/credentials"
import { extractContent } from "#/utils/content-extractor"
import { getDomainFromSourceId } from "#/utils/sources-domains"
import { assessContentQuality, shouldUseIframe } from "#/utils/content-quality"

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

    if (shouldUseIframe(url)) {
      const proxyUrl = `/api/preview/proxy?url=${encodeURIComponent(url)}`
      return {
        mode: "iframe" as const,
        proxyUrl,
        title: content.title,
        source: content.source,
        elapsed,
        credentialUsed: content.usedCredential,
        credentialExpired: credential ? credTable.isExpired(credential) : false,
        reason: "site_blacklist",
      }
    }

    const quality = assessContentQuality(content.content)
    if (!quality.passed) {
      const proxyUrl = `/api/preview/proxy?url=${encodeURIComponent(url)}`
      return {
        mode: "iframe" as const,
        proxyUrl,
        title: content.title,
        source: content.source,
        elapsed,
        credentialUsed: content.usedCredential,
        credentialExpired: credential ? credTable.isExpired(credential) : false,
        reason: quality.reason,
      }
    }

    return {
      mode: "readable" as const,
      title: content.title,
      content: content.content,
      source: content.source,
      author: content.author,
      elapsed,
      credentialUsed: content.usedCredential,
      credentialExpired: credential ? credTable.isExpired(credential) : false,
    }
  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const proxyUrl = `/api/preview/proxy?url=${encodeURIComponent(url)}`
    return {
      mode: "iframe" as const,
      proxyUrl,
      title: "",
      source: new URL(url).hostname,
      elapsed,
      credentialUsed: credential ? sourceId : null,
      credentialExpired: credential ? credTable.isExpired(credential) : false,
      reason: "extract_failed",
    }
  }
})
