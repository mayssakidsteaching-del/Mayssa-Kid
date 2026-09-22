import { useState, useRef, useEffect } from 'react';
import {
  Video,
  Upload,
  Sparkles,
  Download,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wand2,
  ArrowRight,
  RefreshCw,
  X,
} from 'lucide-react';
import { VeoGenerationItem, ImageGenerationItem } from '../types';

interface VeoVideoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type StudioTab = 'text_to_video' | 'image_to_video' | 'generate_image';

const PRESET_VIDEO_PROMPTS = [
  'Cinematic drone flyover of mist-shrouded Nordic fjords with dramatic golden sunset lighting',
  'Cyberpunk metropolis in a neon-drenched night rainstorm with reflections in wet asphalt',
  'Macro slow-motion of a water droplet splashing into a calm lake creating rhythmic ripples',
  'Ancient mystical library with dust motes drifting through shafts of amber stained-glass light',
];

const PRESET_IMAGE_PROMPTS = [
  'Editorial studio portrait in dramatic chiaroscuro Rembrandt lighting, rich texture and film grain',
  'Modernist architectural glass villa nestled into a misty pine forest at twilight',
  'Vibrant retro-futuristic botanical greenhouse filled with exotic bioluminescent flora',
  'Minimalist Bauhaus composition with bold geometric forms, warm sandstone, and navy shadows',
];

