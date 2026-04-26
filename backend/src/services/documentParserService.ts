import fs from 'fs/promises';
import path from 'path';
// 使用 require 导入 pdf-parse，因为它是 CommonJS 模块
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import { marked } from 'marked';

export interface ParsedDocument {
  title: string;
  content: string;
  wordCount: number;
  metadata?: Record<string, any>;
}

/**
 * 文档解析服务
 * 支持 PDF, Word, Excel, Markdown, 文本文件
 */
export class DocumentParserService {
  /**
   * 解析PDF文档
   */
  async parsePDF(filePath: string): Promise<ParsedDocument> {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);

    const content = data.text;
    const title = this.extractTitle(content) || path.basename(filePath, '.pdf');

    return {
      title,
      content: content.trim(),
      wordCount: content.length,
      metadata: {
        pages: data.numpages,
        info: data.info,
      },
    };
  }

  /**
   * 解析Word文档
   */
  async parseWord(filePath: string): Promise<ParsedDocument> {
    const result = await mammoth.extractRawText({ path: filePath });
    const content = result.value;

    const title = this.extractTitle(content) || path.basename(filePath, '.docx');

    return {
      title,
      content: content.trim(),
      wordCount: content.length,
      metadata: {
        messages: result.messages,
      },
    };
  }

  /**
   * 解析Excel文档
   */
  async parseExcel(filePath: string): Promise<ParsedDocument> {
    const workbook = xlsx.readFile(filePath);
    const sheets: string[] = [];

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (data.length > 0) {
        sheets.push(`## ${sheetName}\n`);
        data.forEach((row: any[]) => {
          const rowText = row
            .map((cell: any) => cell?.toString() || '')
            .filter((text: string) => text.trim())
            .join(' | ');
          if (rowText) {
            sheets.push(rowText);
          }
        });
        sheets.push('');
      }
    });

    const content = sheets.join('\n');
    const title = path.basename(filePath, path.extname(filePath));

    return {
      title,
      content,
      wordCount: content.length,
      metadata: {
        sheetCount: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames,
      },
    };
  }

  /**
   * 解析Markdown文档
   */
  async parseMarkdown(filePath: string): Promise<ParsedDocument> {
    const content = await fs.readFile(filePath, 'utf-8');
    const title = this.extractMarkdownTitle(content) || path.basename(filePath, '.md');

    return {
      title,
      content: content.trim(),
      wordCount: content.length,
    };
  }

  /**
   * 解析纯文本文档
   */
  async parseText(filePath: string): Promise<ParsedDocument> {
    const content = await fs.readFile(filePath, 'utf-8');
    const title = this.extractTitle(content) || path.basename(filePath, path.extname(filePath));

    return {
      title,
      content: content.trim(),
      wordCount: content.length,
    };
  }

  /**
   * 自动检测并解析文档
   */
  async parse(filePath: string, sourceType: string): Promise<ParsedDocument> {
    const ext = path.extname(filePath).toLowerCase();

    switch (sourceType) {
      case 'pdf':
        if (ext !== '.pdf') {
          throw new Error('文件类型与PDF不匹配');
        }
        return this.parsePDF(filePath);

      case 'word':
        if (!['.doc', '.docx'].includes(ext)) {
          throw new Error('文件类型与Word不匹配');
        }
        return this.parseWord(filePath);

      case 'excel':
        if (!['.xls', '.xlsx'].includes(ext)) {
          throw new Error('文件类型与Excel不匹配');
        }
        return this.parseExcel(filePath);

      case 'markdown':
        if (!['.md', '.markdown'].includes(ext)) {
          throw new Error('文件类型与Markdown不匹配');
        }
        return this.parseMarkdown(filePath);

      case 'text':
        return this.parseText(filePath);

      default:
        throw new Error(`不支持的文件类型: ${sourceType}`);
    }
  }

  /**
   * 从内容中提取标题（取第一行非空文本）
   */
  private extractTitle(content: string): string | null {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    return lines.length > 0 ? lines[0].substring(0, 100) : null;
  }

  /**
   * 从Markdown中提取标题
   */
  private extractMarkdownTitle(content: string): string | null {
    const lines = content.split('\n');

    // 查找第一个 # 标题
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        return trimmed.replace(/^#+\s*/, '');
      }
    }

    // 如果没有找到标题，返回第一行非空文本
    return this.extractTitle(content);
  }
}

// 导出单例
export const documentParserService = new DocumentParserService();
