import os
import subprocess
from typing import List, Optional, Tuple
from moviepy.editor import (
    ImageClip, AudioFileClip, CompositeAudioClip, concatenate_videoclips,
    concatenate_audioclips # Added for looping audio
)
import tempfile
import logging
import shutil # For copying files

# Pillow (PIL) for creating dummy images for testing
from PIL import Image, ImageDraw

# For music download
import requests
from bs4 import BeautifulSoup
import urllib.parse # For URL encoding keywords

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MovieGenerator:
    def __init__(self):
        """Initialize the video generator."""
        self.temp_dir = tempfile.mkdtemp()
        logger.info(f"Created temporary directory: {self.temp_dir}")
    def download_or_get_music(self, search_keywords: List[str], desired_duration: float) -> Optional[str]:
        """Downloads or gets music based on search keywords and desired duration."""
        return "/Users/vincent/code/happy-ai/agent/test_movie_assets/musics/brain-implant-cyberpunk-sci-fi-trailer-action-intro-330416.mp3"

    def merge_images_and_audio(
        self,
        image_paths: List[str],
        audio_path: Optional[str],
        output_path: str,
        image_duration: float = 3.0,
        fps: int = 24,
        video_duration: Optional[float] = None,
        image_size: Optional[Tuple[int, int]] = None
    ) -> Optional[str]:
        """
        Merges images and audio into a video.
        """
        clips_to_close = []
        temp_media_files_for_moviepy = [] # Keep track of files copied to temp_dir for MoviePy

        try:
            if not image_paths:
                logger.error("Image list is empty. Cannot create video.")
                return None

            for img_path in image_paths:
                if not os.path.exists(img_path):
                    logger.error(f"Image not found: {img_path}")
                    return None

            num_images = len(image_paths)
            actual_image_duration = (video_duration / num_images) if (video_duration and num_images > 0) else image_duration
            logger.info(f"Each image will be displayed for {actual_image_duration:.2f}s. Total images: {num_images}")

            image_clips_list = []
            for i, original_img_path in enumerate(image_paths):
                _, extension = os.path.splitext(original_img_path)
                temp_img_filename = f"temp_image_{i}{extension}"
                temp_img_path_for_moviepy = os.path.join(self.temp_dir, temp_img_filename)
                shutil.copy(original_img_path, temp_img_path_for_moviepy)
                temp_media_files_for_moviepy.append(temp_img_path_for_moviepy)

                img_clip = ImageClip(temp_img_path_for_moviepy).set_duration(actual_image_duration)
                if image_size:
                    img_clip = img_clip.resize(width=image_size[0], height=image_size[1])
                image_clips_list.append(img_clip)
                clips_to_close.append(img_clip)
            
            if not image_clips_list:
                logger.error("Failed to create any image clips.")
                return None

            video_clip = concatenate_videoclips(image_clips_list, method="compose")
            clips_to_close.append(video_clip)
            logger.info(f"Video track created successfully. Total duration: {video_clip.duration:.2f}s.")

            final_audio_for_video = None
            if audio_path and os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
                try:
                    _, audio_ext = os.path.splitext(audio_path)
                    temp_audio_filename = f"temp_audio_main{audio_ext}"
                    temp_audio_path_for_moviepy = os.path.join(self.temp_dir, temp_audio_filename)
                    shutil.copy(audio_path, temp_audio_path_for_moviepy)
                    temp_media_files_for_moviepy.append(temp_audio_path_for_moviepy)

                    loaded_audio = AudioFileClip(temp_audio_path_for_moviepy)
                    clips_to_close.append(loaded_audio)

                    target_video_duration = video_clip.duration
                    if loaded_audio.duration > target_video_duration:
                        final_audio_for_video = loaded_audio.subclip(0, target_video_duration)
                    elif loaded_audio.duration < target_video_duration and loaded_audio.duration > 0.01: # Avoid division by zero for tiny clips
                        num_loops = int(target_video_duration / loaded_audio.duration) + 1
                        looped_clips_audio = [loaded_audio] * num_loops
                        concatenated_audio = concatenate_audioclips(looped_clips_audio)
                        clips_to_close.append(concatenated_audio) # Add concatenated to close list
                        final_audio_for_video = concatenated_audio.subclip(0, target_video_duration)
                    else: 
                        final_audio_for_video = loaded_audio 
                    
                    if final_audio_for_video:
                        # If final_audio_for_video is a new object (subclip/concat), add it for closing
                        if final_audio_for_video is not loaded_audio:
                             clips_to_close.append(final_audio_for_video)
                        video_clip = video_clip.set_audio(final_audio_for_video)
                        logger.info(f"Audio '{audio_path}' processed. Final audio duration: {final_audio_for_video.duration:.2f}s")

                except Exception as e:
                    logger.error(f"Failed to load or process audio file '{audio_path}': {e}. Video will have no external audio.", exc_info=True)
            else:
                if audio_path and (not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0) :
                     logger.warning(f"Provided audio file '{audio_path}' does not exist or is empty. Video will have no external audio.")
                else:
                     logger.info("No audio file provided or audio path was None. Video will have no external audio.")


            output_dir_abs = os.path.dirname(os.path.abspath(output_path))
            if not output_dir_abs: output_dir_abs = os.getcwd() # Fallback to current dir if only filename given
            os.makedirs(output_dir_abs, exist_ok=True)
            logger.info(f"Ensured output directory exists: {output_dir_abs}")

            temp_audiofile_for_write = os.path.join(self.temp_dir, f'final-temp-audio-{os.urandom(4).hex()}.m4a')
            temp_media_files_for_moviepy.append(temp_audiofile_for_write) # Add to list for cleanup

            logger.info(f"Writing video file to: {output_path}")
            video_clip.write_videofile(
                output_path,
                fps=fps,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=temp_audiofile_for_write,
                # logger='bar' # or None
            )
            
            logger.info(f"Video composition complete: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Failed to merge images and audio: {e}", exc_info=True)
            return None
        finally:
            # Close all MoviePy clips
            for clip_obj in clips_to_close:
                if hasattr(clip_obj, 'close') and callable(clip_obj.close):
                    try:
                        clip_obj.close()
                    except Exception as e_close:
                        logger.debug(f"Error closing a MoviePy clip: {e_close}")
            
            # Clean up temporary media files copied specifically for MoviePy processing
            for temp_file_path in temp_media_files_for_moviepy:
                if os.path.exists(temp_file_path):
                    try:
                        os.remove(temp_file_path)
                    except Exception as e_remove:
                        logger.debug(f"Error removing temporary media file {temp_file_path}: {e_remove}")


    def create_video_from_images_and_music(
        self,
        image_paths: List[str],
        output_path: str,
        music_path: str,
        author: Optional[str] = None, # Currently unused, but kept for future
        image_duration: float = 3.0,
        fps: int = 24,
        video_duration: Optional[float] = None,
        image_size: Optional[Tuple[int, int]] = (1280, 720)
    ) -> Optional[str]:
        """
        Creates a video from images and music based on keywords (e.g., style, mood).
        """
        logger.info(f"Starting video creation for '{output_path}'")
    
        expected_audio_duration = video_duration
        if not expected_audio_duration and image_paths: # Calculate based on image duration if video_duration not set
            num_images = len(image_paths)
            if num_images > 0 :
                expected_audio_duration = num_images * image_duration
            else: # No images, default to a short duration if silent track is made
                expected_audio_duration = 10.0 
        elif not image_paths: # No images, but video_duration might be set
             expected_audio_duration = video_duration if video_duration else 10.0
     
        
        final_video_path = self.merge_images_and_audio(
            image_paths=image_paths,
            audio_path=music_path, # This can be None
            output_path=output_path,
            image_duration=image_duration,
            fps=fps,
            video_duration=video_duration,
            image_size=image_size
        )
        
        return final_video_path

    def cleanup(self):
        """Cleans up the temporary directory."""
        try:
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
                logger.info(f"Temporary directory cleaned: {self.temp_dir}")
        except Exception as e:
            logger.error(f"Failed to clean temporary directory '{self.temp_dir}': {e}", exc_info=True)


if __name__ == "__main__":
    pass 