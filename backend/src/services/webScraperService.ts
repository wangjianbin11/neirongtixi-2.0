import puppeteer, { Browser } from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';

export interface ScrapedContent {
  title: string;
  content: string;
  url: string;
  metadata?: {
    author?: string;
    date?: string;
    description?: string;
    keywords?: string[];
    image?: string;
  };
}

/**
 * 网页抓取服务
 * 支持静态页面抓取和动态页面抓取
 */
export class WebScraperService {
  /**
   * 抓取静态网页内容（使用 cheerio + axios）
   * 速度快，适合大部分网站
   */
  async scrapeStatic(url: string): Promise<ScrapedContent> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      // 移除不需要的元素
      $('script, style, nav, header, footer, iframe, noscript').remove();

      // 提取标题
      let title = $('title').text() ||
                  $('h1').first().text() ||
                  $('meta[property="og:title"]').attr('content') ||
                  url;

      // 提取主要内容
      let content = '';

      // 尝试常见的内容选择器
      const contentSelectors = [
        'article',
        '[role="main"]',
        '.content',
        '.article-content',
        '.post-content',
        '.entry-content',
        'main',
        '.main-content',
      ];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0 && element.text().trim().length > 100) {
          content = element.text();
          break;
        }
      }

      // 如果没找到，使用body
      if (!content) {
        content = $('body').text();
      }

      // 清理内容
      content = this.cleanContent(content);

      // 提取元数据
      const metadata = this.extractMetadata($);

      return {
        title: title.trim(),
        content: content.trim(),
        url,
        metadata,
      };
    } catch (error: any) {
      throw new Error(`抓取网页失败: ${error.message}`);
    }
  }

  /**
   * 抓取动态网页内容（使用 Puppeteer）
   * 适合需要JavaScript渲染的页面
   */
  async scrapeDynamic(url: string): Promise<ScrapedContent> {
    let browser: Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // 设置User-Agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // 等待页面加载
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // 提取内容
      const result = await page.evaluate(() => {
        // @ts-ignore - 运行在浏览器环境
        const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, iframe, noscript');
        // @ts-ignore
        elementsToRemove.forEach((el: any) => el.remove());

        // @ts-ignore - 运行在浏览器环境
        const titleElement = document.querySelector('title') ||
                            // @ts-ignore
                            document.querySelector('h1') ||
                            // @ts-ignore
                            document.querySelector('meta[property="og:title"]');
        // @ts-ignore
        let title = titleElement instanceof HTMLMetaElement
          ? // @ts-ignore
            titleElement.content
          : // @ts-ignore
            titleElement?.textContent || '';

        // 提取主要内容
        const contentSelectors = [
          'article',
          '[role="main"]',
          '.content',
          '.article-content',
          '.post-content',
          '.entry-content',
          'main',
          '.main-content',
        ];

        let content = '';
        for (const selector of contentSelectors) {
          // @ts-ignore - 运行在浏览器环境
          const element = document.querySelector(selector);
          // @ts-ignore
          if (element && element.textContent && element.textContent.trim().length > 100) {
            // @ts-ignore
            content = element.textContent || '';
            break;
          }
        }

        if (!content) {
          // @ts-ignore - 运行在浏览器环境
          content = document.body?.textContent || '';
        }

        // 提取元数据
        // @ts-ignore
        const author = (document.querySelector('meta[name="author"]') as any)?.content ||
                      // @ts-ignore
                      (document.querySelector('.author') as any)?.textContent ||
                      '';
        // @ts-ignore
        const description = (document.querySelector('meta[name="description"]') as any)?.content ||
                            // @ts-ignore
                            (document.querySelector('meta[property="og:description"]') as any)?.content ||
                            '';
        // @ts-ignore
        const image = (document.querySelector('meta[property="og:image"]') as any)?.content ||
                     // @ts-ignore
                     (document.querySelector('meta[name="image"]') as any)?.content ||
                     '';

        return {
          title,
          content,
          author: author?.trim(),
          description: description?.trim(),
          image,
        };
      });

      return {
        title: result.title.trim() || url,
        content: this.cleanContent(result.content).trim(),
        url,
        metadata: {
          author: result.author,
          description: result.description,
          image: result.image,
        },
      };
    } catch (error: any) {
      throw new Error(`抓取动态网页失败: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 智能抓取（自动选择静态或动态）
   */
  async scrape(url: string, options?: { useDynamic?: boolean }): Promise<ScrapedContent> {
    if (options?.useDynamic) {
      return this.scrapeDynamic(url);
    }

    try {
      // 先尝试静态抓取
      const result = await this.scrapeStatic(url);
      // 如果内容太少，可能需要动态抓取
      if (result.content.length < 200) {
        console.log('静态抓取内容较少，尝试动态抓取');
        return this.scrapeDynamic(url);
      }
      return result;
    } catch (error) {
      // 静态失败，尝试动态
      console.log('静态抓取失败，尝试动态抓取');
      return this.scrapeDynamic(url);
    }
  }

  /**
   * 清理抓取的内容
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // 多个空格替换为单个
      .replace(/\n\s*\n/g, '\n\n') // 多个空行替换为双空行
      .replace(/\t/g, ' ') // 制表符替换为空格
      .trim();
  }

  /**
   * 提取网页元数据
   */
  private extractMetadata($: cheerio.CheerioAPI): ScrapedContent['metadata'] {
    const author = $('meta[name="author"]').attr('content') ||
                   $('.author').text() ||
                   '';

    const description = $('meta[name="description"]').attr('content') ||
                        $('meta[property="og:description"]').attr('content') ||
                        '';

    const keywords = $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) ||
                     [];

    const image = $('meta[property="og:image"]').attr('content') ||
                 $('meta[name="image"]').attr('content') ||
                 $('img').first().attr('src') ||
                 '';

    const date = $('meta[property="article:published_time"]').attr('content') ||
                 $('time').attr('datetime') ||
                 '';

    return {
      author: author || undefined,
      description: description || undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
      image: image || undefined,
      date: date || undefined,
    };
  }

  /**
   * 验证URL格式
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// 导出单例
export const webScraperService = new WebScraperService();
