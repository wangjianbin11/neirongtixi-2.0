// @ts-nocheck - This file contains browser-side code that runs in Puppeteer's page.evaluate()
import puppeteer, { Browser, Page } from 'puppeteer';
import { SearchMethod, SearchResultItem } from './hybridSearchService';

/**
 * Puppeteer爬虫配置
 */
interface CrawlerConfig {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
}

/**
 * 平台爬虫策略
 */
interface PlatformStrategy {
  url: (query: string) => string;
  selectors: {
    item: string;
    title: string;
    url: string;
    snippet?: string;
    author?: string;
    publishedAt?: string;
    metrics?: {
      views?: string;
      likes?: string;
      comments?: string;
      shares?: string;
    };
    thumbnail?: string;
  };
  waitForSelector?: string;
  needScroll?: boolean;
}

/**
 * Puppeteer搜索服务
 * 支持多平台爬虫抓取
 */
export class PuppeteerSearchService {
  private browser: Browser | null = null;
  private isInitializing = false;

  // 平台爬虫策略配置
  private strategies: Record<string, PlatformStrategy> = {
    // 百度搜索
    'baidu_search': {
      url: (query) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
      selectors: {
        item: 'div[tpl]',
        title: 'h3 a',
        url: 'h3 a',
        snippet: 'span.content-right_8Zs40',
      },
      waitForSelector: 'div[tpl]',
      needScroll: false,
    },

    // Bing搜索
    'bing_search': {
      url: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      selectors: {
        item: 'li.b_algo',
        title: 'h2 a',
        url: 'h2 a',
        snippet: 'p',
      },
      waitForSelector: 'li.b_algo',
      needScroll: false,
    },

    // YouTube
    'youtube_search': {
      url: (query) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      selectors: {
        item: 'ytd-video-renderer',
        title: 'a#video-title',
        url: 'a#video-title',
        snippet: '#description-text',
        metrics: {
          views: '#metadata-line span:first-child',
        },
        thumbnail: 'yt-image img',
      },
      waitForSelector: 'ytd-video-renderer',
      needScroll: true,
    },

    // TikTok (更新选择器 - 2024)
    'tiktok_search': {
      url: (query) => `https://www.tiktok.com/search?q=${encodeURIComponent(query)}&t=v`,
      selectors: {
        item: '[data-e2e="search_video-item"]',
        title: 'a',
        url: 'a',
        author: '[data-e2e="search-video-desc-username"]',
        metrics: {
          views: '[data-e2e="search-like-container"]',
        },
        thumbnail: 'img',
      },
      waitForSelector: '[data-e2e="search_video-item"]',
      needScroll: true,
    },

    // Reddit (更新选择器)
    'reddit_search': {
      url: (query) => `https://www.reddit.com/search/?q=${encodeURIComponent(query)}&type=posts`,
      selectors: {
        item: '[data-adclicklocation="title"]',
        title: 'a',
        url: 'a',
        snippet: 'div',
        author: 'a[href*="/user/"]',
        metrics: {
          comments: 'a[data-click-id="comments"]',
        },
      },
      waitForSelector: '[data-adclicklocation="title"]',
      needScroll: true,
    },

    // Twitter
    'twitter_search': {
      url: (query) => `https://twitter.com/search?q=${encodeURIComponent(query)}&src=typed_query`,
      selectors: {
        item: 'div[data-testid="tweet"]',
        title: '[data-testid="tweet"] a[href*="/status/"]',
        url: '[data-testid="tweet"] a[href*="/status/"]',
        snippet: '[data-testid="tweetText"] span',
        author: '[data-testid="User-Name"] span',
        metrics: {
          likes: '[data-testid="like"]',
          comments: '[data-testid="reply"]',
          shares: '[data-testid="retweet"]',
        },
      },
      waitForSelector: 'div[data-testid="tweet"]',
      needScroll: true,
    },

    // Instagram (更新选择器)
    'instagram_search': {
      url: (query) => `https://www.instagram.com/explore/tags/${encodeURIComponent(query.replace(/[^a-zA-Z0-9]/g, ''))}/`,
      selectors: {
        item: 'a[href*="/p/"]',
        title: 'a[href*="/p/"]',
        url: 'a[href*="/p/"]',
        thumbnail: 'img',
      },
      waitForSelector: 'a[href*="/p/"]',
      needScroll: true,
    },

    // LinkedIn (更新选择器 - 2024)
    'linkedin_search': {
      url: (query) => `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(query)}`,
      selectors: {
        item: '.search-result',
        title: 'a',
        url: 'a',
        snippet: '.search-result__snippet',
      },
      waitForSelector: '.search-result',
      needScroll: true,
    },

    // Pinterest (更新选择器)
    'pinterest_search': {
      url: (query) => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
      selectors: {
        item: 'div[data-test-id="pin"]',
        title: 'a[href*="/pin/"]',
        url: 'a[href*="/pin/"]',
        thumbnail: 'img[srcset]',
      },
      waitForSelector: 'div[data-test-id="pin"]',
      needScroll: true,
    },

    // Quora
    'quora_search': {
      url: (query) => `https://www.quora.com/search?q=${encodeURIComponent(query)}&type=answer`,
      selectors: {
        item: 'div[class*="QuestionTitleBase"]',
        title: 'span[class*="QuestionTitleText"]',
        url: 'a[href*="/"]',
        snippet: 'div[class*="QuestionContextText"]',
        author: 'a[href*="/profile/"]',
      },
      waitForSelector: 'div[class*="QuestionTitleBase"]',
      needScroll: true,
    },

    // Amazon
    'amazon_search': {
      url: (query) => `https://www.amazon.com/s?k=${encodeURIComponent(query)}`,
      selectors: {
        item: 'div[data-component-type="s-search-result"]',
        title: 'h2 a span',
        url: 'h2 a',
        snippet: 'span.a-size-base-plus',
      },
      waitForSelector: 'div[data-component-type="s-search-result"]',
      needScroll: true,
    },

    // Medium
    'medium_search': {
      url: (query) => `https://medium.com/search?q=${encodeURIComponent(query)}`,
      selectors: {
        item: 'div[data-test-id="stream-item"]',
        title: 'h2 a',
        url: 'h2 a',
        snippet: 'p',
        author: 'a[href*="/@"]',
        thumbnail: 'img',
      },
      waitForSelector: 'div[data-test-id="stream-item"]',
      needScroll: true,
    },
  };

