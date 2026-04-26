import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../utils/db';
import { aiService } from './aiService';

/**
 * E-E-A-T评分接口
 * Experience - 经验
 * Expertise - 专业性
 * Authoritativeness - 权威性
 * Trustworthiness - 可信度
 */
export interface EEATScore {
  experience: {
    score: number; // 0-100
    details: {
      first_hand_experience: number; // 第一手经验
      practical_examples: number; // 实例展示
      personal_insights: number; // 个人见解
      evidence_sharing: number; // 证据分享
    };
    feedback: string[];
    strengths: string[];
    improvements: string[];
  };
  expertise: {
    score: number; // 0-100
    details: {
      technical_accuracy: number; // 技术准确性
      depth_of_knowledge: number; // 知识深度
      domain_relevance: number; // 领域相关性
      qualifications_shown: number; // 资历展示
    };
    feedback: string[];
    strengths: string[];
    improvements: string[];
  };
  authoritativeness: {
    score: number; // 0-100
    details: {
      citations: number; // 引用数量
      source_quality: number; // 来源质量
      credentials: number; // 作者资质
      recognition: number; // 行业认可
    };
    feedback: string[];
    strengths: string[];
    improvements: string[];
  };
  trustworthiness: {
    score: number; // 0-100
    details: {
      transparency: number; // 透明度
      accuracy: number; // 准确性
      updates: number; // 更新频率
      security: number; // 安全性
    };
    feedback: string[];
    strengths: string[];
    improvements: string[];
  };
}

/**
 * 主体内容质量评分
 */
export interface MainContentScore {
  purpose_achievement: {
    score: number;
    analysis: string;
  };
  content_quality: {
    score: number;
    details: {
      readability: number;
      structure: number;
      completeness: number;
      originality: number;
    };
  };
  seo_optimization: {
    score: number;
    details: {
      keyword_usage: number;
      meta_quality: number;
      heading_structure: number;
      internal_linking: number;
    };
  };
  user_engagement: {
    score: number;
    analysis: string;
  };
}

/**
 * 内容评分结果
 */
export interface ContentScoreResult {
  id: string;
  content_id: string;
  overall_score: number; // 0-100
  is_ymyl: boolean; // 是否为YMYL内容（你的钱，你的生活）
  eeat_score: EEATScore;
  main_content_score: MainContentScore;
  summary: {
    overall_assessment: string;
    key_strengths: string[];
    critical_improvements: string[];
    recommendations: string[];
  };
  created_at: string;
}

/**
 * 内容评分服务
 * 使用AI分析内容质量并给出E-E-A-T评分
 */
export class ContentScoringService {
  /**
   * 分析内容并生成评分
   */
  async analyzeContent(contentId: string): Promise<ContentScoreResult> {
    // 获取内容信息
    const content = await this.getContentById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }

    // 使用AI分析内容
    const analysis = await this.performAIAnalysis(content);

    // 保存评分结果到数据库
    await this.saveScore(contentId, analysis);

