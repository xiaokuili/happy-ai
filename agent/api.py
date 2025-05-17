from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
import shutil
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware # Import CORS

from movie import MovieGenerator
from yc_coach import YCCoach, get_project


# Remove YC Coach parts for this example if not strictly needed for the UI
# from yc_coach import YCCoach, get_project

app = FastAPI()

# CORS Configuration
origins = [
    "http://localhost:3000",  # Next.js frontend
    "http://localhost:3001",  # Another potential frontend port
    "*"
    # Add any other origins as needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)

# Configure directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
MUSIC_DIR = os.path.join(ASSETS_DIR, "music")
IMAGE_DIR = os.path.join(ASSETS_DIR, "images")
VIDEO_DIR = os.path.join(ASSETS_DIR, "output_videos") # For generated videos
UPLOADED_VIDEOS_DIR = os.path.join(ASSETS_DIR, "uploaded_videos") # For uploaded raw videos

os.makedirs(MUSIC_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)
os.makedirs(UPLOADED_VIDEOS_DIR, exist_ok=True)


# Mount static directories
app.mount("/static/music", StaticFiles(directory=MUSIC_DIR), name="static_music")
app.mount("/static/images", StaticFiles(directory=IMAGE_DIR), name="static_images")
app.mount("/static/videos", StaticFiles(directory=VIDEO_DIR), name="static_generated_videos")
app.mount("/static/uploaded_videos", StaticFiles(directory=UPLOADED_VIDEOS_DIR), name="static_uploaded_videos")


@app.get("/")
def read_root():
    return {"message": "Video Generation API is running"}

# List endpoints
@app.get("/list/{media_type}")
async def list_media(media_type: str):
    directory = ""
    if media_type == "music":
        directory = MUSIC_DIR
    elif media_type == "image":
        directory = IMAGE_DIR
    elif media_type == "uploaded_video": # Differentiate uploaded videos from generated ones
        directory = UPLOADED_VIDEOS_DIR
    elif media_type == "generated_video":
        directory = VIDEO_DIR
    else:
        raise HTTPException(status_code=400, detail="Invalid media type. Use 'music', 'image', 'uploaded_video', or 'generated_video'")
    
    try:
        files = [f for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f)) and not f.startswith('.')]
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get media file
@app.get("/media/{media_type}/{filename}")
async def get_media(media_type: str, filename: str):
    directory = ""
    if media_type == "music":
        directory = MUSIC_DIR
    elif media_type == "image":
        directory = IMAGE_DIR
    elif media_type == "uploaded_video":
        directory = UPLOADED_VIDEOS_DIR
    elif media_type == "generated_video": # For accessing generated videos
        directory = VIDEO_DIR
    else:
        raise HTTPException(status_code=400, detail="Invalid media type.")
        
    file_path = os.path.join(directory, filename)
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(path=file_path, filename=filename)


# Media Upload
@app.post("/media/{media_type}/upload")
async def upload_media(media_type: str, file: UploadFile = File(...)):
    directory = ""
    if media_type == "music":
        directory = MUSIC_DIR
    elif media_type == "image":
        directory = IMAGE_DIR
    elif media_type == "video": # This will now be for raw video uploads
        directory = UPLOADED_VIDEOS_DIR
    else:
        raise HTTPException(status_code=400, detail="Invalid media type for upload. Use 'music', 'image', or 'video'")
        
    file_path = os.path.join(directory, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return JSONResponse(content={"message": f"{media_type.capitalize()} file '{file.filename}' uploaded successfully", "filename": file.filename, "media_type": media_type}, status_code=201)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not upload file: {str(e)}")

# Delete Media File (NEW ENDPOINT)
@app.delete("/media/{media_type}/{filename}")
async def delete_media(media_type: str, filename: str):
    directory = ""
    if media_type == "music":
        directory = MUSIC_DIR
    elif media_type == "image":
        directory = IMAGE_DIR
    elif media_type == "uploaded_video":
        directory = UPLOADED_VIDEOS_DIR
    # Add other types if needed, but be careful about deleting generated videos vs source files
    else:
        raise HTTPException(status_code=400, detail="Invalid media type for deletion.")

    file_path = os.path.join(directory, filename)
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        os.remove(file_path)
        return {"message": f"{media_type.capitalize()} file '{filename}' deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not delete file: {str(e)}")


# Video Generation
class VideoGenerationRequest(BaseModel):
    image_filenames: List[str]
    music_filename: Optional[str] = None
    video_duration: Optional[float] = None # if music is shorter than total image duration, or vice versa
    image_duration: float = 3.0 # seconds per image
    fps: int = 24

@app.post("/video/generate")
async def generate_video_endpoint(request: VideoGenerationRequest): # Renamed to avoid conflict
    try:
        image_paths = [os.path.join(IMAGE_DIR, filename) for filename in request.image_filenames]
        for p in image_paths:
            if not os.path.exists(p):
                raise HTTPException(status_code=404, detail=f"Image file not found: {os.path.basename(p)}")

        music_path = os.path.join(MUSIC_DIR, request.music_filename) if request.music_filename else None
        if music_path and not os.path.exists(music_path) and request.music_filename: # check request.music_filename to avoid error if None
             raise HTTPException(status_code=404, detail=f"Music file not found: {request.music_filename}")
        
        # Ensure unique output filename
        count = 1
        while True:
            output_filename = f"generated_video_{count}.mp4"
            output_path = os.path.join(VIDEO_DIR, output_filename)
            if not os.path.exists(output_path):
                break
            count += 1
        
        generator = MovieGenerator() # Make sure this class is defined or imported
        result_path = generator.create_video_from_images_and_music(
            image_paths=image_paths,
            output_path=output_path,
            music_path=music_path,
            video_duration=request.video_duration,
            image_duration=request.image_duration,
            fps=request.fps,
        )
        
        if result_path and os.path.exists(result_path):
            # Return the filename, not the full path, for client-side URL construction
            return {"message": "Video generated successfully", "filename": os.path.basename(result_path), "url": f"/static/videos/{os.path.basename(result_path)}"}
        raise HTTPException(status_code=500, detail="Failed to generate video or result path not found.")
    except HTTPException as e: # Re-raise HTTPExceptions
        raise e
    except Exception as e:
        # Log the exception for debugging
        print(f"Error during video generation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


# YC Coach - keeping it for completeness from your snippet, but not used in the UI below
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
    # Create dummy files for testing listing
    # os.makedirs(os.path.join(IMAGE_DIR, "test_image1.jpg"), exist_ok=True)
    # os.makedirs(os.path.join(IMAGE_DIR, "test_image2.png"), exist_ok=True)
    # os.makedirs(os.path.join(MUSIC_DIR, "test_music.mp3"), exist_ok=True)
    # with open(os.path.join(IMAGE_DIR, "test_image1.jpg"), "w") as f: f.write("dummy image")
    # with open(os.path.join(IMAGE_DIR, "test_image2.png"), "w") as f: f.write("dummy image")
    # with open(os.path.join(MUSIC_DIR, "test_music.mp3"), "w") as f: f.write("dummy music")

    uvicorn.run(app, host="0.0.0.0", port=8000)