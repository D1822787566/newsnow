import { readFileSync } from "node:fs"
import { join } from "node:path"

// In Nitro, process.cwd() points to the project root during dev.
// The CSS file is at server/styles/dfl-inject.css relative to project root.
const getCssPath = () => {
  const baseDir = process.cwd()
  return join(baseDir, "server", "styles", "dfl-inject.css")
}

/** 读取 DFL 注入样式模板 */
export function getDflInjectCss(): string {
  try {
    return readFileSync(getCssPath(), "utf-8")
  } catch {
    // Fallback inline CSS if file not found
    return getFallbackDflCss()
  }
}

function getFallbackDflCss(): string {
  return `
    :root {
      --dfl-paper: #F2EAD3;
      --dfl-ink: #1F1A14;
      --dfl-ink-2: #3D3528;
      --dfl-ink-3: #7A6E60;
      --dfl-rule: #D4C9B8;
      --dfl-blue: #2B5E8B;
      --dfl-red: #C0392B;
    }
    body {
      background: var(--dfl-paper) !important;
      color: var(--dfl-ink-2) !important;
      font-family: 'Noto Serif SC', serif !important;
      line-height: 1.8 !important;
    }
    a { color: var(--dfl-blue) !important; text-decoration: underline !important; }
    h1, h2, h3, h4, h5, h6 { font-family: 'Noto Serif SC', serif !important; color: var(--dfl-ink) !important; font-weight: 700 !important; }
    img { max-width: 100% !important; border-radius: 8px !important; }
    blockquote { border-left: 3px solid var(--dfl-rule) !important; padding-left: 12px !important; color: var(--dfl-ink-3) !important; }
    .ad, .sidebar, .nav, .header, .footer,
    [class*="ad-"], [class*="nav-"], [class*="sidebar"],
    [id*="ad"], [id*="popup"], [id*="modal"] {
      display: none !important;
    }
  `
}

/** 将 DFL 样式注入到 HTML 的 <head> 中 */
export function injectDflStyles(html: string): string {
  const css = getDflInjectCss()
  const styleTag = `<style id="dfl-injected-styles" data-dfl-preview="true">\n${css}\n</style>`

  // 尝试注入到 </head> 之前
  if (html.includes("</head>")) {
    return html.replace("</head>", `${styleTag}\n</head>`)
  }

  // 如果没有 </head>，注入到 <body> 开头或最前面
  if (html.includes("<body")) {
    return html.replace(/<body[^>]*>/, (match) => `${match}\n${styleTag}`)
  }

  return `${styleTag}\n${html}`
}

