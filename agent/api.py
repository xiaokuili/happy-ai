from fastapi import FastAPI
from pydantic import BaseModel
from typing import List 
import uvicorn

from translate import create_translation_agent
from yc_coach import YCCoach, get_project

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello World"}




class TranslationRequest(BaseModel):
    text: str
    source_lang: str = "zh"
    target_lang: str = "en"

@app.post("/translate")
async def translate(request: TranslationRequest):
    """
    Translate text from source language to target language
    
    Args:
        request (TranslationRequest): Request containing text to translate and language settings
        
    Returns:
        dict: Response containing the translation or error message
    """
    try:
        agent = create_translation_agent()
        result = agent.translate(
            text=request.text,
            source_lang=request.source_lang,
            target_lang=request.target_lang
        )
        return {"translation": result}
    except Exception as e:
        return {"error": str(e)}, 500

class YCRequest(BaseModel):
    project_name: str 
    current_focus: List[str]

@app.post("/yc_coach")
async def yc_coach(request: YCRequest):
    agent = YCCoach()   
    project = get_project(request.project_name)
    project['current_focus'] = request.current_focus
    result = agent.suggest_next_steps(
        project_purpose=project['project_purpose'],
        user_personality=project['user_personality'],
        user_preferences=project['user_preferences'],
        current_event_logs=project['current_event_logs'],
        project_stage=project['project_stage'],
        current_focus=project['current_focus']
    )

    return {"message": result}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)