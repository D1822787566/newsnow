import { describe, it, expect } from "vitest"
import { assessContentQuality, shouldUseIframe } from "../content-quality"

describe("shouldUseIframe", () => {
  it("returns true for blacklisted sites", () => {
    expect(shouldUseIframe("https://36kr.com/p/123")).toBe(true)
    expect(shouldUseIframe("https://www.zhihu.com/question/456")).toBe(true)
    expect(shouldUseIframe("https://mp.weixin.qq.com/s/abc")).toBe(true)
  })

  it("returns false for non-blacklisted sites", () => {
    expect(shouldUseIframe("https://example.com/article")).toBe(false)
    expect(shouldUseIframe("https://news.ycombinator.com/item?id=123")).toBe(false)
  })
})

describe("assessContentQuality", () => {
  it("fails for short content", () => {
    const result = assessContentQuality("<p>短内容</p>")
    expect(result.passed).toBe(false)
    expect(result.reason).toBe("content_too_short")
  })

  it("fails for too few paragraphs", () => {
    const html = "<p>" + "a".repeat(300) + "</p>"
    const result = assessContentQuality(html)
    expect(result.passed).toBe(false)
    expect(result.reason).toBe("too_few_paragraphs")
  })

  it("passes for good content", () => {
    const longText = "这是一个很长的段落，包含了足够多的文字内容来达到检测阈值要求，确保长度超过200字符。"
      + "这是额外的一段文字，用来增加内容的丰富度，使检测能够通过。"
      + "我们需要更多的文字内容来确保总长度超过200个字符的阈值要求。"
      + "这是第四段补充文字，进一步增加内容长度以满足测试条件。"
      + "第五段补充文字，确保文本总长度达到质量检测的要求标准。"
      + "第六段补充文字，继续增加内容长度以确保通过质量检测的最低门槛。"
      + "第七段补充文字，现在应该足够长来满足200字符的最低要求了。"
      + "第八段补充文字，作为最后一段确保内容长度充足的验证性描述。"
    const html = `<p>${longText}</p><p>这是第二个段落。</p><p>这是第三个段落。</p>`
    const result = assessContentQuality(html)
    expect(result.passed).toBe(true)
  })

  it("fails for too many images without alt", () => {
    const longText = "a".repeat(300)
    const html = `
      <p>${longText}</p>
      <p>第二个段落</p>
      <img src="1.jpg"><img src="2.jpg"><img src="3.jpg">
    `
    const result = assessContentQuality(html)
    expect(result.passed).toBe(false)
    expect(result.reason).toBe("too_many_image_placeholders")
  })

  it("passes when images have alt text", () => {
    const longText = "a".repeat(300)
    const html = `
      <p>${longText}</p>
      <p>第二个段落</p>
      <img src="1.jpg" alt="description"><img src="2.jpg" alt="another">
    `
    const result = assessContentQuality(html)
    expect(result.passed).toBe(true)
  })
})
