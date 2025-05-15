from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
import shutil
from movie import MovieGenerator
from yc_coach import YCCoach, get_project
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Configure directories
MUSIC_DIR = "assets/music"
IMAGE_DIR = "assets/images"
VIDEO_DIR = "assets/output_videos"
os.makedirs(MUSIC_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)

# Mount static directories
app.mount("/static/music", StaticFiles(directory=MUSIC_DIR), name="music")
app.mount("/static/images", StaticFiles(directory=IMAGE_DIR), name="images")
app.mount("/static/videos", StaticFiles(directory=VIDEO_DIR), name="videos")

@app.get("/")
def read_root():
    return {"message": "Hello World"}

# List endpoints
@app.get("/list/{media_type}")
async def list_media(media_type: str):
    """List all files of specified media type (music, image, or video)"""
    try:
        if media_type == "music":
            directory = MUSIC_DIR
        elif media_type == "image":
            directory = IMAGE_DIR
        elif media_type == "video":
            directory = VIDEO_DIR
        else:
            raise HTTPException(status_code=400, detail="Invalid media type. Use 'music', 'image', or 'video'")
        
        files = os.listdir(directory)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get media file
@app.get("/media/{media_type}/{filename}")
async def get_media(media_type: str, filename: str):
    """Get a specific media file"""
    try:
        if media_type == "music":
            directory = MUSIC_DIR
        elif media_type == "image":
            directory = IMAGE_DIR
        elif media_type == "video":
            directory = VIDEO_DIR
        else:
            raise HTTPException(status_code=400, detail="Invalid media type. Use 'music', 'image', or 'video'")
        
        file_path = os.path.join(directory, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type=None  # Let FastAPI determine the media type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Media Upload
@app.post("/media/{media_type}/upload")
async def upload_media(media_type: str, file: UploadFile = File(...)):
    """Upload a media file (music, image, or video)"""
    try:
        if media_type == "music":
            directory = MUSIC_DIR
        elif media_type == "image":
            directory = IMAGE_DIR
        elif media_type == "video":
            directory = VIDEO_DIR
        else:
            raise HTTPException(status_code=400, detail="Invalid media type. Use 'music', 'image', or 'video'")
        
        file_path = os.path.join(directory, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"message": f"{media_type.capitalize()} file {file.filename} uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Video Generation
class VideoGenerationRequest(BaseModel):
    image_filenames: List[str]
    music_filename: Optional[str] = None
    video_duration: Optional[float] = None
    image_duration: float = 3.0
    fps: int = 24

@app.post("/video/generate")
async def generate_video(request: VideoGenerationRequest):
    """Generate a video from images and optional music"""
    try:
        # Get full paths for images
        image_paths = [os.path.join(IMAGE_DIR, filename) for filename in request.image_filenames]
        
        # Get music path if provided
        music_path = os.path.join(MUSIC_DIR, request.music_filename) if request.music_filename else None
        
        # Generate output filename
        output_filename = f"generated_video_{len(os.listdir(VIDEO_DIR)) + 1}.mp4"
        output_path = os.path.join(VIDEO_DIR, output_filename)
        
        # Create video
        generator = MovieGenerator()
        result = generator.create_video_from_images_and_music(
            image_paths=image_paths,
            output_path=output_path,
            music_path=music_path,
            video_duration=request.video_duration,
            image_duration=request.image_duration,
            fps=request.fps,
        )
        
        if result and os.path.exists(result):
            return {"message": "Video generated successfully", "output_path": result}
        raise HTTPException(status_code=500, detail="Failed to generate video")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# YC Coach
class YCRequest(BaseModel):
    project_name: str = "default"
    current_event_logs: str

@app.post("/yc_coach")
async def yc_coach(request: YCRequest):
    agent = YCCoach()   
    project = get_project(request.project_name)
    result = agent.suggest_next_steps(
        project_purpose=project['project_purpose'],
        user_personality=project['user_personality'],
        current_event_logs=request.current_event_logs,
    )

    return {"message": result}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)