from fastapi import FastAPI, Request
from translate import create_translation_agent

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello World"}

# 实现一个翻译的agent 
@app.post("/translate")
def translate(request: Request):
    data = request.json()
    agent = create_translation_agent()
    result = agent.translate(
        text=data['text'],
        source_lang=data.get('source_lang', 'zh'),
        target_lang=data.get('target_lang', 'en')
    )
    return {"translation": result}