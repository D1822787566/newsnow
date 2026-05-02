import { JSDOM } from "jsdom"

export interface QualityResult {
  passed: boolean
  reason?: string
}

/** 已知 Readability 解析效果差的站点，直接走 iframe */
const IFRAME_FALLBACK_SITES = [
  "36kr.com",
  "zhihu.com",
  "weixin.qq.com",
]

export function shouldUseIframe(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return IFRAME_FALLBACK_SITES.some(site => hostname.includes(site))
  } catch {
    return false
  }
}

export function assessContentQuality(html: string): QualityResult {
  // 检查纯文本长度
  const dom = new JSDOM(html)
  const text = dom.window.document.body.textContent || ""
  if (text.length < 200) {
    return { passed: false, reason: "content_too_short" }
  }

  // 检查段落数量
  const paragraphs = dom.window.document.querySelectorAll("p")
  if (paragraphs.length < 2) {
    return { passed: false, reason: "too_few_paragraphs" }
  }

  // 检查图片占位符比例
  const images = dom.window.document.querySelectorAll("img")
  if (images.length > 0) {
    const imagesWithoutAlt = Array.from(images).filter(
      img => !img.getAttribute("alt") || img.getAttribute("alt")!.trim() === ""
    )
    if (imagesWithoutAlt.length / images.length > 0.5) {
      return { passed: false, reason: "too_many_image_placeholders" }
    }
  }

  return { passed: true }
}
