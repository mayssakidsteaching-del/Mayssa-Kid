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
  Layers,
  Eye,
} from 'lucide-react';
import { VeoGenerationItem, ImageGenerationItem } from '../types';

interface VeoVideoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: StudioTab;
}

export type StudioTab = 'create_image' | 'edit_image' | 'text_to_video' | 'image_to_video';

const PRESET_VIDEO_PROMPTS = [
  'Cinematic drone flyover of mist-shrouded Nordic fjords with dramatic golden sunset lighting',
  'Cyberpunk metropolis in a neon-drenched night rainstorm with reflections in wet asphalt',
  'Macro slow-motion of a water droplet splashing into a calm lake creating rhythmic ripples',
  'Ancient mystical library with dust motes drifting through shafts of amber stained-glass light',
];

const PRESET_CREATE_IMAGE_PROMPTS = [
  'Editorial studio portrait in dramatic chiaroscuro Rembrandt lighting, rich texture and film grain',
  'Modernist architectural glass villa nestled into a misty pine forest at twilight',
  'Vibrant retro-futuristic botanical greenhouse filled with exotic bioluminescent flora',
  'Minimalist Bauhaus composition with bold geometric forms, warm sandstone, and navy shadows',
];

const PRESET_EDIT_IMAGE_PROMPTS = [
  'Add dramatic cyberpunk neon ambient lighting and subtle volumetric haze',
  'Transform this scene into an oil painting on canvas with rich textured impasto brushstrokes',
  'Shift the time of day to golden hour twilight with deep warm amber sunlight and long shadows',
  'Add glowing futuristic holographic telemetry and geometric augmented reality accents',
];