    return analysis;
  }

  /**
   * 获取内容信息
   */
  private async getContentById(contentId: string): Promise<any> {
    const result = await queryOne<any>(
      `SELECT c.*, t.title as topic_title, t.topic_type, t.target_customer
       FROM contents c
       LEFT JOIN topics t ON c.topic_id = t.id
       WHERE c.id = ?`,
      [contentId]
    );
    return result;
  }

  /**
   * 使用AI执行内容分析
   */
  private async performAIAnalysis(content: any): Promise<ContentScoreResult> {
    const contentText = this.extractContentText(content);

    const prompt = this.buildAnalysisPrompt(content, contentText);

    try {
      // 使用 aiService 的 generate 方法
      const response = await aiService.generate({
        prompt,
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 4000,
      });

      // 解析AI响应
      const analysis = this.parseAnalysisResponse(response.content, content.id);

      return analysis;
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw new Error('Failed to analyze content with AI');
    }
  }

  /**
   * 提取内容文本
   */
  private extractContentText(content: any): string {
    // 合并英文和中文内容
    const enContent = content.content_en || '';
    const zhContent = content.content_zh || '';

    // 使用中文内容为主，英文为辅
    return zhContent || enContent;
  }

  /**
   * 构建分析提示词
   */
  private buildAnalysisPrompt(content: any, contentText: string): string {
    const topicInfo = content.topic_title
      ? `话题: ${content.topic_title}\n话题类型: ${content.topic_type}\n目标客户: ${content.target_customer}\n`
      : '';

    const platformInfo = content.platform ? `发布平台: ${content.platform}\n` : '';

    return `你是一位专业的内容质量评估专家，精通E-E-A-T（经验、专业性、权威性、可信度）评估体系和SEO最佳实践。

请仔细分析以下内容，并给出详细的评分和建议。

【内容信息】
${platformInfo}${topicInfo}
标题: ${content.title || '无标题'}
内容长度: ${contentText.length} 字符

【内容正文】
${contentText.substring(0, 12000)}${contentText.length > 12000 ? '...' : ''}

【评估要求】
请严格按照以下JSON格式输出评分结果，不要添加任何其他文字说明：

\`\`\`json
{
  "overall_score": 85,
  "is_ymyl": false,
  "eeat_score": {
    "experience": {
      "score": 80,
      "details": {
        "first_hand_experience": 75,
        "practical_examples": 85,
        "personal_insights": 70,
        "evidence_sharing": 90
      },
      "feedback": ["反馈1", "反馈2"],
      "strengths": ["优点1", "优点2"],
      "improvements": ["改进建议1", "改进建议2"]
    },
    "expertise": {
      "score": 85,
      "details": {
        "technical_accuracy": 90,
        "depth_of_knowledge": 80,
        "domain_relevance": 85,
        "qualifications_shown": 85
      },
      "feedback": [],
      "strengths": [],
      "improvements": []
    },
    "authoritativeness": {
      "score": 75,
      "details": {
        "citations": 70,
        "source_quality": 80,
        "credentials": 75,
        "recognition": 75
      },
      "feedback": [],
      "strengths": [],
      "improvements": []
    },
    "trustworthiness": {
      "score": 90,
      "details": {
        "transparency": 95,
        "accuracy": 90,
        "updates": 85,
        "security": 90
      },
      "feedback": [],
      "strengths": [],
      "improvements": []
    }
  },
  "main_content_score": {
    "purpose_achievement": {
      "score": 85,
      "analysis": "内容很好地实现了预期目标..."
    },
    "content_quality": {
      "score": 80,
      "details": {
        "readability": 85,
        "structure": 80,
        "completeness": 75,
        "originality": 80
      }
    },
    "seo_optimization": {
      "score": 75,
      "details": {
        "keyword_usage": 70,
        "meta_quality": 80,
        "heading_structure": 75,
        "internal_linking": 75
      }
    },
    "user_engagement": {
      "score": 80,
      "analysis": "内容具有良好的用户参与潜力..."
    }
  },
  "summary": {
    "overall_assessment": "整体评估...",
    "key_strengths": ["主要优点1", "主要优点2"],
    "critical_improvements": ["关键改进1", "关键改进2"],
    "recommendations": ["建议1", "建议2"]
  }
}
\`\`\`

【评分标准参考】

**YMYL判断标准**：
YMYL（Your Money Your Life）内容涉及健康、财务、安全、法律等影响用户生活质量的话题，需要更高的E-E-A-T标准。

**E-E-A-T评分标准**：
1. Experience (经验): 0-100
   - 是否展示第一手实践经验
   - 是否提供实际案例和示例
   - 是否分享个人见解和经验
   - 是否提供证据支撑

2. Expertise (专业性): 0-100
   - 技术信息是否准确
   - 知识深度是否足够
   - 是否与领域高度相关
   - 是否展示作者资历

3. Authoritativeness (权威性): 0-100
   - 是否引用权威来源
   - 来源质量如何
   - 作者资质是否明确
   - 是否有行业认可

4. Trustworthiness (可信度): 0-100
   - 信息是否透明
   - 内容是否准确
   - 是否定期更新
   - 安全性如何

**主体内容质量评分标准**：
- 目标达成度: 内容是否实现预期目标
- 内容质量: 可读性、结构、完整性、原创性
- SEO优化: 关键词使用、元标签、标题结构、内链
- 用户参与: 用户参与潜力

**综合评分计算**：
- overall_score = (E + E + A + T) / 4 × 0.6 + 主内容分 × 0.4

请开始评估并输出JSON格式结果。`;
  }

  /**
   * 解析AI响应
   */
  private parseAnalysisResponse(analysisText: string, contentId: string): ContentScoreResult {
    try {
      // 尝试提取JSON
      let jsonText = analysisText;

      // 查找JSON代码块
      const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText.trim());

      return {
        id: uuidv4(),
        content_id: contentId,
        overall_score: parsed.overall_score || 75,
        is_ymyl: parsed.is_ymyl || false,
        eeat_score: parsed.eeat_score || this.getDefaultEEATScore(),
        main_content_score: parsed.main_content_score || this.getDefaultMainContentScore(),
        summary: parsed.summary || {
          overall_assessment: '内容质量良好',
          key_strengths: [],
          critical_improvements: [],
          recommendations: [],
        },
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // 返回默认评分
      return {
        id: uuidv4(),
        content_id: contentId,
        overall_score: 70,
        is_ymyl: false,
        eeat_score: this.getDefaultEEATScore(),
        main_content_score: this.getDefaultMainContentScore(),
        summary: {
          overall_assessment: 'AI解析失败，使用默认评分',
          key_strengths: [],
          critical_improvements: ['请重新尝试分析'],
          recommendations: [],
        },
        created_at: new Date().toISOString(),
      };
    }
  }

  /**
   * 获取默认E-E-A-T评分
   */
  private getDefaultEEATScore(): EEATScore {
    return {
      experience: {
        score: 70,
        details: {
          first_hand_experience: 70,
          practical_examples: 70,
          personal_insights: 70,
          evidence_sharing: 70,
        },
        feedback: [],
        strengths: [],
        improvements: [],
      },
      expertise: {
        score: 70,
        details: {
          technical_accuracy: 70,
          depth_of_knowledge: 70,
          domain_relevance: 70,
          qualifications_shown: 70,
        },
        feedback: [],
        strengths: [],
        improvements: [],
      },
      authoritativeness: {
        score: 70,
        details: {
          citations: 70,
          source_quality: 70,
          credentials: 70,
          recognition: 70,
        },
        feedback: [],
        strengths: [],
        improvements: [],
      },
      trustworthiness: {
        score: 70,
        details: {
          transparency: 70,
          accuracy: 70,
          updates: 70,
          security: 70,
        },
        feedback: [],
        strengths: [],
        improvements: [],
      },
    };
  }

  /**
   * 获取默认主体内容评分
   */
  private getDefaultMainContentScore(): MainContentScore {
    return {
      purpose_achievement: {
        score: 70,
        analysis: '内容基本达到预期目标',
      },
      content_quality: {
        score: 70,
        details: {
          readability: 70,
          structure: 70,
          completeness: 70,
          originality: 70,
        },
      },
      seo_optimization: {
        score: 70,
        details: {
          keyword_usage: 70,
          meta_quality: 70,
          heading_structure: 70,
          internal_linking: 70,
        },
      },
      user_engagement: {
        score: 70,
        analysis: '具有一定的用户参与潜力',
      },
    };
  }

  /**
   * 保存评分到数据库
   */
  private async saveScore(contentId: string, analysis: ContentScoreResult): Promise<void> {
    await query(
      `INSERT INTO content_scores (id, content_id, overall_score, is_ymyl, eeat_score, main_content_score, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       overall_score = VALUES(overall_score),
       is_ymyl = VALUES(is_ymyl),
       eeat_score = VALUES(eeat_score),
       main_content_score = VALUES(main_content_score),
       updated_at = NOW()`,
      [
        analysis.id,
        contentId,
        analysis.overall_score,
        analysis.is_ymyl,
        JSON.stringify(analysis.eeat_score),
        JSON.stringify(analysis.main_content_score),
      ]
    );
  }

  /**
   * 获取内容评分
   */
  async getScoreByContentId(contentId: string): Promise<ContentScoreResult | null> {
    const result = await queryOne<any>(
      'SELECT * FROM content_scores WHERE content_id = ? ORDER BY created_at DESC LIMIT 1',
      [contentId]
    );

    if (!result) return null;

    return {
      id: result.id,
      content_id: result.content_id,
      overall_score: result.overall_score,
      is_ymyl: result.is_ymyl,
      eeat_score: JSON.parse(result.eeat_score || '{}'),
      main_content_score: JSON.parse(result.main_content_score || '{}'),
      summary: this.generateSummary(
        result.overall_score,
        JSON.parse(result.eeat_score || '{}'),
        JSON.parse(result.main_content_score || '{}')
      ),
      created_at: result.created_at,
    };
  }

  /**
   * 生成总结
   */
  private generateSummary(
    overallScore: number,
    eeatScore: EEATScore,
    mainContentScore: MainContentScore
  ): ContentScoreResult['summary'] {
    const keyStrengths: string[] = [];
    const criticalImprovements: string[] = [];
    const recommendations: string[] = [];

    // 分析E-E-A-T各项得分
    if (eeatScore.experience.score >= 80) {
      keyStrengths.push(`经验丰富 (${eeatScore.experience.score}分)`);
    } else if (eeatScore.experience.score < 60) {
      criticalImprovements.push(`增加第一手经验分享 (当前${eeatScore.experience.score}分)`);
    }

    if (eeatScore.expertise.score >= 80) {
      keyStrengths.push(`专业性强 (${eeatScore.expertise.score}分)`);
    } else if (eeatScore.expertise.score < 60) {
      criticalImprovements.push(`提升专业深度 (当前${eeatScore.expertise.score}分)`);
    }

    if (eeatScore.authoritativeness.score >= 80) {
      keyStrengths.push(`权威性高 (${eeatScore.authoritativeness.score}分)`);
    } else if (eeatScore.authoritativeness.score < 60) {
      criticalImprovements.push(`增加权威引用 (当前${eeatScore.authoritativeness.score}分)`);
    }

    if (eeatScore.trustworthiness.score >= 80) {
      keyStrengths.push(`可信度高 (${eeatScore.trustworthiness.score}分)`);
    } else if (eeatScore.trustworthiness.score < 60) {
      criticalImprovements.push(`提高内容可信度 (当前${eeatScore.trustworthiness.score}分)`);
    }

    // 生成综合评估
    let overallAssessment = '';
    if (overallScore >= 90) {
      overallAssessment = '内容质量优秀，各维度表现出色，建议直接发布';
    } else if (overallScore >= 80) {
      overallAssessment = '内容质量良好，有少数可以改进的地方';
    } else if (overallScore >= 70) {
      overallAssessment = '内容质量中等，需要针对性优化';
    } else if (overallScore >= 60) {
      overallAssessment = '内容质量一般，建议进行重要改进';
    } else {
      overallAssessment = '内容质量较差，需要大幅改进';
    }

    // 生成改进建议
    if (mainContentScore.seo_optimization.score < 75) {
      recommendations.push('优化SEO关键词使用和元标签');
    }
    if (mainContentScore.content_quality.details.readability < 75) {
      recommendations.push('改善内容可读性，简化复杂表达');
    }
    if (eeatScore.authoritativeness.details.citations < 70) {
      recommendations.push('增加权威来源引用和数据支撑');
    }

    return {
      overall_assessment: overallAssessment,
      key_strengths: keyStrengths,
      critical_improvements: criticalImprovements,
      recommendations,
    };
  }

  /**
   * 批量分析内容
   */
  async batchAnalyze(contentIds: string[]): Promise<ContentScoreResult[]> {
    const results: ContentScoreResult[] = [];

    for (const contentId of contentIds) {
      try {
        const result = await this.analyzeContent(contentId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to analyze content ${contentId}:`, error);
      }
    }

    return results;
  }
}

// 导出单例
export const contentScoringService = new ContentScoringService();
