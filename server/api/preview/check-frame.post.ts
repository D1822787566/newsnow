import { evaluateFramePolicy, headersToRecord } from "#/utils/frame-policy"
import { assertSafePreviewUrl } from "#/utils/url-safety"

function getRequestOrigin(event: any) {
  const origin = getHeader(event, "origin")
  if (origin) return origin

  const host = getHeader(event, "host") || "localhost:5173"
  const forwardedProto = getHeader(event, "x-forwarded-proto") || "http"
  return `${forwardedProto}://${host}`
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { url }: { url?: string } = body || {}

  if (!url) {
    throw createError({ statusCode: 400, message: "url 为必填" })
  }

  let targetUrl: URL
  try {
    targetUrl = assertSafePreviewUrl(url)
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message || "URL 不安全" })
  }

  const currentOrigin = getRequestOrigin(event)

  try {
    const response = await fetch(targetUrl.href, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    })

    const verdict = evaluateFramePolicy(response.headers, currentOrigin)
    return {
      ...verdict,
      finalUrl: response.url || targetUrl.href,
      status: response.status,
      headers: headersToRecord(response.headers),
    }
  } catch (error: any) {
    return {
      embeddable: false,
      reason: "check-failed",
      details: error?.message || "iframe 预检失败",
      finalUrl: targetUrl.href,
      status: 0,
      headers: {},
    }
  }
})