export function VeoVideoStudioModal({ isOpen, onClose }: VeoVideoStudioModalProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>('text_to_video');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [imageFileName, setImageFileName] = useState<string | null>(null);

  // Video generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<VeoGenerationItem | null>(null);
  const [generations, setGenerations] = useState<VeoGenerationItem[]>([]);
  const [pollingStatusText, setPollingStatusText] = useState('Initiating Veo neural synthesis...');

  // Image generation state
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentImage, setCurrentImage] = useState<ImageGenerationItem | null>(null);
  const [imageHistory, setImageHistory] = useState<ImageGenerationItem[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [transferNotice, setTransferNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }

    setImageFileName(file.name);
    setImageMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSelectedImageBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  // ----------------------------------------------------
  // Veo Video Generation (Text or Photo)
  // ----------------------------------------------------
  const handleStartVideoGeneration = async () => {
    if (activeTab === 'text_to_video' && !prompt.trim()) {
      return;
    }
    if (activeTab === 'image_to_video' && !selectedImageBase64) {
      return;
    }

    setIsGenerating(true);
    setPollingStatusText('Sending synthesis request to Veo 3...');

    try {
      const payload: any = {
        aspectRatio,
        prompt: prompt.trim() || undefined,
      };

      if (activeTab === 'image_to_video' && selectedImageBase64) {
        payload.imageBase64 = selectedImageBase64;
        payload.mimeType = imageMimeType;
      }

      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to start video generation');
      }

      const newGenItem: VeoGenerationItem = {
        id: 'veo_' + Date.now(),
        prompt: prompt.trim() || (activeTab === 'image_to_video' ? 'Photo animation' : 'Cinematic video'),
        hasImage: Boolean(selectedImageBase64),
        imagePreview: selectedImageBase64 || undefined,
        aspectRatio,
        operationName: data.operationName,
        status: 'rendering',
        statusMessage: 'Synthesizing 720p video frames...',
        createdAt: Date.now(),
      };

      setCurrentGeneration(newGenItem);
      setGenerations((prev) => [newGenItem, ...prev]);

      startPollingOperation(data.operationName, newGenItem.id);
    } catch (err: any) {
      console.error('Error generating video:', err);
      setIsGenerating(false);
      alert(`Veo error: ${err.message || 'Generation failed'}`);
    }
  };

  const startPollingOperation = (operationName: string, generationId: string) => {
    let attempts = 0;
    const maxAttempts = 75; // ~5 minutes max

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    pollTimerRef.current = setInterval(async () => {
      attempts++;
      const stageMessages = [
        'Allocating Veo neural accelerator...',
        'Computing lighting, radiance, and camera optics...',
        'Simulating realistic temporal dynamics and physical motion...',
        'Rendering and encoding 720p MP4 stream...',
        'Finalizing video buffer...',
      ];
      setPollingStatusText(stageMessages[Math.min(attempts % stageMessages.length, stageMessages.length - 1)]);

      try {
        const res = await fetch('/api/video/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });

        const data = await res.json();

        if (data.done) {
          clearInterval(pollTimerRef.current);
          setIsGenerating(false);

          if (data.error) {
            updateGenerationStatus(generationId, 'failed', undefined, data.error);
          } else if (data.hasVideo) {
            const videoUrl = `/api/video/download?operationName=${encodeURIComponent(operationName)}`;
            updateGenerationStatus(generationId, 'completed', videoUrl);
          } else {
            updateGenerationStatus(generationId, 'failed', undefined, 'No video returned from Veo');
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(pollTimerRef.current);
          setIsGenerating(false);
          updateGenerationStatus(generationId, 'failed', undefined, 'Operation timed out after 5 minutes');
        }
      } catch (pollErr: any) {
        console.warn('Status poll exception:', pollErr);
      }
    }, 4000);
  };

  const updateGenerationStatus = (
    id: string,
    status: 'completed' | 'failed',
    videoUrl?: string,
    error?: string
  ) => {
    setGenerations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status, videoUrl, error } : item
      )
    );
    setCurrentGeneration((prev) =>
      prev && prev.id === id ? { ...prev, status, videoUrl, error } : prev
    );
  };

  // ----------------------------------------------------
  // Gemini AI Image Generation
  // ----------------------------------------------------
  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;

    setIsGeneratingImage(true);
    setImageError(null);
    setTransferNotice(null);

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio: imageAspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate image');
      }

      const item: ImageGenerationItem = {
        id: 'img_' + Date.now(),
        prompt: prompt.trim(),
        imageUrl: data.imageUrl,
        aspectRatio: data.aspectRatio,
        createdAt: Date.now(),
      };

      setCurrentImage(item);
      setImageHistory((prev) => [item, ...prev]);
    } catch (err: any) {
      console.error('Image generation error:', err);
      setImageError(err.message || 'Image generation failed');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Transfer generated image directly to "Animate Photo" tab
  const handleSendToAnimate = (img: ImageGenerationItem) => {
    setSelectedImageBase64(img.imageUrl);
    setImageFileName(`generated-${img.id}.png`);
    setImageMimeType('image/png');
    setActiveTab('image_to_video');
    setPrompt('Animate with subtle realistic motion, gentle camera drifting, and dynamic lighting');
    setAspectRatio(img.aspectRatio === '9:16' ? '9:16' : '16:9');
    setTransferNotice('Image loaded into Animate Photo mode! Click "Animate Photo into Video" when ready.');
    setTimeout(() => setTransferNotice(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative flex h-[94vh] max-h-[850px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0b0e14] shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-[#10141f]/90">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37]">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-bold text-neutral-100">
                  Creative Media Studio
                </span>
                <span className="rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 px-2 py-0.5 font-mono text-[10px] text-[#f3cf65]">
                  Veo 3 & Gemini Vision
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Text-to-Video, Still Photo Animation, and High-Resolution AI Image Synthesis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            title="Close Studio"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Studio Content Grid */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Left Panel: Creation Controls */}
          <div className="flex flex-1 flex-col overflow-y-auto border-r border-white/10 p-5 space-y-4 bg-[#0c1017]">
            {/* 3 Creation Tabs */}
            <div className="grid grid-cols-3 rounded-xl border border-white/10 bg-black/50 p-1 font-mono text-xs">
              <button
                onClick={() => {
                  setActiveTab('text_to_video');
                  setPrompt('');
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
                  activeTab === 'text_to_video'
                    ? 'bg-[#d4af37] text-black font-semibold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Video className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Text to Video</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('image_to_video');
                  setPrompt('');
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
                  activeTab === 'image_to_video'
                    ? 'bg-[#d4af37] text-black font-semibold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Film className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Animate Photo</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('generate_image');
                  setPrompt('');
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
                  activeTab === 'generate_image'
                    ? 'bg-[#d4af37] text-black font-semibold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Generate Image</span>
              </button>
            </div>

            {/* Notification Banner when image was sent to animate */}
            {transferNotice && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 animate-in fade-in duration-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{transferNotice}</span>
              </div>
            )}

            {/* Photo Uploader (When in Image-to-Video mode) */}
            {activeTab === 'image_to_video' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-medium text-neutral-300">
                    Still Photo to Animate:
                  </label>
                  {selectedImageBase64 && (
                    <span className="text-[10px] font-mono text-emerald-400">Photo ready</span>
                  )}
                </div>

                {selectedImageBase64 ? (
                  <div className="relative rounded-xl border border-white/15 bg-black/40 p-2 overflow-hidden group">
                    <img
                      src={selectedImageBase64}
                      alt="Upload preview"
                      className="h-44 w-full rounded-lg object-contain bg-black/60"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg bg-white/20 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-white/30"
                      >
                        Change Photo
                      </button>
                      <button
                        onClick={() => {
                          setSelectedImageBase64(null);
                          setImageFileName(null);
                        }}
                        className="rounded-lg bg-red-500/30 px-3 py-1.5 text-xs text-red-200 backdrop-blur hover:bg-red-500/50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-4 text-center transition-all hover:border-[#d4af37]/60 hover:bg-[#d4af37]/5"
                  >
                    <Upload className="h-8 w-8 text-[#d4af37] mb-2" />
                    <p className="text-xs font-medium text-neutral-200">
                      Drop photo here or click to browse
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Or generate an image in the "Generate Image" tab and click "Animate"
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>
            )}

            {/* Prompt Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-medium text-neutral-300">
                  {activeTab === 'text_to_video'
                    ? 'Cinematic Video Prompt:'
                    : activeTab === 'image_to_video'
                    ? 'Motion & Camera Directives (Optional):'
                    : 'AI Image Description:'}
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {activeTab === 'generate_image' ? 'Gemini 3.1 Flash Image' : 'Veo 3 Preview'}
                </span>
              </div>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  activeTab === 'text_to_video'
                    ? 'Describe scene, lighting, camera motion, atmosphere...'
                    : activeTab === 'image_to_video'
                    ? 'e.g., slow cinematic pan, subtle breeze in hair, glowing evening light...'
                    : 'Describe subject, artistic medium, composition, lighting...'
                }
                className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-xs leading-relaxed text-neutral-100 placeholder:text-neutral-500 focus:border-[#d4af37]/60 focus:outline-none"
              />
            </div>

            {/* Aspect Ratio Selector */}
            {activeTab === 'generate_image' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-neutral-300">
                  Image Aspect Ratio:
                </label>
                <div className="grid grid-cols-5 gap-1.5 font-mono text-[11px]">
                  {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setImageAspectRatio(ratio)}
                      className={`rounded-lg border p-2 text-center transition-all ${
                        imageAspectRatio === ratio
                          ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#f3cf65] font-semibold'
                          : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-neutral-300">
                  Video Aspect Ratio:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-mono transition-all ${
                      aspectRatio === '16:9'
                        ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#f3cf65]'
                        : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <div className="h-3 w-5 rounded-sm border border-current" />
                    <span>16:9 Landscape</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-mono transition-all ${
                      aspectRatio === '9:16'
                        ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#f3cf65]'
                        : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <div className="h-5 w-3 rounded-sm border border-current" />
                    <span>9:16 Portrait</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Inspiration Ideas */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono text-neutral-400">
                Quick Inspiration Ideas:
              </label>
              <div className="flex flex-col gap-1.5">
                {(activeTab === 'generate_image' ? PRESET_IMAGE_PROMPTS : PRESET_VIDEO_PROMPTS).map(
                  (p, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(p)}
                      className="truncate rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-left text-[11px] text-neutral-400 transition-colors hover:border-white/15 hover:text-neutral-200"
                    >
                      "{p}"
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              {activeTab === 'generate_image' ? (
                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !prompt.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] py-3 text-xs font-bold text-black shadow-lg transition-all hover:bg-[#e2bd4e] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Image...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate AI Image</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleStartVideoGeneration}
                  disabled={
                    isGenerating ||
                    (activeTab === 'text_to_video' && !prompt.trim()) ||
                    (activeTab === 'image_to_video' && !selectedImageBase64)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] py-3 text-xs font-bold text-black shadow-lg transition-all hover:bg-[#e2bd4e] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Video...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {activeTab === 'image_to_video'
                          ? 'Animate Photo into Video'
                          : 'Generate Video with Veo'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Panel: Output Stage (Video Player or Image Canvas) */}
          <div className="flex flex-1 flex-col overflow-y-auto p-5 space-y-4 bg-[#080b10]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-neutral-300">
                {activeTab === 'generate_image' ? 'Generated Image Canvas' : 'Synthesized Video Output'}
              </span>

              {/* Action Buttons for Output */}
              <div className="flex items-center gap-2">
                {activeTab === 'generate_image' && currentImage?.imageUrl && (
                  <>
                    <button
                      onClick={() => handleSendToAnimate(currentImage)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/15 px-2.5 py-1 text-xs font-medium text-[#f3cf65] hover:bg-[#d4af37]/25 transition-colors"
                      title="Animate this generated image into a video using Veo"
                    >
                      <Film className="h-3.5 w-3.5" />
                      <span>Animate with Veo</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    <a
                      href={currentImage.imageUrl}
                      download={`berno-ai-image-${currentImage.id}.png`}
                      className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-neutral-200 hover:bg-white/20 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PNG</span>
                    </a>
                  </>
                )}

                {activeTab !== 'generate_image' && currentGeneration?.videoUrl && (
                  <a
                    href={currentGeneration.videoUrl}
                    download="veo3-generation.mp4"
                    className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs text-neutral-200 hover:bg-white/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download MP4</span>
                  </a>
                )}
              </div>
            </div>

            {/* Display Stage */}
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black/80 shadow-2xl">
              {activeTab === 'generate_image' ? (
                /* Image Output Area */
                isGeneratingImage ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37]">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-serif text-sm font-semibold text-neutral-100">
                        Synthesizing Image with Gemini
                      </p>
                      <p className="font-mono text-xs text-[#d4af37] animate-pulse">
                        Rendering high-resolution visual pixels...
                      </p>
                    </div>
                  </div>
                ) : currentImage?.imageUrl ? (
                  <div className="relative h-full w-full p-2 flex items-center justify-center">
                    <img
                      src={currentImage.imageUrl}
                      alt={currentImage.prompt}
                      className="max-h-full max-w-full rounded-xl object-contain"
                    />
                  </div>
                ) : imageError ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-red-400 space-y-2">
                    <AlertCircle className="h-8 w-8" />
                    <p className="text-xs font-semibold">Image Generation Failed</p>
                    <p className="text-[11px] text-neutral-400 max-w-sm">{imageError}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-2">
                    <ImageIcon className="h-10 w-10 text-neutral-700" />
                    <p className="text-xs font-medium text-neutral-400">No image generated yet</p>
                    <p className="text-[11px] text-neutral-600 max-w-xs">
                      Enter an artistic prompt on the left and click "Generate AI Image".
                    </p>
                  </div>
                )
              ) : (
                /* Video Output Area */
                isGenerating ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37]">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-serif text-sm font-semibold text-neutral-100">
                        Veo 3 Neural Generation in Progress
                      </p>
                      <p className="font-mono text-xs text-[#d4af37] animate-pulse">
                        {pollingStatusText}
                      </p>
                      <p className="text-[11px] text-neutral-500 pt-2">
                        720p neural rendering typically completes in ~45-90 seconds
                      </p>
                    </div>
                  </div>
                ) : currentGeneration?.videoUrl ? (
                  <video
                    ref={videoPlayerRef}
                    src={currentGeneration.videoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : currentGeneration?.error ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-red-400 space-y-2">
                    <AlertCircle className="h-8 w-8" />
                    <p className="text-xs font-semibold">Video Generation Failed</p>
                    <p className="text-[11px] text-neutral-400 max-w-sm">{currentGeneration.error}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-2">
                    <Film className="h-10 w-10 text-neutral-700" />
                    <p className="text-xs font-medium text-neutral-400">No active video generation</p>
                    <p className="text-[11px] text-neutral-600 max-w-xs">
                      Enter a prompt or upload a still photo on the left, then click Generate.
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Item Details */}
            {activeTab === 'generate_image' && currentImage && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>Model: gemini-3.1-flash-lite-image</span>
                  <span>Aspect: {currentImage.aspectRatio}</span>
                </div>
                <p className="text-neutral-200 line-clamp-2">
                  <span className="text-neutral-500 font-mono">Prompt:</span> {currentImage.prompt}
                </p>
              </div>
            )}

            {activeTab !== 'generate_image' && currentGeneration && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>Model: veo-3.1-lite-generate-preview</span>
                  <span>Aspect: {currentGeneration.aspectRatio}</span>
                </div>
                <p className="text-neutral-200 line-clamp-2">
                  <span className="text-neutral-500 font-mono">Prompt:</span> {currentGeneration.prompt}
                </p>
              </div>
            )}

            {/* Session Gallery */}
            {activeTab === 'generate_image' && imageHistory.length > 1 && (
              <div className="space-y-2 pt-2">
                <span className="font-mono text-[11px] text-neutral-400">Recent Generated Images</span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {imageHistory.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => setCurrentImage(img)}
                      className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all ${
                        currentImage?.id === img.id
                          ? 'border-[#d4af37] ring-1 ring-[#d4af37]'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.prompt}
                        className="h-20 w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendToAnimate(img);
                          }}
                          className="rounded bg-[#d4af37] px-2 py-0.5 text-[10px] font-bold text-black shadow"
                        >
                          Animate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab !== 'generate_image' && generations.length > 1 && (
              <div className="space-y-2 pt-2">
                <span className="font-mono text-[11px] text-neutral-400">Session Video History</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {generations.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setCurrentGeneration(g)}
                      className={`flex flex-col rounded-xl border p-2 text-left transition-all ${
                        currentGeneration?.id === g.id
                          ? 'border-[#d4af37] bg-[#d4af37]/10'
                          : 'border-white/10 bg-black/40 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                        <span>{g.aspectRatio}</span>
                        {g.status === 'completed' && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        )}
                      </div>
                      <p className="truncate text-xs text-neutral-200">{g.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