  /**
   * 初始化浏览器（模拟真实用户）
   */
  private async initBrowser(config: CrawlerConfig = {}): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    if (this.isInitializing) {
      // 等待初始化完成
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.initBrowser(config);
    }

    this.isInitializing = true;

    try {
      console.log('[Puppeteer] Initializing browser with human-like behavior...');

      // 使用更真实的用户代理（定期轮换）
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      ];

      this.browser = await puppeteer.launch({
        headless: config.headless ?? true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
          // 反爬虫检测参数
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--window-position=0,0',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images',  // 禁用图片加快速度
          '--disable-javascript',  // 某些网站不需要JS
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
        // 禁用webdriver标志
        ignoreDefaultArgs: ['--enable-automation'],
      });

      // 覆盖 navigator.webdriver
      await this.browser.newPage().then(async (page) => {
        await page.evaluateOnNewDocument(() => {
          // @ts-nocheck - Browser context
          Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
          });

          // 模拟真实的插件
          Object.defineProperty(navigator, 'plugins', {
            get: () => [
              { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
              { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
              { name: 'Native Client', filename: 'internal-nacl-plugin' },
            ],
          });

          // 模拟真实的语言
          Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en', 'zh-CN'],
          });

          // 模拟真实的平台
          Object.defineProperty(navigator, 'platform', {
            get: () => 'Win32',
          });

          // 模拟真实的硬件并发数
          Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 8,
          });

