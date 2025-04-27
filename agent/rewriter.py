from langchain.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from typing import Optional
from .text_splitter import TextSplitter
from tenacity import retry, stop_after_attempt, wait_exponential

class TravelBlogRewriter:
    def __init__(self, openai_api_key: Optional[str] = None, max_chunk_size: int = 2000):
        self.text_splitter = TextSplitter(max_chunk_size=max_chunk_size)
        self.llm = ChatOpenAI(
            temperature=0.7,
            model_name="gpt-3.5-turbo",
            openai_api_key=openai_api_key
        )
        
        self.prompt = PromptTemplate(
            input_variables=["chinese_text", "context"],
            template="""
            {context}
            Convert the following Chinese text into a first-person travel blog in English.
            Focus on:
            - Personal experiences and feelings
            - Interactions with locals and other travelers
            - Vivid descriptions of attractions and activities
            - Natural, engaging storytelling style
            - Maintaining narrative continuity with other parts
            
            Chinese text: {chinese_text}
            
            Write an engaging first-person travel blog in English based on this content:
            """
        )
        
        self.chain = LLMChain(llm=self.llm, prompt=self.prompt)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def _process_chunk(self, chunk: str, context: str) -> str:
        """Process a single chunk of text with retry mechanism"""
        try:
            return self.chain.run(chinese_text=chunk, context=context)
        except Exception as e:
            print(f"Error processing chunk: {str(e)}")
            raise
        
    def rewrite(self, chinese_text: str) -> str:
        """
        Rewrites Chinese text into an English first-person travel blog
        
        Args:
            chinese_text (str): Original Chinese text to rewrite
            
        Returns:
            str: English travel blog in first person narrative
        """
        try:
            # Split text into manageable chunks
            chunks = self.text_splitter.split_text(chinese_text)
            
            if not chunks:
                return "Error: No valid text to process"
            
            # If text is short enough, process it directly
            if len(chunks) == 1:
                return self._process_chunk(chunks[0], "").strip()
            
            # Process multiple chunks with context
            results = []
            for i, chunk in enumerate(chunks):
                context = self.text_splitter.get_chunk_context(i, len(chunks))
                result = self._process_chunk(chunk, context)
                results.append(result.strip())
            
            # Combine all chunks
            final_text = '\n\n'.join(results)
            
            # Optional: Add a final polish pass for better coherence
            if len(chunks) > 1:
                polish_prompt = PromptTemplate(
                    input_variables=["text"],
                    template="Polish this travel blog to ensure consistency and smooth transitions:\n\n{text}"
                )
                polish_chain = LLMChain(llm=self.llm, prompt=polish_prompt)
                final_text = polish_chain.run(text=final_text)
            
            return final_text.strip()
            
        except Exception as e:
            return f"Error during rewriting: {str(e)}"

def create_travel_blog_rewriter(openai_api_key: Optional[str] = None, max_chunk_size: int = 2000) -> TravelBlogRewriter:
    """
    Factory function to create a TravelBlogRewriter instance
    
    Args:
        openai_api_key (str, optional): OpenAI API key
        max_chunk_size (int): Maximum size of text chunks
        
    Returns:
        TravelBlogRewriter: Configured rewriter instance
    """
    return TravelBlogRewriter(openai_api_key=openai_api_key, max_chunk_size=max_chunk_size)
