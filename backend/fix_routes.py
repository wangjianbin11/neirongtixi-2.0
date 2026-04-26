#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

file_path = 'H:/ComfyUI/web/cc-工作流/内容系统/backend/src/api/keywords.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 要插入的export路由代码
export_routes = r'''


/**
 * GET /api/v1/keywords/export - 导出关键词
 */
keywordsRouter.get('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      category,
      priority,
      target_customer: targetCustomer,
      search,
    } = req.query;

    const keywords = await keywordService.list({
      limit: 10000,
      offset: 0,
      category: category as string,
      priority: priority as string,
      search: search as string,
    });

    // 转换为CSV格式
    const headers = ['关键词', '分类', '搜索量', '竞争度', '意图', '优先级'];
    const rows = keywords.keywords.map((k) => [
      k.keyword,
      k.category || '',
      k.search_volume || 0,
      k.competition || '',
      k.intent || '',
      k.priority || '',
    ]);

    let csv = headers.join(',') + '\n';
    csv += rows.map((row) => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="keywords.csv"');
    res.send('\uFEFF' + csv); // 添加UTF-8 BOM
  } catch (error) {
    console.error('Export keywords error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'KEYWORD_EXPORT_ERROR',
        message: 'Failed to export keywords',
      },
    });
  }
});

/**
 * GET /api/v1/keywords/export-template - 获取导出模板
 */
keywordsRouter.get('/export-template', authenticate, async (req: Request, res: Response) => {
  try {
    const headers = ['关键词', '分类', '搜索量', '竞争度', '意图', '优先级', '目标客户'];
    const example = [
      'shopify seo',
      'core',
      '1000',
      'medium',
      'informational',
      'A',
      'C1-Entrepreneur',
    ];

    let csv = headers.join(',') + '\n';
    csv += example.join(',');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="keywords_template.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Export template error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_EXPORT_ERROR',
        message: 'Failed to export template',
      },
    });
  }
});
'''

# 直接字符串替换 - 匹配实际的代码格式
search_text = """    });
  }
});

/**
 * POST /api/v1/keywords - 创建关键词
"""
replace_text = """    });""" + export_routes + """

/**
 * POST /api/v1/keywords - 创建关键词
"""

content = content.replace(search_text, replace_text, 1)

# 删除文件末尾的export路由
export_start = content.find("""

/**
 * GET /api/v1/keywords/export - 导出关键词
""")
if export_start != -1:
    content = content[:export_start] + "\n"

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("文件修改完成!")
