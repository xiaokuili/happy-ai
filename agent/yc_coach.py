from typing import  Any, List
from langchain.prompts import ChatPromptTemplate
from langchain_deepseek import ChatDeepSeek
from dotenv import load_dotenv

load_dotenv()


project = {
    "yc": {
        "project_purpose": "我想做YC教练的AI，用来帮助程序员构建产品在商业上获取成功",
        "user_personality": "创新型，infp, 敏感， 喜欢思考和研究",
        "current_event_logs": "",
    },
    "travel": {
        "project_purpose": "帮助国外旅客来中国旅游，提供旅游攻略服，并且收费",
        "user_personality": "创新型，infp, 敏感， 喜欢思考和研究， 但是不擅长计划，完美主义，经常删除已经有的作品",
        "current_event_logs": "",
    },
    "default": {
        "project_purpose": "",
        "user_personality": "创新型，infp, 敏感， 喜欢思考和研究",
        "current_event_logs": "",
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
        template = """你是一个纳瓦尔和 萨希尔·拉文吉亚， 你们写过纳瓦尔宝典和小而美， 有些人想和你们谈心解决问题， 请你基于他们提供的内容，帮助他们
        你唯一能提供的帮助是， 给出他们下一步做什么，并且在3个小时能够获取反馈

用户信息
最终目的: {project_purpose}
用户特点: {user_personality}
当前诉求: {current_event_logs}

在提供建议时，请遵循以下原则：
1. 做真实的自己
2. 尽可能使用杠杆
3. 面向价值，而不是职位，机会
4. 不应先学习，再开始，应先开始，再学习
5. 极简主义创业者关注如何「尽一切力量盈利」，而不是「不计一切成本扩张」。
6. 生意，是你为所关心的人群解决问题的方式，你也会因此赚钱
7. 先成为一个创作者，再成为一个创业者。
8. 通过赚钱，来赚取时间

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
    project_purpose = ""
    user_personality = ""
    current_event_logs = "我现在有很多事情， 比如工作占据8小时， 还需要加班， 然后在开发一个travel to chain的网站， 我希望能够未来脱离工作， 有自己的产品赚钱， 我先在有点沮丧，因为我很在乎工作的评价，你有什么建议给我吗"
 
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
