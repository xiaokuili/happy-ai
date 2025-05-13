from typing import  Any, List
from langchain.prompts import ChatPromptTemplate
from langchain_deepseek import ChatDeepSeek
from dotenv import load_dotenv

load_dotenv()


project = {
    "yc": {
        "project_purpose": "我想做YC教练的AI，用来帮助程序员构建产品在商业上获取成功",
        "user_personality": "创新型，infp, 敏感， 喜欢思考和研究",
        "user_preferences": "程序员，UI经验不足， 创业经验不足， 最好能够激励我",
        "current_event_logs": "",
        "project_stage": "我希望可以很方便的频繁使用agent，为我在工作中赋能",
        "current_focus": []
    },
    "travel": {
        "project_purpose": "帮助国外旅客来中国旅游，提供旅游攻略服，并且收费",
        "user_personality": "创新型，infp, 敏感， 喜欢思考和研究， 但是不擅长计划，完美主义，经常删除已经有的作品",
        "user_preferences": "程序员，nextjs， python 和golang都能写",
        "current_event_logs": "",
        "project_stage": "",
        "current_focus": []
    },
    "default": {
        "project_purpose": "",
        "user_personality": "创新型，infp, 敏感， 喜欢思考和研究",
        "user_preferences": "程序员，UI经验不足， 创业经验不足， 最好能够激励我",
        "current_event_logs": "",
        "project_stage": "",
    }
}

def get_project(project_name: str) -> dict:
    return project.get(project_name, None)

class YCCoach:
    def __init__(self):
        self.llm = ChatDeepSeek(
            temperature=0.3,
            api_base="https://api.siliconflow.cn/v1", 
            model="deepseek-ai/DeepSeek-V3"
        )
    
    def suggest_next_steps(self, 
                          project_purpose: str, 
                          user_personality: str, 
                          current_event_logs: str
                          ) -> str:
        """
        你是一个专业的YC教练，你已经指导过数百个成功的创业项目，你已经知道如何帮助用户找到最适合他们的下一步行动。
        
        Args:
            project_purpose (str): 终点，一般不发生改变
            user_personality (str): 用户的性格特点， 可能随着项目发生改变
            current_event_logs (str): 目前所在位置， 发生改变
            
        Returns:
            str: 推荐的下一步行动计划
        """
        
        # 创建提示模板
        template = """你是一位YC教练，你已经指导过数百个成功的创业项目，你已经知道如何帮助用户找到最适合他们的下一步行动。

请基于以下信息，为用户提供下一步行动建议：

最终目的: {project_purpose}
用户特点: {user_personality}
当前位置: {current_event_logs}

在提供建议时，请遵循以下原则：
1. 请你带入马斯克的第一性原理和五步法深入思考， 发觉用户最核心的素材
2. 如无必要，勿增实例
3. 建议只有一个原则，后续的产出结果用户会自发开心并且长期的使用
4. 建议执行所需要的时间，最好不要超过3小时， 但是也可以是更加完成的建议由客户自己拆解


请直接给出具体的下一步行动建议，不要有多余的解释。建议应该简洁明了，富有激励性。
"""
        
        prompt = ChatPromptTemplate.from_template(template)
        
        # 创建链
        chain = prompt | self.llm
        
        # 执行推理
        result = chain.invoke({
            "project_purpose": project_purpose,
            "user_personality": user_personality,
            "current_event_logs": current_event_logs,
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
    current_event_logs = "1. 实现了agent接口 2. 基于谷歌插件，在日历中添加了一个项目的下拉 "
 
    # 获取下一步行动建议
    next_action = agent.suggest_next_steps(
        project_purpose=project_purpose,
        user_personality=user_personality,
        current_event_logs=current_event_logs,
    
    )
    
    print("AI建议的下一步行动:")
    print(next_action)
    
    return next_action




# 如果直接运行此文件，执行示例测试
if __name__ == "__main__":
    test_yc_next_step()
