import os
import subprocess
from typing import List, Optional, Tuple
from moviepy.editor import ImageClip, AudioFileClip, CompositeAudioClip, concatenate_videoclips # ImageSequenceClip is good for sequences with fixed fps
import tempfile
import logging
import shutil # For copying files

# Pillow (PIL) for creating dummy images for testing
from PIL import Image, ImageDraw


# https://pixabay.com/zh/music/
# https://www.behance.net/
# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MovieGenerator:
    def __init__(self):
        """初始化视频生成器"""
        # 使用 TemporaryDirectory 会在with语句结束时自动清理
        # 但为了与您之前的代码结构保持一致，这里继续使用mkdtemp
        # 请注意：您需要自行管理这个临时目录的清理
        self.temp_dir = tempfile.mkdtemp()
        logger.info(f"创建临时目录: {self.temp_dir}")

    def download_or_get_music(self, music_name: str, desired_duration: Optional[float] = None) -> Optional[str]:
        """
        尝试从本地音乐库获取音乐，如果找不到，则创建一个指定时长的静音音轨。

        Args:
            music_name: 音乐名称的关键词，用于在本地库搜索。
            desired_duration: 音频期望的时长（秒）。如果创建静音音轨，会使用此时长。

        Returns:
            str: 音乐文件的本地路径，如果失败则返回 None。
        """
        try:
            music_filename = f"{music_name.replace(' ', '_')}_temp.mp3"
            music_path = os.path.join(self.temp_dir, music_filename)

            local_music_dir = os.getenv("LOCAL_MUSIC_DIR", "./music_library")
            logger.info(f"检查本地音乐库: {os.path.abspath(local_music_dir)}")

            if os.path.exists(local_music_dir) and os.path.isdir(local_music_dir):
                local_files = [f for f in os.listdir(local_music_dir) if f.lower().endswith(('.mp3', '.wav', '.m4a'))]
                if local_files:
                    matching_files = [f for f in local_files if music_name.lower() in f.lower()]
                    
                    selected_file_name = None
                    if matching_files:
                        selected_file_name = matching_files[0] # 选择第一个匹配的
                        logger.info(f"在本地音乐库中找到匹配文件: {selected_file_name}")
                    else:
                        selected_file_name = local_files[0] # 随机选择一个（或者可以按其他逻辑）
                        logger.info(f"本地音乐库中未找到 '{music_name}' 的精确匹配, 使用库中文件: {selected_file_name}")
                    
                    source_music_path = os.path.join(local_music_dir, selected_file_name)
                    shutil.copy(source_music_path, music_path) # 复制到临时目录
                    logger.info(f"已复制本地音乐 '{selected_file_name}' 到 '{music_path}'")
                    return music_path
                else:
                    logger.warning(f"本地音乐库 '{local_music_dir}' 为空。")
            else:
                logger.warning(f"本地音乐库目录 '{local_music_dir}' 不存在。")

            # 如果本地音乐库不可用或为空，创建一个静音的音频文件
            duration_str = str(int(desired_duration)) if desired_duration else '10' # 默认10秒
            logger.warning(f"将创建时长为 {duration_str} 秒的静音音轨 '{music_path}'")
            
            # 确保ffmpeg路径正确，或者它在系统PATH中
            # Forcing stereo and a common sample rate. Using libmp3lame for MP3.
            cmd = [
                'ffmpeg', '-y', '-f', 'lavfi', '-i', f'anullsrc=channel_layout=stereo:sample_rate=44100',
                '-t', duration_str, '-q:a', '5', '-c:a', 'libmp3lame', music_path
            ]
            logger.info(f"执行 FFmpeg 命令: {' '.join(cmd)}")
            process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)

            if process.returncode != 0:
                logger.error(f"FFmpeg 创建静音音轨失败: {process.stderr}")
                return None
            if not os.path.exists(music_path) or os.path.getsize(music_path) == 0:
                logger.error(f"FFmpeg 命令似乎已运行，但未成功创建有效的静音音轨 '{music_path}'. FFmpeg stderr: {process.stderr}")
                return None

            logger.info(f"已成功创建静音音轨: {music_path}")
            return music_path

        except Exception as e:
            logger.error(f"获取或创建音乐失败: {e}", exc_info=True)
            return None # 返回None表示失败

    def merge_images_and_audio(
        self,
        image_paths: List[str],
        audio_path: Optional[str],
        output_path: str,
        image_duration: float = 3.0, # 每张图片显示时长（秒）
        fps: int = 24, # 输出视频的帧率
        video_duration: Optional[float] = None, # 如果提供，则优先于 image_duration
        image_size: Optional[Tuple[int, int]] = None # (width, height), e.g., (1920, 1080)
    ) -> Optional[str]:
        """
        将图片和音频合并成视频。

        Args:
            image_paths: 图片路径列表。
            audio_path: 音频文件路径 (可选)。
            output_path: 输出视频路径。
            image_duration: 每张图片默认显示时长（秒）。
            fps: 视频的帧率。
            video_duration: 视频的总时长（秒）。如果指定，将覆盖 image_duration 来计算每张图片的实际显示时间。
            image_size: 统一调整图片尺寸到指定大小 (宽, 高)。

        Returns:
            str: 生成的视频文件路径，如果失败则为 None。
        """
        try:
            if not image_paths:
                logger.error("图片列表为空，无法创建视频。")
                return None

            for img_path in image_paths:
                if not os.path.exists(img_path):
                    logger.error(f"图片不存在: {img_path}")
                    return None # 或者 raise FileNotFoundError

            # 计算每张图片的实际持续时间
            num_images = len(image_paths)
            if video_duration and num_images > 0:
                actual_image_duration = video_duration / num_images
            else:
                actual_image_duration = image_duration

            logger.info(f"每张图片将显示 {actual_image_duration:.2f} 秒。总图片数: {num_images}")

            # 创建图片剪辑列表
            image_clips = []
            for img_path in image_paths:
                img_clip = ImageClip(img_path).set_duration(actual_image_duration)
                if image_size: # 如果指定了尺寸，则调整图片大小
                    img_clip = img_clip.resize(width=image_size[0], height=image_size[1])
                image_clips.append(img_clip)
            
            if not image_clips:
                logger.error("未能创建任何图片剪辑。")
                return None

            # 将图片剪辑合成为一个视频轨
            video_clip = concatenate_videoclips(image_clips, method="compose")
            logger.info(f"视频轨创建成功，总时长: {video_clip.duration:.2f} 秒。")

            # 加载并设置音频
            if audio_path and os.path.exists(audio_path):
                try:
                    audio = AudioFileClip(audio_path)
                    # 如果音频比视频长，裁剪音频；如果短，可以循环或保持原样
                    if audio.duration > video_clip.duration:
                        audio = audio.subclip(0, video_clip.duration)
                    # 如果音频比视频短，可以让 MoviePy 自动循环填充，或者直接使用
                    # audio = audio.set_duration(video_clip.duration) # 强制音频时长与视频一致 (可能拉伸或截断)
                    # 或者使用 afx.audio_loop(audio, duration=video_clip.duration)
                    
                    video_clip = video_clip.set_audio(audio)
                    logger.info(f"音频 '{audio_path}' 加载成功，并设置为视频音轨。音频时长: {audio.duration:.2f}秒")
                except Exception as e: # 更具体的异常捕获，如 IOError for bad files
                    logger.error(f"加载音频文件 '{audio_path}' 失败: {e}. 视频将不含外部音频。", exc_info=True)
                    # video_clip = video_clip.set_audio(None) # 确保没有音频，或者依赖 MoviePy 默认行为
            else:
                logger.warning(f"音频文件 '{audio_path}' 不存在或未提供。视频将不含外部音频。")
                # video_clip = video_clip.set_audio(None) # 明确设置无音频

            # 确保输出目录存在
            output_dir = os.path.dirname(os.path.abspath(output_path))
            if not output_dir: # 如果 output_path 只是文件名，dirname 会是空
                output_dir = "." 
            os.makedirs(output_dir, exist_ok=True)
            logger.info(f"确保输出目录存在: {output_dir}")

            # 写入视频文件
            logger.info(f"开始写入视频文件到: {output_path}")
            video_clip.write_videofile(
                output_path,
                fps=fps,
                codec='libx264', # 常见的视频编码器
                audio_codec='aac', # 常见的音频编码器
                temp_audiofile=os.path.join(self.temp_dir, 'temp-audio.m4a'), # MoviePy <2.0
                # remove_temp=True # MoviePy <2.0, for >2.0 it's handled internally better
                # logger='bar' # or None to disable progress bar
            )
            
            # MoviePy 2.0+ 会自动关闭文件，但手动关闭剪辑是个好习惯
            if hasattr(video_clip, 'close'):
                video_clip.close()
            if 'audio' in locals() and hasattr(audio, 'close'):
                 audio.close()
            for iclip in image_clips:
                if hasattr(iclip, 'close'):
                    iclip.close()

            logger.info(f"视频合成完成: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"合并图片和音频失败: {e}", exc_info=True)
            # 清理已创建的 clip 对象
            if 'video_clip' in locals() and hasattr(video_clip, 'close'): video_clip.close()
            if 'audio' in locals() and hasattr(audio, 'close'): audio.close()
            if 'image_clips' in locals():
                for iclip in image_clips:
                    if hasattr(iclip, 'close'): iclip.close()
            return None

    def create_video_from_images_and_music(
        self,
        image_paths: List[str],
        output_path: str,
        music_name: str = "default_theme", # 用于在本地库搜索的音乐关键词
        author: Optional[str] = None, # 未来可用于添加水印或元数据
        author_style: Optional[str] = None, # 未来可用于风格化处理
        emotion: Optional[str] = None, # 未来可用于选择特定情感的音乐或转场
        image_duration: float = 3.0, # 每张图片显示时长（秒）
        fps: int = 24,
        video_duration: Optional[float] = None, # 如果提供，则覆盖 image_duration
        image_size: Optional[Tuple[int, int]] = (1280, 720) # 默认输出720p
    ) -> Optional[str]:
        """
        高级功能：根据图片、音乐名称（情感等参数未来可用）创建视频。
        """
        logger.info(f"开始创建视频 '{output_path}'")
        logger.info(f"参数: 作者='{author}', 风格='{author_style}', 情感='{emotion}', 音乐名='{music_name}'")

        # 1. 获取/下载音乐
        # 确定音频期望时长，如果 video_duration 已指定，就用它，否则用 image_duration * num_images
        expected_audio_duration = video_duration
        if not expected_audio_duration and image_paths:
            expected_audio_duration = len(image_paths) * image_duration
        
        audio_file_path = self.download_or_get_music(music_name, desired_duration=expected_audio_duration)
        
        if not audio_file_path:
            logger.warning(f"未能获取到音频 '{music_name}'，视频将不包含外部音乐或使用静音轨（如果生成成功）。")
            # 即使 download_or_get_music 返回 None (表示创建静音音轨也失败)，
            # merge_images_and_audio 也会处理 audio_path 为 None 的情况。

        # 2. 合并图片和音频
        final_video_path = self.merge_images_and_audio(
            image_paths=image_paths,
            audio_path=audio_file_path, # 可能为 None
            output_path=output_path,
            image_duration=image_duration,
            fps=fps,
            video_duration=video_duration,
            image_size=image_size
        )
        
        return final_video_path

    def cleanup(self):
        """清理临时目录"""
        try:
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
                logger.info(f"临时目录已清理: {self.temp_dir}")
        except Exception as e:
            logger.error(f"清理临时目录失败: {e}", exc_info=True)

# --- 测试代码 ---
def create_dummy_image(path: str, size: Tuple[int, int] = (800, 600), text: str = "", color: str = "blue"):
    """创建一个带文字的简单占位图片"""
    img = Image.new('RGB', size, color=color)
    draw = ImageDraw.Draw(img)
    
    # 简单的文字居中（近似）
    try:
        # 尝试加载一个字体，如果失败则不添加文字
        from PIL import ImageFont
        try:
            font = ImageFont.truetype("arial.ttf", 40) # 尝试使用arial字体
        except IOError:
            font = ImageFont.load_default() # 如果arial找不到，使用默认字体
        
        if hasattr(draw, 'textbbox'): # Pillow 8.0.0+
            bbox = draw.textbbox((0,0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
        else: # Older Pillow
            text_width, text_height = draw.textsize(text, font=font)
            
        x = (size[0] - text_width) / 2
        y = (size[1] - text_height) / 2
        draw.text((x, y), text, fill="white", font=font)
    except Exception as e:
        logger.warning(f"添加文字到图片失败 (可能未找到字体): {e}")
        pass # 即使文字失败，图片也已创建

    img.save(path)
    logger.info(f"创建测试图片: {path}")

def setup_test_environment(test_dir_name: str = "test_movie_assets") -> Tuple[str, str, List[str]]:
    """创建测试所需的目录和文件"""
    base_dir = os.path.abspath(test_dir_name)
    image_dir = os.path.join(base_dir, "images")
    music_dir = os.path.join(base_dir, "music_library") # 对应 LOCAL_MUSIC_DIR 环境变量的默认值 `./music_library`
    output_dir = os.path.join(base_dir, "output_videos")

    os.makedirs(image_dir, exist_ok=True)
    os.makedirs(music_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)
    
    # 创建一些测试图片
    image_paths = []
    colors = ["red", "green", "blue", "purple", "orange"]
    for i in range(5):
        img_text = f"Image {i+1}"
        img_path = os.path.join(image_dir, f"test_image_{i+1}.jpg")
        create_dummy_image(img_path, text=img_text, color=colors[i])
        image_paths.append(img_path)
        
    # 创建一个测试音乐文件 (静音MP3，仅作占位符)
    # 实际测试时，您应该放入真实的MP3文件
    sample_music_name = "sample_theme.mp3"
    sample_music_path = os.path.join(music_dir, sample_music_name)
    if not os.path.exists(sample_music_path): # 避免重复创建
        try:
            cmd = [
                'ffmpeg', '-y', '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
                '-t', '15', '-q:a', '5', '-c:a', 'libmp3lame', sample_music_path
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            logger.info(f"创建测试用占位音乐文件: {sample_music_path}")
        except Exception as e:
            logger.error(f"创建测试音乐失败: {e}. 请确保ffmpeg已安装并配置在PATH中。")
            logger.info("您可以手动在 'test_movie_assets/music_library/' 目录下放置一个名为 'sample_theme.mp3' 的MP3文件。")

    # 设置环境变量，让 MovieGenerator 找到本地音乐库
    # 如果您在其他地方运行此脚本，可能需要调整路径
    os.environ["LOCAL_MUSIC_DIR"] = music_dir
    
    return output_dir, music_dir, image_paths


def test_movie_generator():
    """测试视频生成功能"""
    logger.info("开始测试 MovieGenerator...")
    
    output_videos_dir, local_music_lib, test_image_paths = setup_test_environment()
    
    if not test_image_paths:
        logger.error("未能创建或找到测试图片，测试中止。")
        return
    if not os.path.exists(os.path.join(local_music_lib, "sample_theme.mp3")):
        logger.warning(f"测试音乐 'sample_theme.mp3' 未在 '{local_music_lib}' 中找到。视频可能会使用生成的静音轨。")

    generator = MovieGenerator()
    
    try:
        
       
        # 测试21 使用每张图片时长，不指定总视频时长
        logger.info("\n--- 测试 2: 指定每张图片时长 ---")
        output_video_path_2 = os.path.join(output_videos_dir, "test_video_output_img_duration.mp4")
        result_path_2 = generator.create_video_from_images_and_music(
            image_paths=test_image_paths[:3], # 只用3张图
            output_path=output_video_path_2,
            music_name="non_existent_music", # 测试找不到音乐时生成静音轨
            image_duration=2.5, # 每张2.5秒
            image_size=(640, 480), # 480p
            fps=20
        )
        if result_path_2:
            logger.info(f"测试 2 视频生成成功: {result_path_2}")
            assert os.path.exists(result_path_2), f"测试2断言失败：视频文件 {result_path_2} 未找到"
        else:
            logger.error("测试 2 视频生成失败。")


    except Exception as e:
        logger.error(f"测试过程中发生意外错误: {e}", exc_info=True)
    finally:
        # 清理 MovieGenerator 创建的临时目录
        generator.cleanup()
        logger.info("MovieGenerator 临时目录清理完毕。")
        # 注意：setup_test_environment 创建的 test_movie_assets 目录不会在此自动删除
        # 您可以手动删除它，或者在测试脚本外部处理

if __name__ == "__main__":
    # 重要：确保您的系统中已安装 FFmpeg，并且可以在命令行中直接调用 `ffmpeg`。
    # MoviePy 和 Pydub (如果使用) 都依赖它。
    #
    # 安装所需 Python 库:
    # pip install moviepy Pillow requests
    # (requests 在此代码中未直接用于核心视频生成，但包含在您的原始导入中)
    #
    # 如何准备音乐素材:
    # 1. 创建一个名为 `music_library` 的文件夹，与此脚本放在同一目录下。
    #    或者，设置环境变量 `LOCAL_MUSIC_DIR` 指向您的音乐库文件夹。
    # 2. 在该音乐库文件夹中放入一些 `.mp3`, `.wav`, 或 `.m4a` 格式的音乐文件。
    #    例如，放入一个名为 `sample_theme_positive.mp3` 的文件。
    #    `download_or_get_music` 方法会尝试根据 `music_name` 关键词（如 "sample_theme"）查找文件。
    #    如果找不到精确匹配，它会选择库中的第一个文件。如果库为空或找不到，会生成静音。
    #
    # 运行测试:
    # python your_script_name.py
    # 测试脚本会自动创建 `test_movie_assets` 目录，其中包含测试图片和临时的音乐库（含一个占位静音MP3）。
    # 生成的视频会存放在 `test_movie_assets/output_videos/` 目录下。

    test_movie_generator()
