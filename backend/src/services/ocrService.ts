import Tesseract from 'tesseract.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export interface OCRResult {
  text: string;
  confidence: number;
  words?: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
}

/**
 * OCR服务 - 图片文字识别
 * 使用 Tesseract.js 支持中英文识别
 */
export class OCRService {
  private worker: Tesseract.Worker | null = null;

  /**
   * 初始化OCR worker
   */
  private async getWorker(): Promise<Tesseract.Worker> {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('eng+chi_sim', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${(m.progress * 100).toFixed(2)}%`);
          }
        },
      });
    }
    return this.worker;
  }

  /**
   * 从图片文件路径提取文字
   */
  async extractTextFromImage(imagePath: string): Promise<OCRResult> {
    try {
      const worker = await this.getWorker();

      const { data } = await worker.recognize(imagePath);

      return {
        text: data.text.trim(),
        confidence: data.confidence,
        words: (data as any).words?.map((word: any) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: {
            x0: word.bbox.x0,
            y0: word.bbox.y0,
            x1: word.bbox.x1,
            y1: word.bbox.y1,
          },
        })),
      };
    } catch (error: any) {
      throw new Error(`OCR识别失败: ${error.message}`);
    }
  }

  /**
   * 从Buffer提取文字
   */
  async extractTextFromBuffer(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    try {
      // 将Buffer保存为临时文件
      const tempDir = path.join(process.cwd(), 'temp', 'ocr');
      await fs.mkdir(tempDir, { recursive: true });

      const ext = this.getExtensionFromMimeType(mimeType);
      const tempPath = path.join(tempDir, `${uuidv4()}.${ext}`);

      await fs.writeFile(tempPath, imageBuffer);

      // 识别
      const result = await this.extractTextFromImage(tempPath);

      // 清理临时文件
      await fs.unlink(tempPath).catch(() => {});

      return result;
    } catch (error: any) {
      throw new Error(`从Buffer识别文字失败: ${error.message}`);
    }
  }

  /**
   * 批量处理多张图片
   */
  async extractTextFromImages(imagePaths: string[]): Promise<OCRResult[]> {
    const results: OCRResult[] = [];

    for (let i = 0; i < imagePaths.length; i++) {
      console.log(`Processing image ${i + 1}/${imagePaths.length}`);
      const result = await this.extractTextFromImage(imagePaths[i]);
      results.push(result);
    }

    return results;
  }

  /**
   * 合并多个OCR结果
   */
  mergeOCRResults(results: OCRResult[]): OCRResult {
    const allTexts = results.map(r => r.text);
    const allWords = results.flatMap(r => r.words || []);
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    return {
      text: allTexts.join('\n\n'),
      confidence: avgConfidence,
      words: allWords,
    };
  }

  /**
   * 清理OCR识别的文本
   */
  cleanOCRText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // 多个空格替换为单个
      .replace(/\n\s*\n/g, '\n\n') // 多个空行替换为双空行
      .trim();
  }

  /**
   * 根据MIME类型获取文件扩展名
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/webp': 'webp',
      'image/tiff': 'tiff',
    };

    return mimeMap[mimeType] || 'png';
  }

  /**
   * 销毁worker释放资源
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// 导出单例
export const ocrService = new OCRService();