          // 模拟真实的设备内存
          Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8,
          });

          // 移除自动化相关的属性
          delete (window as any).chrome?.runtime;
        });
        await page.close();
      });

      console.log('[Puppeteer] Browser initialized with anti-detection measures');
      this.isInitializing = false;
      return this.browser;
    } catch (error) {
      this.isInitializing = false;
      throw error;
    }
  }

  /**
   * 执行搜索（模拟人工操作）
   */
  async search(
    query: string,
    channelId: string,
    maxResults: number = 15,
    includeFullContent: boolean = false
  ): Promise<SearchResultItem[]> {
    const strategy = this.strategies[channelId];

    if (!strategy) {
      throw new Error(`No crawler strategy found for channel: ${channelId}`);
    }

    console.log(`[Puppeteer] Searching "${query}" on ${channelId}`);

    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // 随机用户代理
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      ];
      const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
      await page.setUserAgent(randomUA);

      // 设置更真实的视口（随机尺寸）
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
      ];
      const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
      await page.setViewport(randomViewport);

      // 设置额外的请求头
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      // 导航到搜索页面（模拟人工延迟）
      await this.randomDelay(1000, 3000);

      const url = strategy.url(query);
      console.log(`[Puppeteer] Navigating to: ${url.substring(0, 100)}...`);

      // 使用更温和的导航策略
      await page.goto(url, {
        waitUntil: 'domcontentloaded',  // 改为 domcontentloaded 而不是 networkidle2
        timeout: 45000,
      });

      // 额外等待，模拟人工阅读
      await this.randomDelay(2000, 4000);

      // 等待内容加载
      if (strategy.waitForSelector) {
        try {
          await page.waitForSelector(strategy.waitForSelector, { timeout: 15000 });
          await this.randomDelay(500, 1500);
        } catch (error) {
          console.log(`[Puppeteer] Selector timeout, trying to continue...`);
          // 不抛出错误，继续尝试
        }
      }

      // 滚动加载更多内容（模拟人工滚动）
      if (strategy.needScroll) {
        await this.humanLikeScroll(page);
      }

      // 提取结果
      const browserEvalFunction = (selectors: any, max: number) => {
        // @ts-nocheck - Browser context code
        const items: any[] = [];

        const itemElements = document.querySelectorAll(selectors.item);

        // 辅助函数：解析指标数字
        function parseMetric(text: string): number {
          const cleaned = text.replace(/[^\d.KMB]/gi, '').toUpperCase();
          if (cleaned.endsWith('K')) {
            return parseFloat(cleaned.slice(0, -1)) * 1000;
          } else if (cleaned.endsWith('M')) {
            return parseFloat(cleaned.slice(0, -1)) * 1000000;
          } else if (cleaned.endsWith('B')) {
            return parseFloat(cleaned.slice(0, -1)) * 1000000000;
          }
          return parseFloat(cleaned) || 0;
        }

        for (let i = 0; i < Math.min(itemElements.length, max); i++) {
          const item = itemElements[i];
          const titleEl = item.querySelector(selectors.title);
          const urlEl = item.querySelector(selectors.url);

          if (!titleEl || !urlEl) continue;

          const result: any = {
            title: titleEl.textContent?.trim() || '',
            url: (urlEl as any).href || '',
            snippet: '',
            source: 'crawler',
            method: 'crawler',
          };

          // 提取摘要
          if (selectors.snippet) {
            const snippetEl = item.querySelector(selectors.snippet);
            if (snippetEl) {
              result.snippet = snippetEl.textContent?.trim() || '';
            }
          }

          // 提取作者
          if (selectors.author) {
            const authorEl = item.querySelector(selectors.author);
            if (authorEl) {
              result.author = authorEl.textContent?.trim();
            }
          }

          // 提缩略图
          if (selectors.thumbnail) {
            const thumbEl = item.querySelector(selectors.thumbnail);
            if (thumbEl) {
              result.thumbnail = (thumbEl as any).src || (thumbEl as any).srcset?.split(' ')[0];
            }
          }

          // 提取指标
          if (selectors.metrics) {
            result.metrics = {};
            if (selectors.metrics.views) {
              const viewsEl = item.querySelector(selectors.metrics.views);
              if (viewsEl) {
                const viewsText = viewsEl.textContent?.trim() || '0';
                result.metrics.views = parseMetric(viewsText);
              }
            }
            if (selectors.metrics.likes) {
              const likesEl = item.querySelector(selectors.metrics.likes);
              if (likesEl) {
                const likesText = likesEl.textContent?.trim() || '0';
                result.metrics.likes = parseMetric(likesText);
              }
            }
            if (selectors.metrics.comments) {
              const commentsEl = item.querySelector(selectors.metrics.comments);
              if (commentsEl) {
                const commentsText = commentsEl.textContent?.trim() || '0';
                result.metrics.comments = parseMetric(commentsText);
              }
            }
            if (selectors.metrics.shares) {
              const sharesEl = item.querySelector(selectors.metrics.shares);
              if (sharesEl) {
                const sharesText = sharesEl.textContent?.trim() || '0';
                result.metrics.shares = parseMetric(sharesText);
              }
            }
          }

          items.push(result);
        }

        return items;
      };

      const results = await page.evaluate(browserEvalFunction as any, strategy.selectors, maxResults);

      // 转换结果为正确的类型
      const typedResults: SearchResultItem[] = results.map((r: any) => ({
        ...r,
        method: SearchMethod.CRAWLER,
      }));

      // 如果需要完整内容，打开每个链接抓取
      if (includeFullContent) {
        for (const result of typedResults.slice(0, 3)) { // 只抓取前3个
          try {
            const fullContent = await this.fetchFullContent(page, result.url);
            result.fullContent = fullContent;
          } catch (error) {
            console.log(`[Puppeteer] Failed to fetch full content for ${result.url}`);
          }
        }
      }

      console.log(`[Puppeteer] Found ${typedResults.length} results`);

      return typedResults;
    } catch (error: any) {
      console.error(`[Puppeteer] Search error:`, error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * 自动滚动页面以加载懒加载内容
   */
  private async autoScroll(page: Page): Promise<void> {
    await this.humanLikeScroll(page);
  }

  /**
   * 模拟人工滚动（随机速度和停顿）
   */
  private async humanLikeScroll(page: Page): Promise<void> {
    const scrollFunction = () => {
      // @ts-nocheck - Browser context code
      return new Promise<void>((resolve) => {
        let totalHeight = 0;
        const maxScroll = 10000;

        const scroll = () => {
          const scrollHeight = document.body.scrollHeight;
          const remaining = scrollHeight - window.scrollY - window.innerHeight;

          // 随机滚动距离，模拟人工
          const distance = Math.random() * 200 + 50;
          window.scrollBy(0, distance);
          totalHeight += distance;

          // 随机延迟，模拟人工停顿
          const delay = Math.random() * 300 + 100;

          if (totalHeight >= scrollHeight || totalHeight > maxScroll || remaining < 100) {
            resolve();
          } else {
            setTimeout(scroll, delay);
          }
        };

        scroll();
      });
    };

    await page.evaluate(scrollFunction as any);
    await this.randomDelay(1000, 2000);
  }

  /**
   * 随机延迟（模拟人类反应时间）
   */
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 模拟鼠标移动（可选，用于某些网站）
   */
  private async simulateMouseMovement(page: Page): Promise<void> {
    try {
      const viewport = page.viewport();
      if (viewport) {
        const x = Math.random() * viewport.width;
        const y = Math.random() * viewport.height;
        await page.mouse.move(x, y);
        await this.randomDelay(100, 500);
      }
    } catch (error) {
      // 忽略鼠标移动错误
    }
  }

  /**
   * 获取页面完整内容
   */
  private async fetchFullContent(page: Page, url: string): Promise<string> {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

      const extractFunction = () => {
        // @ts-nocheck - Browser context code
        // 尝试多种内容提取方式
        const selectors = [
          'article',
          '[role="article"]',
          'main',
          '.content',
          '.post-content',
          '.article-content',
          'body',
        ];

        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el) {
            return (el as any).innerText;
          }
        }

        return document.body.innerText;
      };

      const content = await page.evaluate(extractFunction as any);

      return content;
    } catch (error) {
      return '';
    }
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 获取浏览器状态
   */
  isConnected(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }
}

// 导出单例
export const puppeteerSearchService = new PuppeteerSearchService();

// 进程退出时关闭浏览器
process.on('exit', () => {
  puppeteerSearchService.close().catch(console.error);
});
