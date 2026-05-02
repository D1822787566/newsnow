import { Readability } from "@mozilla/readability"
import { JSDOM } from "jsdom"
import { myFetch } from "./fetch"

export interface ExtractedContent {
  title: string
  content: string
  source: string
  author: string
  pubDate: string | null
  usedCredential: string | null
}

export interface FetchOptions {
  url: string
  sourceId: string
  cookie?: string
}

export async function extractContent(options: FetchOptions): Promise<ExtractedContent> {
  const { url, sourceId, cookie } = options

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  }

  if (cookie) {
    headers["Cookie"] = cookie
  }

  // 对 36kr 使用更长的超时时间，应对其速率限制导致的间歇性无响应
  const urlObj = new URL(url)
  const is36kr = urlObj.hostname.includes("36kr.com")
  const effectiveTimeout = is36kr ? 30000 : 20000

  const html = await myFetch(url, {
    headers,
    redirect: "follow",
    timeout: effectiveTimeout,
  })

  const dom = new JSDOM(html, { url })
  const document = dom.window.document

  const reader = new Readability(document, {
    keepClasses: true,
    charThreshold: 200,
  })
  const article = reader.parse()

  if (!article) {
    throw new Error("无法提取正文内容，该页面可能没有文章正文")
  }

  let source = ""
  try {
    source = new URL(url).hostname
  } catch {
    source = url
  }

  return {
    title: article.title || "无标题",
    content: article.content || "",
    source,
    author: article.byline || "",
    pubDate: null,
    usedCredential: cookie ? sourceId : null,
  }
}
