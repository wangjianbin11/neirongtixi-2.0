# 调研渠道实现方案

本文档详细记录了关键词调研和话题调研的所有渠道、实现方案、API接口和部署指南。

---

## 📋 目录

1. [关键词调研渠道](#关键词调研渠道)
2. [话题调研渠道](#话题调研渠道)
3. [推荐实现方案](#推荐实现方案)
4. [API集成指南](#api集成指南)

---

## 🔍 关键词调研渠道

### 渠道列表（共11个）

#### 搜索引擎类 (4个)

| 渠道ID | 名称 | 类型 | 优先级 | 状态 | 推荐方案 |
|--------|------|------|--------|------|----------|
| `google_search` | Google搜索 | search | 1 | enabled | SerpAPI / 需代理 |
| `google_trends` | Google趋势 | search | 2 | enabled | SerpAPI / 模拟数据 |
| `google_suggest` | Google推荐词 | search | 3 | enabled | SerpAPI / 需代理 |
| `bing_search` | Bing搜索 | search | 1 | enabled | **Bing Search API** ✅ |

#### 社交媒体类 (4个)

| 渠道ID | 名称 | 类型 | 优先级 | 状态 | 推荐方案 |
|--------|------|------|--------|------|----------|
| `youtube_search` | YouTube搜索 | social | 4 | enabled | **YouTube Data API v3** ✅ |
| `tiktok_search` | TikTok搜索 | social | 3 | enabled | SerpAPI / 难爬取 |
| `pinterest_search` | Pinterest搜索 | social | 4 | enabled | Puppeteer爬虫 |
| `linkedin_search` | LinkedIn搜索 | social | 5 | enabled | SerpAPI / 需登录 |

#### 论坛问答类 (2个)

| 渠道ID | 名称 | 类型 | 优先级 | 状态 | 推荐方案 |
|--------|------|------|--------|------|----------|
| `reddit_search` | Reddit搜索 | forum | 6 | enabled | **Reddit JSON API** ✅ |
| `quora_search` | Quora问答 | qa | 7 | enabled | Puppeteer爬虫 |

#### 电商平台 (1个)

| 渠道ID | 名称 | 类型 | 优先级 | 状态 | 推荐方案 |
|--------|------|------|--------|------|----------|
| `amazon_search` | Amazon搜索 | ecommerce | 8 | enabled | Puppeteer / Amazon PA API |

---

## 📚 话题调研渠道

### 渠道列表（共20个）

#### 搜索引擎类 (4个)

| 渠道ID | 名称 | 优先级 | 状态 | 难度 | 推荐方案 |
|--------|------|--------|------|------|----------|
| `google_search` | Google搜索 | 1 | enabled | 🔴高 | SerpAPI / 需代理 |
| `bing_search` | Bing搜索 | 2 | enabled | 🟢低 | **Bing Search API** ✅ |
| `duckduckgo_search` | DuckDuckGo搜索 | 4 | enabled | 🟡中 | Puppeteer爬虫 |

#### 社交媒体类 (6个)

| 渠道ID | 名称 | 优先级 | 状态 | 难度 | 推荐方案 |
|--------|------|--------|------|------|----------|
| `youtube_search` | YouTube | 5 | enabled | 🟢低 | **YouTube Data API v3** ✅ |
| `tiktok_search` | TikTok | 6 | enabled | 🔴高 | SerpAPI / 难爬取 |
| `instagram_search` | Instagram | 7 | enabled | 🔴高 | 需登录/SerpAPI |
| `linkedin_search` | LinkedIn | 8 | enabled | 🔴高 | 需登录/SerpAPI |
| `twitter_search` | Twitter/X | 9 | enabled | 🔴高 | Twitter API (付费) |
| `pinterest_search` | Pinterest | 10 | enabled | 🟡中 | Puppeteer爬虫 |

#### 电商平台类 (3个)

| 渠道ID | 名称 | 优先级 | 状态 | 难度 | 推荐方案 |
|--------|------|--------|------|------|----------|
| `amazon_search` | Amazon | 11 | enabled | 🟡中 | Puppeteer/Amazon PA API |
| `ebay_search` | eBay | 12 | enabled | 🟡中 | Puppeteer爬虫 |
| `shopify_search` | Shopify店铺 | 13 | enabled | 🔴高 | 很难爬取 |

#### 论坛社区类 (5个)

| 渠道ID | 名称 | 优先级 | 状态 | 难度 | 推荐方案 |
|--------|------|--------|------|------|----------|
| `reddit_search` | Reddit | 14 | enabled | 🟢低 | **Reddit JSON API** ✅ |
| `quora_search` | Quora | 15 | enabled | 🟡中 | Puppeteer爬虫 |
| `stack_overflow` | Stack Overflow | 16 | enabled | 🟢低 | **Stack Exchange API** ✅ |
| `medium_search` | Medium | 17 | enabled | 🟡中 | Puppeteer爬虫 |
| `discord_search` | Discord | 18 | enabled | 🔴高 | 非常难爬取 |

#### 新闻媒体类 (2个)

| 渠道ID | 名称 | 优先级 | 状态 | 难度 | 推荐方案 |
|--------|------|--------|------|------|----------|
| `google_news` | Google新闻 | 19 | enabled | 🔴高 | SerpAPI / 需代理 |
| `techcrunch_search` | TechCrunch | 20 | enabled | 🟢低 | **RSS Feed** ✅ |

---

## 🎯 推荐实现方案

### 方案 A：免费/低成本 API（推荐优先实现）

#### 1. Bing Search API ✅

**官网**: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api

**免费额度**: 1000次/月

**API 端点**:
```
GET https://api.bing.microsoft.com/v7.0/search
```

**请求头**:
```typescript
headers: {
  'Ocp-Apim-Subscription-Key': 'YOUR_API_KEY'
}
```

**请求参数**:
```typescript
params: {
  q: '搜索关键词',
  count: 10,
  offset: 0,
  mkt: 'en-US',
  safeSearch: 'Moderate'
}
```

**响应示例**:
```json
{
  "webPages": {
    "value": [
      {
        "name": "页面标题",
        "url": "https://example.com",
        "snippet": "页面描述",
        "dateLastCrawled": "2024-01-01"
      }
    ]
  }
}
```

**集成示例**:
```typescript
import axios from 'axios';

export class BingSearchService {
  private apiKey = process.env.BING_SEARCH_API_KEY;
  private baseUrl = 'https://api.bing.microsoft.com/v7.0/search';

  async search(query: string, count: number = 10): Promise<any[]> {
    const response = await axios.get(this.baseUrl, {
      params: { q: query, count },
      headers: { 'Ocp-Apim-Subscription-Key': this.apiKey }
    });
    return response.data.webPages?.value || [];
  }
}
```

---

#### 2. Reddit JSON API ✅

**官网**: https://www.reddit.com/dev/api/

**免费额度**: 无限制（无需认证）

**API 端点**:
```
GET https://www.reddit.com/search.json
```

**请求参数**:
```typescript
params: {
  q: '搜索关键词',
  limit: 50,
  sort: 'relevance',  // relevance, hot, top, new, comments
  t: 'all'  // hour, day, week, month, year, all
}
```

**响应示例**:
```json
{
  "data": {
    "children": [
      {
        "data": {
          "title": "帖子标题",
          "selftext": "帖子内容",
          "url": "https://reddit.com/r/...",
          "author": "用户名",
          "subreddit": "子版块",
          "score": 1234,
          "num_comments": 56,
          "created_utc": 1234567890
        }
      }
    ]
  }
}
```

**集成示例**:
```typescript
export class RedditService {
  async search(query: string, limit: number = 50): Promise<any[]> {
    const response = await axios.get('https://www.reddit.com/search.json', {
      params: { q: query, limit, sort: 'relevance' },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    return response.data.data.children.map((post: any) => ({
      title: post.data.title,
      url: post.data.url,
      author: post.data.author,
      subreddit: post.data.subreddit,
      score: post.data.score,
      comments: post.data.num_comments,
      content: post.data.selftext
    }));
  }
}
```

---

#### 3. YouTube Data API v3 ✅

**官网**: https://developers.google.com/youtube/v3

**免费额度**: 10,000单位/天

**API 端点**:
```
GET https://www.googleapis.com/youtube/v3/search
```

**请求参数**:
```typescript
params: {
  key: 'YOUR_API_KEY',
  q: '搜索关键词',
  part: 'snippet',
  type: 'video',
  maxResults: 15,
  order: 'relevance'
}
```

**响应示例**:
```json
{
  "items": [
    {
      "id": { "videoId": "xxxxxxxxxxx" },
      "snippet": {
        "title": "视频标题",
        "description": "视频描述",
        "channelTitle": "频道名称",
        "thumbnails": {
          "medium": { "url": "https://..." }
        }
      }
    }
  ]
}
```

---

#### 4. Stack Exchange API ✅

**官网**: https://api.stackexchange.com/

**免费额度**: 无需认证（有速率限制）

**API 端点**:
```
GET https://api.stackexchange.com/2.3/search/advanced
```

**请求参数**:
```typescript
params: {
  order: 'desc',
  sort: 'activity',
  accepted: true,
  answers: 1,
  title: '关键词',
  site: 'stackoverflow'
}
```

**集成示例**:
```typescript
export class StackOverflowService {
  async search(query: string): Promise<any[]> {
    const response = await axios.get('https://api.stackexchange.com/2.3/search/advanced', {
      params: {
        order: 'desc',
        sort: 'activity',
        accepted: true,
        answers: 1,
        title: query,
        site: 'stackoverflow'
      }
    });

    return response.data.items.map((item: any) => ({
      title: item.title,
      url: item.link,
      author: item.owner.display_name,
      score: item.score,
      answers: item.answer_count,
      tags: item.tags
    }));
  }
}
```

---

#### 5. TechCrunch RSS Feed ✅

**RSS 地址**:
```
https://techcrunch.com/feed/
```

**解析库**: `rss-parser` 或 `fast-xml-parser`

**集成示例**:
```typescript
import Parser from 'rss-parser';

export class TechCrunchService {
  async getLatestNews(limit: number = 20): Promise<any[]> {
    const feed = await Parser.parseURL('https://techcrunch.com/feed/');

    return feed.items.slice(0, limit).map(item => ({
      title: item.title,
      url: item.link,
      pubDate: item.pubDate,
      content: item.contentSnippet,
      author: item.creator,
      categories: item.categories
    }));
  }
}
```

---

### 方案 B：付费聚合API（最简单）

#### SerpAPI

**官网**: https://serpapi.com/

**支持渠道**: Google、Bing、YouTube、TikTok、Instagram、LinkedIn、Twitter、Pinterest、Reddit、Quora、Amazon、eBay、DuckDuckGo、Medium、Stack Overflow

**价格**: $50/月 (5000次搜索)

**API 示例**:
```typescript
// Google 搜索
GET https://serpapi.com/search.json?engine=google&q=keyword&api_key=YOUR_KEY

// YouTube 搜索
GET https://serpapi.com/search.json?engine=youtube&q=keyword&api_key=YOUR_KEY

// Reddit 搜索
GET https://serpapi.com/search.json?engine=reddit&q=keyword&api_key=YOUR_KEY
```

**优点**:
- 一个API解决所有渠道
- 稳定可靠，无需维护爬虫
- 处理所有反爬机制
- 支持高级功能（地理位置、语言等）

**缺点**:
- 需要付费
- 有请求限制

---

### 方案 C：Puppeteer 爬虫（最难）

**适用渠道**: Pinterest、Quora、Medium、Amazon、eBay

**挑战**:
- CSS 选择器经常变化
- 反爬虫检测
- 需要模拟人工行为
- 速度慢、资源消耗大

**当前实现状态**:
- ✅ 已配置反检测措施
- ✅ 已实现人工行为模拟
- ⚠️ 选择器需要定期更新
- ⚠️ 部分网站可能需要登录

---

## 🔧 API 集成指南

### 环境变量配置

在 `.env` 文件中添加：

```env
# Bing Search API
BING_SEARCH_API_KEY=your_bing_api_key_here

# YouTube Data API
GOOGLE_API_KEY=your_google_api_key_here

# Stack Exchange API (无需认证)

# Reddit API (无需认证)

# SerpAPI (可选)
SERPAPI_KEY=your_serpapi_key_here
```

### 服务文件结构

```
backend/src/services/
├── bingSearchService.ts        # Bing Search API
├── redditJsonService.ts         # Reddit JSON API
├── youtubeApiService.ts         # YouTube Data API (已存在)
├── stackOverflowService.ts      # Stack Exchange API
├── techCrunchRssService.ts      # TechCrunch RSS Feed
├── serpApiService.ts           # SerpAPI (可选)
└── puppeteerSearchService.ts    # Puppeteer爬虫 (已存在)
```

### 混合搜索服务集成

更新 `hybridSearchService.ts` 的渠道能力配置：

```typescript
// 优先使用 API，失败后回退到 Puppeteer 或 SerpAPI
private channelCapabilities: Record<string, ChannelCapability> = {
  'bing_search': {
    primaryMethod: SearchMethod.API,
    apiService: bingSearchService,
    fallbackMethod: SearchMethod.CRAWLER
  },
  'reddit_search': {
    primaryMethod: SearchMethod.API,
    apiService: redditJsonService,
    fallbackMethod: SearchMethod.CRAWLER
  },
  // ... 其他渠道
}
```

---

## 📝 实施计划

### 阶段一：立即可实现（1-2天）

| 优先级 | 渠道 | API | 预计工作量 |
|--------|------|-----|-----------|
| 1 | Bing搜索 | Bing Search API | 2小时 |
| 2 | Reddit搜索 | Reddit JSON API | 1小时 |
| 3 | YouTube搜索 | YouTube Data API | 2小时 |
| 4 | Stack Overflow | Stack Exchange API | 1小时 |
| 5 | TechCrunch | RSS Feed | 1小时 |

### 阶段二：需要调试（2-3天）

| 优先级 | 渠道 | 方案 | 预计工作量 |
|--------|------|------|-----------|
| 6 | Pinterest | Puppeteer爬虫 | 4小时 |
| 7 | Quora | Puppeteer爬虫 | 3小时 |
| 8 | Medium | Puppeteer爬虫 | 3小时 |
| 9 | Amazon | Puppeteer爬虫 | 4小时 |
| 10 | eBay | Puppeteer爬虫 | 3小时 |

### 阶段三：可选方案

| 优先级 | 渠道 | 方案 | 预计工作量 |
|--------|------|------|-----------|
| 11 | Google搜索 | SerpAPI | 1小时 |
| 12 | TikTok搜索 | SerpAPI | 1小时 |
| 13 | Instagram搜索 | SerpAPI | 1小时 |
| 14 | LinkedIn搜索 | SerpAPI | 1小时 |

---

## 📊 渠道难度评级

| 难度 | 说明 | 渠道数量 | 渠道列表 |
|------|------|---------|---------|
| 🟢 低 | 有官方免费API | 5 | Bing, Reddit, YouTube, Stack Overflow, TechCrunch |
| 🟡 中 | 可用Puppeteer爬取 | 5 | Pinterest, Quora, Medium, Amazon, eBay |
| 🔴 高 | 需付费API或很难爬取 | 10 | Google, Google趋势, TikTok, Instagram, LinkedIn, Twitter, Google新闻, Discord, Shopify |

---

## 🚀 快速启动

### 1. 获取 API Keys

1. **Bing Search API**
   - 访问: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api
   - 注册 Azure 账号（免费）
   - 创建 Bing Search v7 资源
   - 获取 API Key

2. **YouTube Data API v3**
   - 访问: https://console.cloud.google.com/
   - 创建新项目
   - 启用 YouTube Data API v3
   - 创建 API Key

3. **Reddit / Stack Exchange**
   - 无需注册，直接使用

### 2. 配置环境变量

```bash
# 编辑 .env 文件
cd backend
nano .env

# 添加以下内容
BING_SEARCH_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
```

### 3. 测试 API

```bash
# 测试 Bing Search API
curl "https://api.bing.microsoft.com/v7.0/search?q=test&count=5" \
  -H "Ocp-Apim-Subscription-Key: YOUR_KEY"

# 测试 Reddit API
curl "https://www.reddit.com/search.json?q=test&limit=5"

# 测试 Stack Exchange API
curl "https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=activity&accepted=True&answers=1&title=test&site=stackoverflow"
```

---

## 📖 参考资料

- [Bing Search API 文档](https://docs.microsoft.com/en-us/bing/search-apis/bing-web-search/overview)
- [YouTube Data API 文档](https://developers.google.com/youtube/v3)
- [Reddit JSON API 文档](https://www.reddit.com/dev/api/)
- [Stack Exchange API 文档](https://api.stackexchange.com/)
- [SerpAPI 文档](https://serpapi.com/search-api)
- [Puppeteer 文档](https://pptr.dev/)

---

## 📅 更新日志

- 2026-02-03: 初始版本，整理所有31个渠道的实现方案
- 持续更新中...

---

**文档维护者**: AI Assistant
**最后更新**: 2026年2月3日
