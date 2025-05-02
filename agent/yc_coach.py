from typing import  Any, List
from langchain.prompts import ChatPromptTemplate
from langchain_deepseek import ChatDeepSeek
from dotenv import load_dotenv

load_dotenv()


class YCCoach:
    def __init__(self):
        self.llm = ChatDeepSeek(
            temperature=0.3,
            api_base="https://api.siliconflow.cn/v1", 
            model="deepseek-ai/DeepSeek-V3"
        )
    
    def analyze_project_stage(self, project_purpose: str, project_info: str) -> dict:
        """
        基于项目管理经典模型，分析项目所处阶段和关键指标
        
        Args:
            project_purpose (str): 项目的目的和意义
            project_info (str): 项目的当前信息和状态
            
        Returns:
            dict: 包含项目阶段和关键指标的字典
        """
        
        template = """你是一位经验丰富的 YC 合伙人，曾指导过数百个成功的创业项目。你深入理解 YC 的理念，特别是 Paul Graham 和 Sam Altman 提倡的创业原则。

请基于以下项目信息，进行 YC 风格的分析：

项目概要：
- 目的：{project_purpose}
- 详情：{project_info}

请从以下维度进行分析：
1. 产品/市场契合度（Product Market Fit）评估
2. 增长指标（周环比增长率、用户获取成本等）
3. 核心问题（按 YC 标准，最需要解决的问题是什么）
4. 下一个关键里程碑

输出格式（JSON）：
{{
    "stage": {{
        "current_stage": "阶段名称（如 Pre-PMF、Finding PMF、Scale）",
        "confidence": "确信度 1-10"
    }},
    "key_metrics": {{
        "growth_rate": "周环比增长率",
        "core_metric": "最重要的指标及其当前值",
        "burn_rate": "每月消耗资金"
    }},
    "priorities": [
        "优先事项1",
        "优先事项2",
        "优先事项3"
    ],
    "yc_advice": "基于 YC 经验的关键建议"
}}

请确保建议符合 YC 的核心理念：Make something people want、Do things that don't scale（在早期）、Talk to users。
"""
        prompt = ChatPromptTemplate.from_template(template)
        
        chain = prompt | self.llm
        
        result = chain.invoke({
            "project_purpose": project_purpose,
            "project_info": project_info
        })
        
        # 提取JSON结果
        try:
            import json
            import re
            
            # 尝试从回复中提取JSON部分
            json_match = re.search(r'({[\s\S]*})', result.content)
            if json_match:
                json_str = json_match.group(1)
                return json.loads(json_str)
            else:
                # 如果无法提取JSON，返回原始内容
                return {"error": "无法解析结果", "raw_content": result.content}
        except Exception as e:
            return {"error": str(e), "raw_content": result.content}

    def suggest_next_steps(self, 
                          project_purpose: str, 
                          user_personality: str, 
                          user_preferences: str, 
                          current_event_logs: str,
                          project_stage: str,
                          current_focus: List) -> str:
        """
        你是一个专业的YC教练，你已经指导过数百个成功的创业项目，你已经知道如何帮助用户找到最适合他们的下一步行动。
        
        Args:
            project_purpose (str): 项目的目的和意义
            user_personality (str): 用户的性格特点
            user_preferences (str): 用户的喜好和兴趣
            current_event_logs (str): 用户当前的行动日志
            project_stage (str): 项目所处的阶段
            current_focus (str): 用户当前的行动焦点
            
        Returns:
            str: 推荐的下一步行动计划
        """
        
        # 创建提示模板
        template = """你是一位YC教练，你已经指导过数百个成功的创业项目，你已经知道如何帮助用户找到最适合他们的下一步行动。

请基于以下信息，为用户提供下一步行动建议：

项目目的: {project_purpose}
用户性格: {user_personality}
用户喜好: {user_preferences}
当前情况: {current_event_logs}
项目阶段: {project_stage}
当前行动焦点: {current_focus}

在提供建议时，请遵循以下原则：
1. 建议只有一个原则，后续的产出结果用户会自发开心并且长期的使用
2. 建议执行所需要的时间，最好不要超过3小时

请直接给出具体的下一步行动建议，不要有多余的解释。建议应该简洁明了，富有激励性。
"""
        
        prompt = ChatPromptTemplate.from_template(template)
        
        # 创建链
        chain = prompt | self.llm
        
        # 执行推理
        result = chain.invoke({
            "project_purpose": project_purpose,
            "user_personality": user_personality,
            "user_preferences": user_preferences,
            "current_event_logs": current_event_logs,
            "project_stage": project_stage,
            "current_focus": '\n'.join(current_focus)
        })
        
        return result.content


def test_yc_next_step():
    """
    我想做YC教练的AI，用来帮助程序员构建产品在商业上获取成功
    
    Returns:
        str: AI生成的下一步行动建议
    """
    # 创建FunAgent实例
    agent = YCCoach()
    
    # 模拟项目信息
    project_purpose = "我想做YC教练的AI，用来帮助程序员构建产品在商业上获取成功"
    user_personality = "创新型，infp, 敏感， 喜欢思考和研究"
    user_preferences = "程序员，UI经验不足， 创业经验不足， 最好能够激励我"
    current_event_logs = "1. 实现agent, 推荐下一步动作和定位当前yc阶段，2. 实现通过插件调用谷歌日历 3. 经常会通过谷歌日历管理日程4. 基于谷歌插件实现展示项目dashboard，展示项目，项目阶段目前做的事情 以及指标"
    project_stage = "目前agent和日历数据没有联动，需要手动输入工作"
    current_focus = [
        
    ]
    # 获取下一步行动建议
    next_action = agent.suggest_next_steps(
        project_purpose=project_purpose,
        user_personality=user_personality,
        user_preferences=user_preferences,
        current_event_logs=current_event_logs,
        project_stage=project_stage,
        current_focus=current_focus
    )
    
    print("AI建议的下一步行动:")
    print(next_action)
    
    return next_action


def test_yc_stage():
    analyzer = YCCoach()
    project_purpose = "开发一个基于AI的旅行攻略生成网页，帮助用户快速获取个性化旅行建议"
    project_info = "目前只有一个想法"
    result = analyzer.analyze_project_stage(project_purpose, project_info)
    print(result)

# 如果直接运行此文件，执行示例测试
if __name__ == "__main__":
    test_yc_next_step()
    test_yc_stage()
