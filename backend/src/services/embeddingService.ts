import OpenAI from 'openai';
import { query, queryOne } from '../utils/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * 向量嵌入服务
 * 使用OpenAI Embeddings API生成文本向量
 */
export class EmbeddingService {
  private openai: OpenAI | null = null;
  private model: string = 'text-embedding-ada-002';

  constructor() {
    this.initialize();
  }

  private initialize() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      console.log('OpenAI Embedding Service initialized');
    } else {
      console.warn('OPENAI_API_KEY not found, embedding service will be disabled');
    }
  }

  /**
   * 生成单个文本的向量嵌入
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI API未配置，请设置OPENAI_API_KEY环境变量');
    }

    try {
      // OpenAI限制：每次请求最多8191个token
      const truncatedText = text.slice(0, 8191);

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: truncatedText,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      throw new Error(`生成向量嵌入失败: ${error.message}`);
    }
  }

  /**
   * 批量生成向量嵌入
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.openai) {
      throw new Error('OpenAI API未配置');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts.map(t => t.slice(0, 8191)),
      });

      return response.data.map(item => item.embedding);
    } catch (error: any) {
      throw new Error(`批量生成向量嵌入失败: ${error.message}`);
    }
  }

  /**
   * 将文本分割成块
   */
  chunkText(text: string, maxChunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[。！？.!?]/);
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      if ((currentChunk + trimmed).length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmed;
      } else {
        currentChunk += trimmed + '。';
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * 索引文档（生成向量并存储到数据库）
   */
  async indexDocument(documentId: string, content: string): Promise<void> {
    if (!content) {
      console.log(`Document ${documentId} has no content, skipping indexing`);
      return;
    }

    try {
      // 删除旧的嵌入
      await query('DELETE FROM knowledge_base_embeddings WHERE document_id = ?', [documentId]);

      // 分块
      const chunks = this.chunkText(content);

      if (chunks.length === 0) {
        console.log(`No chunks generated for document ${documentId}`);
        return;
      }

      console.log(`Indexing document ${documentId} with ${chunks.length} chunks`);

      // 批量生成向量
      const embeddings = await this.generateBatchEmbeddings(chunks);

      // 存储到数据库
      for (let i = 0; i < chunks.length; i++) {
        const id = uuidv4();
        await query(
          `INSERT INTO knowledge_base_embeddings (id, document_id, chunk_index, chunk_text, embedding, model_name)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, documentId, i, chunks[i], JSON.stringify(embeddings[i]), this.model]
        );
      }

      console.log(`Successfully indexed document ${documentId}`);
    } catch (error: any) {
      console.error(`Failed to index document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * 删除文档的向量索引
   */
  async deleteDocumentIndex(documentId: string): Promise<void> {
    await query('DELETE FROM knowledge_base_embeddings WHERE document_id = ?', [documentId]);
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('向量维度不匹配');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * 获取文档的所有向量
   */
  async getDocumentEmbeddings(documentId: string): Promise<Array<{
    id: string;
    chunk_index: number;
    chunk_text: string;
    embedding: number[];
  }>> {
    const result = await query<any>(
      'SELECT * FROM knowledge_base_embeddings WHERE document_id = ? ORDER BY chunk_index',
      [documentId]
    );

    return result.map((row: any) => ({
      id: row.id,
      chunk_index: row.chunk_index,
      chunk_text: row.chunk_text,
      embedding: JSON.parse(row.embedding),
    }));
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }
}

// 导出单例
export const embeddingService = new EmbeddingService();
