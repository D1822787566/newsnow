import { CredentialTable } from "#/database/credentials"
import { processProxyHtml } from "#/utils/proxy-html"
import { myFetch } from "#/utils/fetch"

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

  // 抓取源网页
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  }

  if (cookie) {
    headers["Cookie"] = cookie
  }

  let html: string
  try {
    html = await myFetch(url, {
      headers,
      redirect: "follow",
      timeout: 30000,
    })
  } catch (error: any) {
    throw createError({
      statusCode: 502,
      message: error.message || "代理请求失败",
    })
  }

  // 验证响应是否为 HTML
  if (!html.trim().startsWith("<") || (!html.includes("<html") && !html.includes("<!DOCTYPE"))) {
    throw createError({
      statusCode: 415,
      message: "该页面不是 HTML 格式，无法在侧栏预览",
    })
  }

  // 限制响应体大小（5MB）
  if (html.length > 5 * 1024 * 1024) {
    html = html.slice(0, 5 * 1024 * 1024)
      + "\n<!-- 页面过大，已截断。请在浏览器中打开完整版本 -->"
  }

  // 处理 HTML：移除 CSP meta + 注入 base 标签 + DFL 样式
  const processedHtml = processProxyHtml(html, url)

  // 设置响应
  setResponseStatus(event, 200)
  setHeader(event, "Content-Type", "text/html; charset=utf-8")

  return processedHtml
})
