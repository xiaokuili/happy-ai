import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";

interface Action {
  title: string;           // 行动标题
  description: string;     // 行动描述
  startTime: Date;         // 开始时间
  endTime: Date;          // 结束时间
  priority: 'low' | 'medium' | 'high'; // 优先级
  category: 'development' | 'marketing' | 'learning' | 'other'; // 行动类别
  estimatedEffort: number; // 预计投入时间(小时)
  status: 'planned' | 'in-progress' | 'completed'; // 状态
}

interface AgentConfig {
  modelName: string;      // 模型名称
  temperature: number;    // 温度参数
  maxTokens: number;      // 最大token数
}

export class ActionAgent {
  private chain: LLMChain;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    const model = new ChatOpenAI({
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });

    const prompt = PromptTemplate.fromTemplate(`
      你是一个高效的行动规划助手。基于以下上下文，生成一个具体的行动建议。
      
      上下文:
      {context}
      
      请生成一个具体的行动，包含以下信息:
      - 行动标题
      - 行动描述
      - 建议的开始和结束时间
      - 优先级
      - 类别
      - 预计投入时间
      
      请用JSON格式返回，格式如下:
      {{
        "title": "行动标题",
        "description": "行动描述",
        "startTime": "ISO时间字符串",
        "endTime": "ISO时间字符串",
        "priority": "low/medium/high",
        "category": "development/marketing/learning/other",
        "estimatedEffort": 数字,
        "status": "planned"
      }}
    `);

    this.chain = new LLMChain({
      llm: model,
      prompt: prompt,
    });
  }

  async generateAction(context: string): Promise<Action> {
    const response = await this.chain.call({ context });
    return JSON.parse(response.text);
  }
}
