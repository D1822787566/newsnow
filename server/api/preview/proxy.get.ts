import { CredentialTable } from "#/database/credentials"
import { processProxyHtml } from "#/utils/proxy-html"

// 需要作为 HTML 处理并执行 URL 重写的内容类型
const HTML_CONTENT_TYPES = ["text/html", "application/xhtml+xml", "application/xml"]

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const url = query.url as string

  if (!url) {
    throw createError({ statusCode: 400, message: "url 参数为必填项" })
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(url)
  } catch {
    throw createError({ statusCode: 400, message: "url 参数格式无效" })
  }

  // 安全校验：仅允许 HTTP/HTTPS 协议
  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    throw createError({ statusCode: 400, message: "仅支持 HTTP/HTTPS 协议" })
  }

  // 查找凭证
  const db = useDatabase()
  const credTable = new CredentialTable(db)
  await credTable.init()

  // 尝试匹配凭证（通过域名反查 sourceId）
  let cookie: string | undefined
  const sources = await credTable.getAll()
  for (const src of sources) {
    if (targetUrl.hostname.includes(src.domain)) {
      cookie = src.cookieValue
      break
    }
  }

  // 构建请求头
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    // Referer 设为目标页面 URL，帮助绕过防盗链
    "Referer": `${targetUrl.protocol}//${targetUrl.host}/`,
  }

  if (cookie) {
    headers["Cookie"] = cookie
  }

  // 抓取源网页（使用 $fetch.raw 获取完整响应对象）
  let response: any
  let body: string
  try {
    response = await $fetch.raw(url, {
      headers,
      redirect: "follow",
      timeout: 30000,
    })
    body = response._data ?? await response.text()
  } catch (error: any) {
    throw createError({
      statusCode: 502,
      message: error.message || "代理请求失败",
    })
  }

  // 根据原始 Content-Type 判断处理方式
  const contentType = response.headers.get("content-type") || "text/html"
  const isHtml = HTML_CONTENT_TYPES.some(t => contentType.includes(t))

  if (isHtml) {
    // HTML：执行处理管道（CSP 移除 + URL 重写 + DFL 样式）
    let html = body
    // 限制响应体大小（5MB）
    if (html.length > 5 * 1024 * 1024) {
      html = html.slice(0, 5 * 1024 * 1024)
        + "\n<!-- 页面过大，已截断。请在浏览器中打开完整版本 -->"
    }
    const processedHtml = processProxyHtml(html, url)
    setResponseStatus(event, 200)
    setHeader(event, "Content-Type", "text/html; charset=utf-8")
    return processedHtml
  }

  // 非 HTML（CSS/JS/图片等）：原样返回，透传原始 Content-Type
  setResponseStatus(event, 200)
  setHeader(event, "Content-Type", contentType)

  // 透传缓存头
  const cacheControl = response.headers.get("cache-control")
  if (cacheControl) {
    setHeader(event, "Cache-Control", cacheControl)
  }

  return body
})