/** 移除可能限制 iframe 嵌入的 CSP meta 标签和已有 <base> 标签 */
export function removeCspMeta(html: string): string {
  // 移除 <meta http-equiv="Content-Security-Policy" ...>
  html = html.replace(/<meta\s+[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>/gi, "")
  // 移除 <meta http-equiv="X-Frame-Options" ...>
  html = html.replace(/<meta\s+[^>]*http-equiv\s*=\s*["']?X-Frame-Options["']?[^>]*>/gi, "")
  // 移除已有 <base> 标签 — 让 URL 重写完全控制资源加载路径，
  // 避免原站的 <base> 导致相对 URL 绕过代理直接请求源站
  html = html.replace(/<base\b[^>]*>/gi, "")
  return html
}

/**
 * 将 HTML 中的资源 URL 重写为通过代理端点，绕过防盗链保护
 *
 * 处理：<img src>, <link href>, <script src>, <source src/srcset>, CSS url()
 *
 * 重写规则：
 * - //domain.com/path.jpg → /api/preview/proxy?url=https://domain.com/path.jpg
 * - /path.jpg → /api/preview/proxy?url={baseUrl}/path.jpg
 * - 外部 CDN 保持原样（不代理）
 */
export function rewriteResourceUrls(html: string, baseUrl: string): string {
  const urlObj = new URL(baseUrl)
  const origin = `${urlObj.protocol}//${urlObj.host}`

  // 判断资源 URL 是否应该被代理
  // 策略：代理所有 http/https 资源，排除 data/blob/#/mailto 和已知安全的外部 CDN
  const EXTERNAL_CDNS = [
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "cdn.jsdelivr.net",
    "unpkg.com",
    "cdnjs.cloudflare.com",
    "ajax.googleapis.com",
    "code.jquery.com",
    "maxcdn.bootstrapcdn.com",
  ]
  const shouldProxy = (resourceUrl: string): boolean => {
    if (!resourceUrl || resourceUrl.startsWith("data:") || resourceUrl.startsWith("blob:") || resourceUrl.startsWith("#") || resourceUrl.startsWith("mailto:")) {
      return false
    }
    try {
      let fullUrl: string
      if (resourceUrl.startsWith("//")) {
        fullUrl = `${urlObj.protocol}${resourceUrl}`
      } else if (resourceUrl.startsWith("http://") || resourceUrl.startsWith("https://")) {
        fullUrl = resourceUrl
      } else {
        fullUrl = `${origin}${resourceUrl.startsWith("/") ? "" : "/"}${resourceUrl}`
      }
      const resUrl = new URL(fullUrl)
      // 排除已知的安全外部 CDN（字体、公共库等）
      if (EXTERNAL_CDNS.some(d => resUrl.hostname === d || resUrl.hostname.endsWith(`.${d}`))) {
        return false
      }
      // 其他所有 http/https 资源都走代理
      return true
    } catch {
      return false
    }
  }

  // 将单个资源 URL 转换为代理 URL
  const toProxyUrl = (resourceUrl: string): string => {
    if (!resourceUrl || resourceUrl.startsWith("data:") || resourceUrl.startsWith("blob:") || resourceUrl.startsWith("#")) {
      return resourceUrl
    }

    let fullUrl: string
    if (resourceUrl.startsWith("//")) {
      fullUrl = `${urlObj.protocol}${resourceUrl}`
    } else if (resourceUrl.startsWith("http://") || resourceUrl.startsWith("https://")) {
      fullUrl = resourceUrl
    } else {
      fullUrl = `${origin}${resourceUrl.startsWith("/") ? "" : "/"}${resourceUrl}`
    }

    if (!shouldProxy(fullUrl)) {
      return resourceUrl
    }

    return `/api/preview/proxy?url=${encodeURIComponent(fullUrl)}`
  }

  // 重写 <img src="...">
  html = html.replace(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi, (match, src) => {
    return match.replace(src, toProxyUrl(src))
  })

  // 重写 <img srcset="..."> 中的每个 URL
  html = html.replace(/<img\b[^>]*\bsrcset\s*=\s*["']([^"']+)["'][^>]*>/gi, (match, srcset) => {
    const rewritten = srcset.split(",").map((part: string) => {
      const trimmed = part.trim()
      const parts = trimmed.split(/\s+/)
      if (parts.length >= 1) {
        parts[0] = toProxyUrl(parts[0])
      }
      return parts.join(" ")
    }).join(", ")
    return match.replace(srcset, rewritten)
  })

  // 重写 <link href="...">（CSS、favicon 等）
  html = html.replace(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi, (match, href) => {
    if (href.startsWith("data:") || href.startsWith("blob:")) return match
    return match.replace(href, toProxyUrl(href))
  })

  // 重写 <script src="...">
  html = html.replace(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi, (match, src) => {
    if (src.startsWith("data:") || src.startsWith("blob:")) return match
    return match.replace(src, toProxyUrl(src))
  })

  // 重写 <source src="..."> 和 <source srcset="...">
  html = html.replace(/<source\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi, (match, src) => {
    return match.replace(src, toProxyUrl(src))
  })
  html = html.replace(/<source\b[^>]*\bsrcset\s*=\s*["']([^"']+)["'][^>]*>/gi, (match, srcset) => {
    const rewritten = srcset.split(",").map((part: string) => {
      const trimmed = part.trim()
      const parts = trimmed.split(/\s+/)
      if (parts.length >= 1) {
        parts[0] = toProxyUrl(parts[0])
      }
      return parts.join(" ")
    }).join(", ")
    return match.replace(srcset, rewritten)
  })

  // 重写 CSS url() 中的资源引用（内联 style 和 <style> 标签中的背景图等）
  html = html.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (match, url) => {
    if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("#")) return match
    return match.replace(url, toProxyUrl(url))
  })

  return html
}

/** 处理完整的代理 HTML 管道 */
export function processProxyHtml(html: string, baseUrl?: string): string {
  html = removeCspMeta(html)
  if (baseUrl) {
    // 先重写所有资源 URL 为代理端点（绕过防盗链）
    html = rewriteResourceUrls(html, baseUrl)
  }
  html = injectDflStyles(html)
  return html
}
