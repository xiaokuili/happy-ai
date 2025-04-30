from typing import Dict, Any
from langchain.prompts import ChatPromptTemplate
from langchain_deepseek import ChatDeepSeek
from dotenv import load_dotenv

load_dotenv()
        
class TranslationAgent:
    def __init__(self):
        # Initialize any necessary components for translation
        pass
    def translate(self, text: str, source_lang: str = "auto", target_lang: str = "en") -> str:
        """
        Translate text from source language to target language using LangChain
        
        Args:
            text (str): The text to translate
            source_lang (str): Source language code (default: "auto" for auto-detection)
            target_lang (str): Target language code (default: "en" for English)
            
        Returns:
            str: Translated text
        """
     
        # Initialize the LLM
        llm = ChatDeepSeek(temperature=0,api_base="https://api.siliconflow.cn/v1", model="deepseek-ai/DeepSeek-V3")
        
        # Create the translation prompt
        template = """你是一个旅游游记翻译专家，在翻译过程中注意
        1. 只需要输出翻译结果，不需要其他内容
        2. 翻译质量要高，要符合游记风格
        翻译游记从 {source_lang} 到 {target_lang}:
        
        游记内容: {text}
        
        翻译结果
        
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        
        # Create the chain
        chain = prompt | llm
        
        # Execute the translation
        result = chain.invoke({
            "source_lang": source_lang,
            "target_lang": target_lang,
            "text": text
        })
        
        return result.content

def create_translation_agent() -> TranslationAgent:
    """
    Factory function to create a translation agent
    
    Returns:
        TranslationAgent: A new instance of TranslationAgent
    """
    return TranslationAgent()
