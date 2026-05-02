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

/**
 * 生成 URL 重写脚本 — 在 iframe 中拦截所有资源请求并转为代理 URL
 */
function generateUrlRewriteScript(baseUrl: string): string {
  const urlObj = new URL(baseUrl)
  const origin = `${urlObj.protocol}//${urlObj.host}`
  const protocol = urlObj.protocol

  return `<script data-dfl-rewrite="true">(function(){
var P='/api/preview/proxy?url=',O='${origin}',PR='${protocol}';
function R(u){
if(!u||u.indexOf('data:')===0||u.indexOf('blob:')===0||u.indexOf('#')===0||u.indexOf('javascript:')===0)return u;
if(u.indexOf(P)===0)return u;
if(u.indexOf('http://')!==0&&u.indexOf('https://')!==0){
if(u.indexOf('//')===0)u=PR+u;
else if(u.indexOf('/')===0)u=O+u;
else u=O+'/'+u;
}
return P+encodeURIComponent(u);
}
// 拦截 fetch
var _f=window.fetch;
window.fetch=function(){
var a=arguments[0];
if(typeof a==='string'&&a.indexOf(P)!==0)arguments[0]=R(a);
else if(a instanceof Request&&a.url.indexOf(P)!==0){
try{arguments[0]=new Request(R(a.url),a)}catch(e){}
}
return _f.apply(this,arguments);
};
// 拦截 XHR
var _xo=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){
if(u&&u.indexOf(P)!==0)_xo.call(this,m,R(u));
else _xo.apply(this,arguments);
};
// 拦截 img/script/link/source 的 src/href 属性 setter
function patchProp(proto,prop){
if(!proto||proto._dflPatch)return;
proto._dflPatch=true;
var desc=Object.getOwnPropertyDescriptor(proto,prop);
if(!desc||!desc.set)return;
var orig=desc.set;
Object.defineProperty(proto,prop,{
set:function(v){
if(typeof v==='string'&&v.indexOf('data:')!==0&&v.indexOf('blob:')!==0&&v.indexOf(P)!==0){
orig.call(this,R(v));
}else{
orig.call(this,v);
}
},
get:desc.get,
configurable:true
});
}
patchProp(HTMLImageElement.prototype,'src');
patchProp(HTMLScriptElement.prototype,'src');
patchProp(HTMLLinkElement.prototype,'href');
patchProp(HTMLSourceElement.prototype,'src');
patchProp(HTMLSourceElement.prototype,'srcset');
// 拦截 createElement 和 appendChild
var _ce=document.createElement;
document.createElement=function(){var e=_ce.apply(this,arguments);
if(e&&e.tagName==='LINK'&&e.href&&!e.href.startsWith('data:')&&e.href.indexOf(P)!==0)try{e.href=R(e.href)}catch(x){}
if(e&&e.tagName==='IMG'&&e.src&&!e.src.startsWith('data:')&&e.src.indexOf(P)!==0)try{e.src=R(e.src)}catch(x){}
return e};
var _ac=Node.prototype.appendChild;
Node.prototype.appendChild=function(c){
if(c&&c.tagName==='LINK'&&c.href&&!c.href.startsWith('data:')&&c.href.indexOf(P)!==0)try{c.href=R(c.href)}catch(x){}
if(c&&c.tagName==='IMG'&&c.src&&!c.src.startsWith('data:')&&c.src.indexOf(P)!==0)try{c.src=R(c.src)}catch(x){}
return _ac.call(this,c)};
var _ai=Node.prototype.insertBefore;
Node.prototype.insertBefore=function(n,r){
if(n&&n.tagName==='LINK'&&n.href&&!n.href.startsWith('data:')&&n.href.indexOf(P)!==0)try{n.href=R(n.href)}catch(x){}
if(n&&n.tagName==='IMG'&&n.src&&!n.src.startsWith('data:')&&n.src.indexOf(P)!==0)try{n.src=R(n.src)}catch(x){}
return _ai.call(this,n,r)};
// 修补已有元素
document.querySelectorAll('img,script,link,source').forEach(function(el){
try{
if(el.tagName==='LINK'&&el.href&&el.href.indexOf(P)!==0)el.href=R(el.href);
if(el.tagName==='IMG'&&el.src&&el.src.indexOf(P)!==0)el.src=R(el.src);
if(el.tagName==='SCRIPT'&&el.src&&el.src.indexOf(P)!==0)el.src=R(el.src);
}catch(x){}
});
})();</script>`
}

/** 将 URL 重写脚本注入到 HTML 的 <head> 最前面 */
function injectUrlRewriteScript(html: string, baseUrl: string): string {
  const script = generateUrlRewriteScript(baseUrl)
  // 优先插入到 <head> 标签之后（确保在所有其他脚本之前执行）
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/(<head[^>]*>)/i, `$1${script}`)
  }
  // 如果没有 <head>，插在最前面
  return script + html
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

    // 解码 HTML 实体后再编码，避免双编码（&amp; → %26amp%3B）
    const decoded = fullUrl
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    return `/api/preview/proxy?url=${encodeURIComponent(decoded)}`
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
    // 1. 先重写所有静态 HTML 中的资源 URL 为代理端点（绕过防盗链）
    html = rewriteResourceUrls(html, baseUrl)
    // 2. 注入运行时 URL 重写脚本，拦截 JS 动态加载的资源请求
    html = injectUrlRewriteScript(html, baseUrl)
  }
  // 3. 最后注入 DFL 样式
  html = injectDflStyles(html)
  return html
}
