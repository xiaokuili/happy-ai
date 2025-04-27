from typing import List, Optional
import re

class TextSplitter:
    def __init__(self, max_chunk_size: int = 2000):
        self.max_chunk_size = max_chunk_size

    def split_by_sentences(self, text: str) -> List[str]:
        """Split text into sentences using punctuation marks."""
        # 使用中文和英文的句号、问号、感叹号来分割句子
        sentence_endings = r'[。！？.!?]+'
        sentences = re.split(f'({sentence_endings})', text)
        
        # 重新组合句子和标点符号
        complete_sentences = []
        for i in range(0, len(sentences)-1, 2):
            if i+1 < len(sentences):
                complete_sentences.append(sentences[i] + sentences[i+1])
            else:
                complete_sentences.append(sentences[i])
                
        return [s.strip() for s in complete_sentences if s.strip()]

    def split_text(self, text: str) -> List[str]:
        """Split long text into smaller chunks while preserving sentence integrity."""
        # 首先按段落分割
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for paragraph in paragraphs:
            # 如果段落本身就超过最大长度，需要进一步分割
            if len(paragraph) > self.max_chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                    
                # 按句子分割长段落
                sentences = self.split_by_sentences(paragraph)
                temp_chunk = ""
                
                for sentence in sentences:
                    if len(temp_chunk) + len(sentence) < self.max_chunk_size:
                        temp_chunk += sentence
                    else:
                        if temp_chunk:
                            chunks.append(temp_chunk.strip())
                        temp_chunk = sentence
                
                if temp_chunk:
                    current_chunk = temp_chunk
            
            # 如果当前段落可以添加到现有chunk
            elif len(current_chunk) + len(paragraph) < self.max_chunk_size:
                current_chunk += ("\n\n" if current_chunk else "") + paragraph
            
            # 如果添加当前段落会超过限制，保存当前chunk并开始新的chunk
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = paragraph
        
        # 添加最后一个chunk
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks

    def get_chunk_context(self, chunk_index: int, total_chunks: int) -> str:
        """Generate context information for each chunk."""
        context = f"This is part {chunk_index + 1} of {total_chunks}. "
        if chunk_index > 0:
            context += "Continue the previous narrative. "
        if chunk_index < total_chunks - 1:
            context += "The story continues in the next part. "
        return context 