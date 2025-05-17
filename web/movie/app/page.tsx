'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { UploadCloud, Trash2, Film, Image as ImageIcon, Music, Download, XCircle, CheckCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

interface MediaFile {
  id: string; // Use a unique ID for React keys, can be filename for server files
  name: string;
  url: string;
  type: 'image' | 'video' | 'music'; // 'video' here refers to uploaded raw videos
  fileObject?: File; // For local preview before upload
  localPreviewUrl?: string; // For createObjectURL
}

interface GeneratedVideo {
  name: string;
  url: string;
}

export default function VideoGeneratorPage() {
  const [uploadedImages, setUploadedImages] = useState<MediaFile[]>([]);
  const [uploadedMusic, setUploadedMusic] = useState<MediaFile[]>([]);
  
  const [selectedImageNames, setSelectedImageNames] = useState<string[]>([]);
  const [selectedMusicName, setSelectedMusicName] = useState<string | null>(null);

  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>, type: 'image'  | 'music') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    // Determine API media type for upload (backend uses 'video' for uploaded videos)
    const apiMediaType = type 

    try {
      const response = await fetch(`${API_BASE_URL}/media/${apiMediaType}/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'File upload failed');
      }
      
      setSuccessMessage(result.message || `${type} uploaded successfully!`);
      
      // Add the newly uploaded file to the appropriate state
      const newFile: MediaFile = {
        id: result.filename,
        name: result.filename,
        url: `${API_BASE_URL}/media/${result.media_type}/${result.filename}`,
        type: result.media_type === 'image' ? 'image' : result.media_type === 'music' ? 'music' : 'video',
      };
      
      if (type === 'image') {
        setUploadedImages(prev => [...prev, newFile]);
      } else if (type === 'music') {
        setUploadedMusic(prev => [...prev, newFile]);
      } 

    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || `Failed to upload ${type}.`);
    } finally {
      setIsLoading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleDeleteFile = async (fileName: string, type: 'image' | 'uploaded_video' | 'music') => {
    if (!window.confirm(`Are you sure you want to delete ${fileName}?`)) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/media/${type}/${fileName}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || 'File deletion failed');
      }
      setSuccessMessage(result.message || `${type} deleted successfully!`);
      
      if (type === 'image') {
        setUploadedImages(prev => prev.filter(f => f.name !== fileName));
        setSelectedImageNames(prev => prev.filter(name => name !== fileName));
      } else if (type === 'music') {
        setUploadedMusic(prev => prev.filter(f => f.name !== fileName));
        if (selectedMusicName === fileName) setSelectedMusicName(null);
      }

    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || `Failed to delete ${type}.`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleImageSelection = (fileName: string) => {
    setSelectedImageNames(prev =>
      prev.includes(fileName) ? prev.filter(name => name !== fileName) : [...prev, fileName]
    );
  };

  const handleGenerateVideo = async (event: FormEvent) => {
    event.preventDefault();
    if (selectedImageNames.length === 0) {
      setError('Please select at least one image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setGeneratedVideo(null);

    const payload = {
      image_filenames: selectedImageNames,
      music_filename: selectedMusicName,
      // image_duration: 3, // you can add form fields for these
      // fps: 24,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/video/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || 'Video generation failed');
      }
      setGeneratedVideo({ name: result.filename, url: `${API_BASE_URL}${result.url}` });
      setSuccessMessage(result.message || 'Video generated successfully!');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to generate video.');
    } finally {
      setIsLoading(false);
    }
  };

  const FileInput = ({ type, icon, label, onChange }: { type: 'image' | 'video' | 'music', icon: React.ReactNode, label: string, onChange: (e: ChangeEvent<HTMLInputElement>) => void }) => (
    <div className="mb-4">
      <label className="block mb-2 text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center justify-center w-full">
        <label htmlFor={`${type}-dropzone`} className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {icon}
            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-500">{type === 'image' ? 'PNG, JPG, GIF' : type === 'video' ? 'MP4, AVI, MOV' : 'MP3, WAV'}</p>
          </div>
          <input id={`${type}-dropzone`} type="file" className="hidden" onChange={onChange} accept={type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : 'audio/*'} />
        </label>
      </div>
    </div>
  );

  const MediaGrid = ({ files, type, onSelect, selectedNames, onDelete }: { files: MediaFile[], type: 'image' | 'uploaded_video' | 'music', onSelect?: (name: string) => void, selectedNames?: string[], onDelete: (name: string, type: 'image' | 'uploaded_video' | 'music') => void }) => (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 ${files.length > 0 ? 'mt-4' : ''}`}>
      {files.map(file => (
        <div key={file.id} className={`relative group border rounded-lg overflow-hidden shadow ${selectedNames?.includes(file.name) ? 'ring-2 ring-blue-500' : ''} ${type === 'music' ? 'p-3 flex flex-col justify-center items-center bg-gray-100' : ''}`}>
          {type === 'image' && <img src={file.url} alt={file.name} className="object-cover w-full h-32 cursor-pointer" onClick={() => onSelect && onSelect(file.name)} />}
          {type === 'uploaded_video' && <video src={file.url} controls className="object-cover w-full h-32" />}
          {type === 'music' && (
            <>
              <Music className="w-10 h-10 text-purple-500 mb-2" />
              <p className="text-xs text-center truncate w-full" title={file.name}>{file.name}</p>
              {onSelect && (
                <button
                  onClick={() => onSelect(file.name)}
                  className={`mt-2 w-full text-xs py-1 px-2 rounded ${selectedNames?.includes(file.name) ? 'bg-purple-600 text-white' : 'bg-purple-200 text-purple-700 hover:bg-purple-300'}`}
                >
                  {selectedNames?.includes(file.name) ? 'Selected' : 'Select'}
                </button>
              )}
            </>
          )}
          {(type === 'image' || type === 'uploaded_video') && onSelect && (
             <div 
                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-opacity cursor-pointer"
                onClick={() => onSelect(file.name)}
              >
              {selectedNames?.includes(file.name) && <CheckCircle className="w-8 h-8 text-white opacity-100" />}
              {!selectedNames?.includes(file.name) && <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100" />}
            </div>
          )}
          <button
            onClick={() => onDelete(file.name, type)}
            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
           {type !== 'music' && <p className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">{file.name}</p>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-4 md:p-8 font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800">视频生成</h1>
        <p className="text-gray-600">上传你的媒体并生成一个杰作!</p>
      </header>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center"><XCircle className="mr-2"/> {error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded flex items-center"><CheckCircle className="mr-2"/> {successMessage}</div>}
      {isLoading && <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded">处理中...请稍候。</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Column 1: Uploads */}
        <div>
          <section className="mb-6 p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center"><ImageIcon className="mr-2 text-blue-500" /> 上传图片</h2>
            <FileInput type="image" icon={<UploadCloud className="w-8 h-8 mb-3 text-gray-400"/>} label="选择图片 (PNG, JPG)" onChange={(e) => handleFileUpload(e, 'image')} />
            <MediaGrid files={uploadedImages} type="image" onSelect={toggleImageSelection} selectedNames={selectedImageNames} onDelete={(name) => handleDeleteFile(name, 'image')} />
            {uploadedImages.length > 0 && <p className="text-sm text-gray-500 mt-2">{selectedImageNames.length} 图片(s) 已选择。</p>}
          </section>

          <section className="mb-6 p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center"><Music className="mr-2 text-purple-500" /> 上传音乐</h2>
            <FileInput type="music" icon={<UploadCloud className="w-8 h-8 mb-3 text-gray-400"/>} label="选择音乐 (MP3, WAV)" onChange={(e) => handleFileUpload(e, 'music')} />
            <MediaGrid files={uploadedMusic} type="music" onSelect={setSelectedMusicName} selectedNames={selectedMusicName ? [selectedMusicName] : []} onDelete={(name) => handleDeleteFile(name, 'music')} />
             {selectedMusicName && <p className="text-sm text-gray-500 mt-2">音乐: {selectedMusicName} 已选择。</p>}
          </section>
        </div>

        {/* Column 2: Video Uploads (Raw) & Generation */}
        <div>
          
          <section className="p-6 bg-white shadow-lg rounded-lg sticky top-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-6">生成视频</h2>
            <form onSubmit={handleGenerateVideo}>
              <div className="mb-4">
                <p className="text-sm text-gray-600">图片选择: {selectedImageNames.length}</p>
                <p className="text-sm text-gray-600">音乐选择: {selectedMusicName || 'None'}</p>
              </div>
              <button
                type="submit"
                disabled={isLoading || selectedImageNames.length === 0}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition duration-150 ease-in-out flex items-center justify-center"
              >
                <Film className="mr-2"/>
                {isLoading ? 'Generating...' : 'Start Video Generation'}
              </button>
            </form>

            {generatedVideo && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Generated Video:</h3>
                <div className="border rounded-lg overflow-hidden bg-gray-50 p-2">
                   <video key={generatedVideo.url} width="100%" controls src={generatedVideo.url} className="rounded mb-2">
                     Your browser does not support the video tag.
                   </video>
                   <p className="text-sm text-gray-600 truncate mb-2" title={generatedVideo.name}>Filename: {generatedVideo.name}</p>
                   <a
                    href={generatedVideo.url}
                    download={generatedVideo.name}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="mr-2" size={18}/> Download Video
                  </a>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}