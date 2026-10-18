import React, { useState, useRef, useEffect } from 'react';
import { Camera, RotateCcw, Send, X, AlertCircle } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureAndSend: (base64Image: string) => void;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCaptureAndSend,
}: CameraCaptureModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);
    setCapturedImage(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Could not connect to camera device. Please check your camera connection.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleSend = () => {
    if (capturedImage) {
      onCaptureAndSend(capturedImage);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl border border-[#d4af37]/35 bg-[#0c0e14] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-[#12151e]">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-[#d4af37]" />
            <h3 className="font-serif text-sm font-semibold text-white tracking-wide">
              Take Photo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-neutral-400 max-w-sm">
              <AlertCircle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <p className="text-xs leading-relaxed">{error}</p>
              <button
                onClick={startCamera}
                className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition-colors"
              >
                Retry Camera
              </button>
            </div>
          ) : capturedImage ? (
            // Captured Still Image
            <img
              src={capturedImage}
              alt="Captured"
              className="h-full w-full object-cover"
            />
          ) : (
            // Live Video Stream
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover -scale-x-100"
            />
          )}

          {/* Hidden Canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay Buttons when photo is captured: Retake & Send */}
          {capturedImage && (
            <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-4 z-20">
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/75 px-5 py-2.5 text-xs font-mono text-white backdrop-blur-md shadow-lg hover:bg-black/90 active:scale-95 transition-all"
              >
                <RotateCcw className="h-4 w-4 text-[#d4af37]" />
                <span>Retake</span>
              </button>

              <button
                onClick={handleSend}
                className="flex items-center gap-2 rounded-xl bg-[#d4af37] px-6 py-2.5 text-xs font-mono font-bold text-neutral-950 shadow-lg hover:bg-[#e5be49] active:scale-95 transition-all"
              >
                <Send className="h-4 w-4 fill-current" />
                <span>Send</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer controls when live stream is active */}
        {!capturedImage && !error && (
          <div className="flex items-center justify-center p-4 bg-[#0a0c10] border-t border-white/5">
            <button
              onClick={handleCapture}
              className="group flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#d4af37] bg-[#d4af37]/20 shadow-lg hover:bg-[#d4af37]/35 active:scale-95 transition-all"
              title="Capture Photo"
            >
              <div className="h-10 w-10 rounded-full bg-[#d4af37] group-hover:scale-95 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
