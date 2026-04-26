import { query, queryOne } from '../utils/db';
import { embeddingService } from './embeddingService';

export interface SearchResult {
  documentId: string;
  documentTitle?: string;
  knowledgeBaseId?: string;
  chunkIndex: number;
  chunkText: string;
  similarity: number;
  metadata?: {
    source_type?: string;
    source_url?: string;
    created_at?: string;
  };
}

export interface SemanticSearchOptions {
  knowledgeBaseIds?: string[];
  limit?: number;
  minSimilarity?: number;
}

/**
 * 知识库语义搜索服务
 * 使用向量嵌入实现智能语义搜索
 */
export class KnowledgeSearchService {
  /**
   * 语义搜索
   */
  async semanticSearch(queryText: string, options: SemanticSearchOptions = {}): Promise<SearchResult[]> {
    const {
      knowledgeBaseIds,
      limit = 10,
      minSimilarity = 0.7,
    } = options;

    // 检查嵌入服务是否可用
    if (!embeddingService.isAvailable()) {
      throw new Error('向量嵌入服务不可用，请配置OPENAI_API_KEY');
    }

    try {
      // 1. 生成查询向量
      const queryEmbedding = await embeddingService.generateEmbedding(queryText);

      // 2. 构建SQL查询
      let sql = `
        SELECT
          e.id,
          e.document_id,
          e.chunk_index,
          e.chunk_text,
          e.embedding,
          d.title as document_title,
          d.knowledge_base_id,
          d.source_type,
          d.source_url,
          d.created_at
        FROM knowledge_base_embeddings e
        INNER JOIN knowledge_base_documents d ON e.document_id = d.id
        WHERE d.status = 'active'
      `;

      const params: any[] = [];

      if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
        const placeholders = knowledgeBaseIds.map(() => '?').join(',');
        sql += ` AND d.knowledge_base_id IN (${placeholders})`;
        params.push(...knowledgeBaseIds);
      }

      // 3. 获取所有候选向量
      const embeddings = await query<any>(sql, params);

      // 4. 计算相似度并排序
      const results: SearchResult[] = [];

      for (const emb of embeddings) {
        const embedding = JSON.parse(emb.embedding);
        const similarity = embeddingService.cosineSimilarity(queryEmbedding, embedding);

        if (similarity >= minSimilarity) {
          results.push({
            documentId: emb.document_id,
            documentTitle: emb.document_title,
            knowledgeBaseId: emb.knowledge_base_id,
            chunkIndex: emb.chunk_index,
            chunkText: emb.chunk_text,
            similarity,
            metadata: {
              source_type: emb.source_type,
              source_url: emb.source_url,
              created_at: emb.created_at,
            },
          });
        }
      }

      // 5. 按相似度排序并返回前N个结果
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, limit);
    } catch (error: any) {
      throw new Error(`语义搜索失败: ${error.message}`);
    }
  }

  /**
   * 在指定知识库中搜索
   */
  async searchInKnowledgeBase(
    knowledgeBaseId: string,
    queryText: string,
    options: Omit<SemanticSearchOptions, 'knowledgeBaseIds'> = {}
  ): Promise<SearchResult[]> {
    return this.semanticSearch(queryText, {
      ...options,
      knowledgeBaseIds: [knowledgeBaseId],
    });
  }

  /**
   * 关键词搜索（传统全文搜索）
   */
  async keywordSearch(queryText: string, options: {
    knowledgeBaseIds?: string[];
    limit?: number;
  } = {}): Promise<SearchResult[]> {
    const { knowledgeBaseIds, limit = 10 } = options;

    try {
      let sql = `
        SELECT
          d.id as document_id,
          d.title as document_title,
          d.knowledge_base_id,
          d.source_type,
          d.source_url,
          d.created_at,
          d.content,
          0 as chunk_index,
          SUBSTRING(d.content, 1, 500) as chunk_text
        FROM knowledge_base_documents d
        WHERE d.status = 'active'
          AND (d.title LIKE ? OR d.content LIKE ?)
      `;

      const params: any[] = [`%${queryText}%`, `%${queryText}%`];

      if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
        const placeholders = knowledgeBaseIds.map(() => '?').join(',');
        sql += ` AND d.knowledge_base_id IN (${placeholders})`;
        params.push(...knowledgeBaseIds);
      }

      sql += ` ORDER BY d.created_at DESC LIMIT ?`;
      params.push(limit);

      const results = await query<any>(sql, params);

      return results.map((row: any) => ({
        documentId: row.document_id,
        documentTitle: row.document_title,
        knowledgeBaseId: row.knowledge_base_id,
        chunkIndex: 0,
        chunkText: row.chunk_text || row.content?.substring(0, 500) || '',
        similarity: 1.0, // 关键词搜索不计算相似度
        metadata: {
          source_type: row.source_type,
          source_url: row.source_url,
          created_at: row.created_at,
        },
      }));
    } catch (error: any) {
      throw new Error(`关键词搜索失败: ${error.message}`);
    }
  }

  /**
   * 混合搜索（语义+关键词）
   */
  async hybridSearch(queryText: string, options: SemanticSearchOptions = {}): Promise<{
    semanticResults: SearchResult[];
    keywordResults: SearchResult[];
    combinedResults: SearchResult[];
  }> {
    try {
      // 并行执行两种搜索
      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch(queryText, options).catch(err => {
          console.error('语义搜索失败:', err);
          return [];
        }),
        this.keywordSearch(queryText, options).catch(err => {
          console.error('关键词搜索失败:', err);
          return [];
        }),
      ]);

      // 合并结果（去重）
      const combinedMap = new Map<string, SearchResult>();

      // 先添加语义搜索结果
      for (const result of semanticResults) {
        const key = `${result.documentId}-${result.chunkIndex}`;
        combinedMap.set(key, result);
      }

      // 添加关键词搜索结果（如果不存在）
      for (const result of keywordResults) {
        const key = `${result.documentId}-${result.chunkIndex}`;
        if (!combinedMap.has(key)) {
          combinedMap.set(key, result);
        }
      }

      // 按相似度排序
      const combinedResults = Array.from(combinedMap.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, options.limit || 10);

      return {
        semanticResults,
        keywordResults,
        combinedResults,
      };
    } catch (error: any) {
      throw new Error(`混合搜索失败: ${error.message}`);
    }
  }

  /**
   * 获取相关文档（基于文档ID推荐相似文档）
   */
  async findSimilarDocuments(documentId: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      // 获取目标文档的向量
      const embeddings = await embeddingService.getDocumentEmbeddings(documentId);

      if (embeddings.length === 0) {
        return [];
      }

      // 计算平均向量
      const avgEmbedding = this.averageEmbeddings(embeddings.map(e => e.embedding));

      // 搜索相似文档
      const similarResults = await query<any>(
        `
        SELECT
          e.id,
          e.document_id,
          e.chunk_index,
          e.chunk_text,
          e.embedding,
          d.title as document_title,
          d.knowledge_base_id,
          d.source_type,
          d.source_url,
          d.created_at
        FROM knowledge_base_embeddings e
        INNER JOIN knowledge_base_documents d ON e.document_id = d.id
        WHERE e.document_id != ?
          AND d.status = 'active'
        LIMIT 100
        `,
        [documentId]
      );

      // 计算相似度
      const results: SearchResult[] = [];

      for (const emb of similarResults) {
        const embedding = JSON.parse(emb.embedding);
        const similarity = embeddingService.cosineSimilarity(avgEmbedding, embedding);

        results.push({
          documentId: emb.document_id,
          documentTitle: emb.document_title,
          knowledgeBaseId: emb.knowledge_base_id,
          chunkIndex: emb.chunk_index,
          chunkText: emb.chunk_text,
          similarity,
          metadata: {
            source_type: emb.source_type,
            source_url: emb.source_url,
            created_at: emb.created_at,
          },
        });
      }

      // 按文档分组并取最高相似度
      const docMaxSimilarity = new Map<string, SearchResult>();

      for (const result of results) {
        const existing = docMaxSimilarity.get(result.documentId);
        if (!existing || result.similarity > existing.similarity) {
          docMaxSimilarity.set(result.documentId, result);
        }
      }

      // 排序并返回
      return Array.from(docMaxSimilarity.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error: any) {
      throw new Error(`查找相似文档失败: ${error.message}`);
    }
  }

  /**
   * 计算向量平均值
   */
  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      return [];
    }

    const dimension = embeddings[0].length;
    const avg = new Array(dimension).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dimension; i++) {
        avg[i] += emb[i];
      }
    }

    for (let i = 0; i < dimension; i++) {
      avg[i] /= embeddings.length;
    }

    return avg;
  }

  /**
   * 检查搜索服务是否可用
   */
  isAvailable(): boolean {
    return embeddingService.isAvailable();
  }
}

// 导出单例
export const knowledgeSearchService = new KnowledgeSearchService();