export function VeoVideoStudioModal({ isOpen, onClose, initialTab = 'create_image' }: VeoVideoStudioModalProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');

  // Photo-to-Video state
  const [selectedPhotoBase64, setSelectedPhotoBase64] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string>('image/png');
  const [photoFileName, setPhotoFileName] = useState<string | null>(null);

  // Image Edit source state
  const [editSourceImageBase64, setEditSourceImageBase64] = useState<string | null>(null);
  const [editSourceFileName, setEditSourceFileName] = useState<string | null>(null);
  const [compareWithOriginal, setCompareWithOriginal] = useState(false);

  // Video generation state
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<VeoGenerationItem | null>(null);
  const [videoGenerations, setVideoGenerations] = useState<VeoGenerationItem[]>([]);
  const [pollingStatusText, setPollingStatusText] = useState('Initiating Veo neural synthesis...');

  // Image creation & editing state
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentImage, setCurrentImage] = useState<ImageGenerationItem | null>(null);
  const [imageHistory, setImageHistory] = useState<ImageGenerationItem[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [transferNotice, setTransferNotice] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
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

  // Handle uploading photo for video animation
  const handlePhotoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    setPhotoFileName(file.name);
    setPhotoMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedPhotoBase64(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle uploading image for AI editing
  const handleEditSourceUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    setEditSourceFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setEditSourceImageBase64(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ----------------------------------------------------
  // Veo Video Generation (Text or Photo)
  // Model: veo-3.1-fast-generate-preview
  // ----------------------------------------------------
  const handleStartVideoGeneration = async () => {
    if (activeTab === 'text_to_video' && !prompt.trim()) {
      return;
    }
    if (activeTab === 'image_to_video' && !selectedPhotoBase64) {
      return;
    }

    setIsGeneratingVideo(true);
    setPollingStatusText('Sending synthesis request to Veo 3.1 Fast...');

    try {
      const payload: any = {
        aspectRatio,
        prompt: prompt.trim() || undefined,
      };

      if (activeTab === 'image_to_video' && selectedPhotoBase64) {
        payload.imageBase64 = selectedPhotoBase64;
        payload.mimeType = photoMimeType;
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
        hasImage: Boolean(selectedPhotoBase64),
        imagePreview: selectedPhotoBase64 || undefined,
        aspectRatio,
        operationName: data.operationName,
        status: 'rendering',
        statusMessage: 'Synthesizing 720p video frames with Veo 3.1...',
        createdAt: Date.now(),
      };

      setCurrentGeneration(newGenItem);
      setVideoGenerations((prev) => [newGenItem, ...prev]);

      startPollingOperation(data.operationName, newGenItem.id);
    } catch (err: any) {
      console.error('Error generating video:', err);
      setIsGeneratingVideo(false);
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
          setIsGeneratingVideo(false);

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
          setIsGeneratingVideo(false);
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
    setVideoGenerations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status, videoUrl, error } : item
      )
    );
    setCurrentGeneration((prev) =>
      prev && prev.id === id ? { ...prev, status, videoUrl, error } : prev
    );
  };

  // ----------------------------------------------------
  // Gemini AI Image Creation & Editing
  // Model: gemini-3.1-flash-image-preview
  // ----------------------------------------------------
  const handleGenerateOrCreateImage = async () => {
    if (!prompt.trim()) return;

    if (activeTab === 'edit_image' && !editSourceImageBase64) {
      alert('Please upload an image to edit or select one from your gallery.');
      return;
    }

    setIsGeneratingImage(true);
    setImageError(null);
    setTransferNotice(null);

    try {
      const isEditing = activeTab === 'edit_image';
      const payload: any = {
        prompt: prompt.trim(),
        aspectRatio: isEditing ? '1:1' : imageAspectRatio,
      };

      if (isEditing && editSourceImageBase64) {
        payload.referenceImageBase64 = editSourceImageBase64;
      }

      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate or edit image');
      }

      const item: ImageGenerationItem = {
        id: 'img_' + Date.now(),
        prompt: prompt.trim(),
        imageUrl: data.imageUrl,
        sourceImageUrl: isEditing ? editSourceImageBase64 || undefined : undefined,
        isEdit: isEditing,
        aspectRatio: data.aspectRatio || imageAspectRatio,
        model: data.model || 'gemini-3.1-flash-image-preview',
        createdAt: Date.now(),
      };

      setCurrentImage(item);
      setImageHistory((prev) => [item, ...prev]);
    } catch (err: any) {
      console.error('Image generation/edit error:', err);
      setImageError(err.message || 'Image generation failed');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // One-click actions
  const handleSendToAnimate = (img: ImageGenerationItem) => {
    setSelectedPhotoBase64(img.imageUrl);
    setPhotoFileName(`image-${img.id}.png`);
    setPhotoMimeType('image/png');
    setActiveTab('image_to_video');
    setPrompt('Animate with subtle realistic motion, gentle camera drifting, and natural lighting shifts');
    setAspectRatio(img.aspectRatio === '9:16' ? '9:16' : '16:9');
    setTransferNotice('Image loaded into Animate Photo mode! Click "Animate Photo into Video" when ready.');
    setTimeout(() => setTransferNotice(null), 5000);
  };

  const handleSendToEdit = (img: ImageGenerationItem) => {
    setEditSourceImageBase64(img.imageUrl);
    setEditSourceFileName(`edit-source-${img.id}.png`);
    setActiveTab('edit_image');
    setPrompt('');
    setTransferNotice('Image loaded into Edit Image mode! Type your instructions to modify it.');
    setTimeout(() => setTransferNotice(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative flex h-[94vh] max-h-[880px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0b0e14] shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-[#10141f]/95">
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
                  gemini-3.1-flash-image-preview & veo-3.1-fast-generate-preview
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Text prompts to create or edit images with Gemini, plus text-to-video and photo-to-video with Veo 3.1
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
            {/* 4 Creation Tabs */}
            <div className="grid grid-cols-4 rounded-xl border border-white/10 bg-black/60 p-1 font-mono text-xs">
              <button
                onClick={() => {
                  setActiveTab('create_image');
                  setPrompt('');
                }}
                className={`flex items-center justify-center gap-1 rounded-lg py-2 transition-all ${
                  activeTab === 'create_image'
                    ? 'bg-[#d4af37] text-black font-semibold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Create images with gemini-3.1-flash-image-preview"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Create Image</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('edit_image');
                  setPrompt('');
                }}
                className={`flex items-center justify-center gap-1 rounded-lg py-2 transition-all ${
                  activeTab === 'edit_image'
                    ? 'bg-[#d4af37] text-black font-semibold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Edit images with gemini-3.1-flash-image-preview"
              >
                <Wand2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Edit Image</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('text_to_video');
                  setPrompt('');
                }}
                className={`flex items-center justify-center gap-1 rounded-lg py-2 transition-all ${
                  activeTab === 'text_to_video'
                    ? 'bg-[#d4af37] text-black font-semibold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Generate video from text with veo-3.1-fast-generate-preview"
              >
                <Video className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Text to Video</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('image_to_video');
                  setPrompt('');
                }}
                className={`flex items-center justify-center gap-1 rounded-lg py-2 transition-all ${
                  activeTab === 'image_to_video'
                    ? 'bg-[#d4af37] text-black font-semibold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Photo-to-video capabilities with veo-3.1-fast-generate-preview"
              >
                <Film className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Animate Photo</span>
              </button>
            </div>

            {/* Notification Banner when item was transferred */}
            {transferNotice && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 animate-in fade-in duration-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{transferNotice}</span>
              </div>
            )}

            {/* Tab: Edit Image Uploader */}
            {activeTab === 'edit_image' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-medium text-neutral-300">
                    Source Image to Edit:
                  </label>
                  {editSourceImageBase64 && (
                    <span className="text-[10px] font-mono text-emerald-400">Source image ready</span>
                  )}
                </div>

                {editSourceImageBase64 ? (
                  <div className="relative rounded-xl border border-white/15 bg-black/40 p-2 overflow-hidden group">
                    <img
                      src={editSourceImageBase64}
                      alt="Source for editing"
                      className="h-36 w-full rounded-lg object-contain bg-black/60"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => editImageInputRef.current?.click()}
                        className="rounded-lg bg-white/20 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-white/30"
                      >
                        Change Image
                      </button>
                      <button
                        onClick={() => {
                          setEditSourceImageBase64(null);
                          setEditSourceFileName(null);
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
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) handleEditSourceUpload(e.dataTransfer.files[0]);
                    }}
                    onClick={() => editImageInputRef.current?.click()}
                    className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-4 text-center transition-all hover:border-[#d4af37]/60 hover:bg-[#d4af37]/5"
                  >
                    <Upload className="h-7 w-7 text-[#d4af37] mb-1.5" />
                    <p className="text-xs font-medium text-neutral-200">
                      Upload image to edit, or drag & drop here
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Or generate an image in "Create Image" and click "Edit This Image"
                    </p>
                  </div>
                )}

                <input
                  ref={editImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleEditSourceUpload(e.target.files[0]);
                  }}
                />
              </div>
            )}

            {/* Tab: Animate Photo Uploader */}
            {activeTab === 'image_to_video' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-medium text-neutral-300">
                    Still Photo to Animate into Video:
                  </label>
                  {selectedPhotoBase64 && (
                    <span className="text-[10px] font-mono text-emerald-400">Photo ready</span>
                  )}
                </div>

                {selectedPhotoBase64 ? (
                  <div className="relative rounded-xl border border-white/15 bg-black/40 p-2 overflow-hidden group">
                    <img
                      src={selectedPhotoBase64}
                      alt="Upload preview"
                      className="h-36 w-full rounded-lg object-contain bg-black/60"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        className="rounded-lg bg-white/20 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-white/30"
                      >
                        Change Photo
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPhotoBase64(null);
                          setPhotoFileName(null);
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
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) handlePhotoUpload(e.dataTransfer.files[0]);
                    }}
                    onClick={() => photoInputRef.current?.click()}
                    className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-4 text-center transition-all hover:border-[#d4af37]/60 hover:bg-[#d4af37]/5"
                  >
                    <Upload className="h-7 w-7 text-[#d4af37] mb-1.5" />
                    <p className="text-xs font-medium text-neutral-200">
                      Drop photo here or click to browse
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Veo 3.1 will synthesize realistic camera optics & fluid physical motion
                    </p>
                  </div>
                )}

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
                  }}
                />
              </div>
            )}

            {/* Prompt Input Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-medium text-neutral-300">
                  {activeTab === 'create_image'
                    ? 'AI Image Prompt:'
                    : activeTab === 'edit_image'
                    ? 'Edit Instructions (Text Prompt):'
                    : activeTab === 'text_to_video'
                    ? 'Cinematic Video Prompt:'
                    : 'Motion & Camera Directives (Optional):'}
                </label>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {activeTab === 'create_image' || activeTab === 'edit_image'
                    ? 'gemini-3.1-flash-image-preview'
                    : 'veo-3.1-fast-generate-preview'}
                </span>
              </div>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  activeTab === 'create_image'
                    ? 'Describe subject, art medium, composition, lighting, environment...'
                    : activeTab === 'edit_image'
                    ? 'Describe what to add, remove, recolor, transform, or stylize in the image...'
                    : activeTab === 'text_to_video'
                    ? 'Describe scene, camera trajectory, lighting dynamics, and atmosphere...'
                    : 'e.g. slow cinematic pan, gentle breeze in hair, glowing evening sunset shifts...'
                }
                className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-xs leading-relaxed text-neutral-100 placeholder:text-neutral-500 focus:border-[#d4af37]/60 focus:outline-none"
              />
            </div>

            {/* Aspect Ratio Selector */}
            {activeTab === 'create_image' ? (
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
            ) : activeTab === 'text_to_video' || activeTab === 'image_to_video' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-neutral-300">
                  Video Aspect Ratio (Veo 3.1):
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
            ) : null}

            {/* Preset Inspiration Ideas */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono text-neutral-400">
                Prompt Inspiration:
              </label>
              <div className="flex flex-col gap-1.5">
                {(activeTab === 'create_image'
                  ? PRESET_CREATE_IMAGE_PROMPTS
                  : activeTab === 'edit_image'
                  ? PRESET_EDIT_IMAGE_PROMPTS
                  : PRESET_VIDEO_PROMPTS
                ).map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(p)}
                    className="truncate rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-left text-[11px] text-neutral-400 transition-colors hover:border-white/15 hover:text-neutral-200"
                  >
                    "{p}"
                  </button>
                ))}
              </div>
            </div>

            {/* Action Execution Button */}
            <div className="pt-2">
              {activeTab === 'create_image' || activeTab === 'edit_image' ? (
                <button
                  onClick={handleGenerateOrCreateImage}
                  disabled={
                    isGeneratingImage ||
                    !prompt.trim() ||
                    (activeTab === 'edit_image' && !editSourceImageBase64)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] py-3 text-xs font-bold text-black shadow-lg transition-all hover:bg-[#e2bd4e] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {activeTab === 'edit_image'
                          ? 'Synthesizing Edited Image...'
                          : 'Synthesizing Image with Gemini...'}
                      </span>
                    </>
                  ) : (
                    <>
                      {activeTab === 'edit_image' ? (
                        <Wand2 className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span>
                        {activeTab === 'edit_image'
                          ? 'Apply Edits with gemini-3.1-flash-image-preview'
                          : 'Create Image with gemini-3.1-flash-image-preview'}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleStartVideoGeneration}
                  disabled={
                    isGeneratingVideo ||
                    (activeTab === 'text_to_video' && !prompt.trim()) ||
                    (activeTab === 'image_to_video' && !selectedPhotoBase64)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] py-3 text-xs font-bold text-black shadow-lg transition-all hover:bg-[#e2bd4e] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Video with Veo 3.1...</span>
                    </>
                  ) : (
                    <>
                      <Film className="h-4 w-4" />
                      <span>
                        {activeTab === 'image_to_video'
                          ? 'Animate Photo into Video (veo-3.1-fast-generate-preview)'
                          : 'Generate Video with veo-3.1-fast-generate-preview'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Panel: Output Stage */}
          <div className="flex flex-1 flex-col overflow-y-auto p-5 space-y-4 bg-[#080b10]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-neutral-300">
                {activeTab === 'create_image' || activeTab === 'edit_image'
                  ? 'Visual Canvas (gemini-3.1-flash-image-preview)'
                  : 'Synthesized Video Output (veo-3.1-fast-generate-preview)'}
              </span>

              {/* Action Buttons for Output */}
              <div className="flex items-center gap-2">
                {(activeTab === 'create_image' || activeTab === 'edit_image') && currentImage?.imageUrl && (
                  <>
                    {currentImage.isEdit && currentImage.sourceImageUrl && (
                      <button
                        onClick={() => setCompareWithOriginal(!compareWithOriginal)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-mono transition-colors ${
                          compareWithOriginal
                            ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                            : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                        title="Toggle Before/After comparison"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{compareWithOriginal ? 'Show Edited' : 'Compare Original'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSendToEdit(currentImage)}
                      className="flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/15 px-2 py-1 text-xs font-medium text-purple-300 hover:bg-purple-500/25 transition-colors"
                      title="Edit this image with gemini-3.1-flash-image-preview"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleSendToAnimate(currentImage)}
                      className="flex items-center gap-1 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/15 px-2 py-1 text-xs font-medium text-[#f3cf65] hover:bg-[#d4af37]/25 transition-colors"
                      title="Animate this image into video with Veo 3.1"
                    >
                      <Film className="h-3.5 w-3.5" />
                      <span>Animate</span>
                    </button>

                    <a
                      href={currentImage.imageUrl}
                      download={`berno-${currentImage.isEdit ? 'edited' : 'image'}-${currentImage.id}.png`}
                      className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-neutral-200 hover:bg-white/20 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                  </>
                )}

                {activeTab !== 'create_image' && activeTab !== 'edit_image' && currentGeneration?.videoUrl && (
                  <a
                    href={currentGeneration.videoUrl}
                    download="veo31-generation.mp4"
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
              {activeTab === 'create_image' || activeTab === 'edit_image' ? (
                /* Image Output Area */
                isGeneratingImage ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37]">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-serif text-sm font-semibold text-neutral-100">
                        {activeTab === 'edit_image'
                          ? 'Applying Edits with Gemini Vision'
                          : 'Synthesizing Image with Gemini'}
                      </p>
                      <p className="font-mono text-xs text-[#d4af37] animate-pulse">
                        Model: gemini-3.1-flash-image-preview
                      </p>
                    </div>
                  </div>
                ) : currentImage?.imageUrl ? (
                  <div className="relative h-full w-full p-2 flex items-center justify-center">
                    {compareWithOriginal && currentImage.sourceImageUrl ? (
                      <div className="relative h-full w-full flex flex-col items-center justify-center">
                        <img
                          src={currentImage.sourceImageUrl}
                          alt="Original Source"
                          className="max-h-full max-w-full rounded-xl object-contain"
                        />
                        <span className="absolute top-3 left-3 rounded bg-black/75 px-2 py-0.5 font-mono text-[10px] text-cyan-300 border border-cyan-500/30">
                          Original Reference
                        </span>
                      </div>
                    ) : (
                      <div className="relative h-full w-full flex items-center justify-center">
                        <img
                          src={currentImage.imageUrl}
                          alt={currentImage.prompt}
                          className="max-h-full max-w-full rounded-xl object-contain"
                        />
                        {currentImage.isEdit && (
                          <span className="absolute top-3 left-3 rounded bg-black/75 px-2 py-0.5 font-mono text-[10px] text-[#f3cf65] border border-[#d4af37]/30">
                            Edited with gemini-3.1-flash-image-preview
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : imageError ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-red-400 space-y-2">
                    <AlertCircle className="h-8 w-8" />
                    <p className="text-xs font-semibold">Image Operation Failed</p>
                    <p className="text-[11px] text-neutral-400 max-w-sm">{imageError}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-2">
                    <ImageIcon className="h-10 w-10 text-neutral-700" />
                    <p className="text-xs font-medium text-neutral-400">
                      {activeTab === 'edit_image'
                        ? 'Upload or choose an image on the left to edit'
                        : 'No image generated yet'}
                    </p>
                    <p className="text-[11px] text-neutral-600 max-w-xs">
                      {activeTab === 'edit_image'
                        ? 'Provide prompt instructions to modify colors, objects, environment, or style.'
                        : 'Enter an artistic description on the left and click Create Image.'}
                    </p>
                  </div>
                )
              ) : (
                /* Video Output Area */
                isGeneratingVideo ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37]">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-serif text-sm font-semibold text-neutral-100">
                        Veo 3.1 Fast Neural Synthesis
                      </p>
                      <p className="font-mono text-xs text-[#d4af37] animate-pulse">
                        {pollingStatusText}
                      </p>
                      <p className="text-[11px] text-neutral-500 pt-2 font-mono">
                        Model: veo-3.1-fast-generate-preview ({aspectRatio})
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
                      Enter a prompt or upload a still photo on the left, then click Generate Video.
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Item Details */}
            {(activeTab === 'create_image' || activeTab === 'edit_image') && currentImage && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>Model: gemini-3.1-flash-image-preview</span>
                  <span>Type: {currentImage.isEdit ? 'AI Edited' : 'Original Creation'}</span>
                  <span>Aspect: {currentImage.aspectRatio}</span>
                </div>
                <p className="text-neutral-200 line-clamp-2">
                  <span className="text-neutral-500 font-mono">Prompt:</span> {currentImage.prompt}
                </p>
              </div>
            )}

            {activeTab !== 'create_image' && activeTab !== 'edit_image' && currentGeneration && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>Model: veo-3.1-fast-generate-preview</span>
                  <span>Resolution: 720p</span>
                  <span>Aspect: {currentGeneration.aspectRatio}</span>
                </div>
                <p className="text-neutral-200 line-clamp-2">
                  <span className="text-neutral-500 font-mono">Prompt:</span> {currentGeneration.prompt}
                </p>
              </div>
            )}

            {/* Session Gallery */}
            {imageHistory.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-neutral-400">
                    Session Images ({imageHistory.length})
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Click to inspect, edit, or animate
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {imageHistory.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => {
                        setCurrentImage(img);
                        if (img.isEdit) {
                          setActiveTab('edit_image');
                        } else {
                          setActiveTab('create_image');
                        }
                      }}
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
                      {img.isEdit && (
                        <span className="absolute top-1 left-1 rounded bg-black/80 px-1 py-0.2 font-mono text-[8px] text-purple-300">
                          Edit
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendToEdit(img);
                          }}
                          className="rounded bg-purple-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow"
                          title="Edit this image"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendToAnimate(img);
                          }}
                          className="rounded bg-[#d4af37] px-1.5 py-0.5 text-[9px] font-bold text-black shadow"
                          title="Animate into video"
                        >
                          Animate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {videoGenerations.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="font-mono text-[11px] text-neutral-400">
                  Session Videos ({videoGenerations.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {videoGenerations.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        setCurrentGeneration(g);
                        if (g.hasImage) {
                          setActiveTab('image_to_video');
                        } else {
                          setActiveTab('text_to_video');
                        }
                      }}
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
                        {g.status === 'rendering' && (
                          <Loader2 className="h-3 w-3 animate-spin text-[#d4af37]" />
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
