import React, { useState, useRef, useEffect } from 'react';
import { ThinkingMode, ChatbotRole } from '../types';
import { THINKING_MODES } from '../utils/constants';
import { CHATBOT_ROLES } from '../utils/chatbotRoles';
import {
  ArrowUp,
  Square,
  Wand2,
  Sparkles,
  ChevronDown,
  Globe,
  Radio,
  Film,
  Bot,
  Camera,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';

interface ChatInputProps {
  onSend: (text: string, mode: ThinkingMode, attachedImage?: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  selectedMode: ThinkingMode;
  onSelectMode: (mode: ThinkingMode) => void;
  researchMode: boolean;
  onToggleResearchMode: (enabled: boolean) => void;
  chatbotRole: ChatbotRole;
  onChangeChatbotRole: (role: ChatbotRole) => void;
  onOpenVoice: () => void;
  onOpenStudio?: () => void;
  selectedModel: string;
  readabilityMode?: boolean;
  readingIndicatorNode?: React.ReactNode;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  selectedMode,
  onSelectMode,
  researchMode,
  onToggleResearchMode,
  chatbotRole,
  onChangeChatbotRole,
  onOpenVoice,
  onOpenStudio,
  selectedModel,
  readabilityMode = false,
  readingIndicatorNode,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isSharpening, setIsSharpening] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeModeConfig =
    THINKING_MODES.find((m) => m.id === selectedMode) || THINKING_MODES[0];
  const activeRoleConfig =
    CHATBOT_ROLES[chatbotRole] || CHATBOT_ROLES.epistemic_architect;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        220
      )}px`;
    }
  }, [input]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowModeMenu(false);
      }
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node)
      ) {
        setShowRoleMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!input.trim() && !attachedImage) || isStreaming) return;
    onSend(input.trim(), selectedMode, attachedImage || undefined);
    setInput('');
    setAttachedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSharpen = async () => {
    if (!input.trim() || isSharpening) return;
    setIsSharpening(true);
    try {
      const res = await fetch('/api/sharpen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input.trim() }),
      });
      const data = await res.json();
      if (data.sharpened) {
        setInput(data.sharpened);
      }
    } catch (e) {
      console.error('Sharpen failed', e);
    } finally {
      setIsSharpening(false);
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="relative border-t border-white/10 bg-[#07080c] px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-[#0e1017] shadow-2xl transition-all focus-within:border-[#d4af37]/50 focus-within:shadow-[0_0_25px_rgba(212,175,55,0.15)]">
        {/* Top Control Bar: Mode, Persona, Media tools, Studio */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-3.5 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Thinking Mode Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowModeMenu(!showModeMenu)}
                className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-mono transition-all hover:bg-white/5"
                style={{
                  borderColor: `${activeModeConfig.accentColor}40`,
                  backgroundColor: `${activeModeConfig.accentColor}10`,
                  color: activeModeConfig.accentColor,
                }}
              >
                <span className="font-semibold">{activeModeConfig.name}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {showModeMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-white/10 bg-[#12151f] p-1.5 shadow-2xl backdrop-blur-xl z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1 text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                    Cognitive Reasoning Modes
                  </div>
                  {THINKING_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelectMode(m.id);
                        setShowModeMenu(false);
                      }}
                      className={`flex w-full flex-col rounded-lg p-2 text-left transition-all ${
                        selectedMode === m.id
                          ? 'bg-white/10 text-white'
                          : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold" style={{ color: m.accentColor }}>
                          {m.name}
                        </span>
                        <span className="text-[10px] opacity-60 font-mono">{m.tagline}</span>
                      </div>
                      <span className="text-[11px] text-neutral-400 mt-0.5">{m.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Persona Selector */}
            <div className="relative" ref={roleDropdownRef}>
              <button
                type="button"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-mono text-neutral-300 transition-all hover:bg-white/10 hover:text-white"
              >
                <Bot className="h-3 w-3 text-[#d4af37]" />
                <span className="font-medium">{activeRoleConfig.badge}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {showRoleMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-80 rounded-xl border border-white/10 bg-[#12151f] p-1.5 shadow-2xl backdrop-blur-xl z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1 text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                    Select Specialist Persona
                  </div>
                  {Object.values(CHATBOT_ROLES).map((role) => (
                    <button
                      key={role.id}
                      onClick={() => {
                        onChangeChatbotRole(role.id);
                        setShowRoleMenu(false);
                      }}
                      className={`flex w-full flex-col rounded-lg p-2 text-left transition-all ${
                        chatbotRole === role.id
                          ? 'bg-[#d4af37]/20 border border-[#d4af37]/30 text-white'
                          : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-xs font-semibold text-[#f3cf65]">
                          {role.title}
                        </span>
                        <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-mono text-neutral-300">
                          {role.badge}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 mt-0.5">{role.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Take Photo Camera Button */}
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-mono text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
              title="Take Photo with Camera"
            >
              <Camera className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="hidden sm:inline">Camera</span>
            </button>

            {/* Gallery Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-mono text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
              title="Upload Photo from Gallery"
            >
              <ImageIcon className="h-3.5 w-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGalleryUpload}
            />

            {/* Research Mode Toggle */}
            <button
              type="button"
              onClick={() => onToggleResearchMode(!researchMode)}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-mono transition-all ${
                researchMode
                  ? 'border-[#3b82f6]/50 bg-[#1e3a8a]/30 text-[#93c5fd] shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                  : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:text-neutral-200'
              }`}
              title="Toggle Research Mode: grounds responses in real-time Google Search"
            >
              <Globe
                className={`h-3 w-3 ${
                  researchMode ? 'text-[#60a5fa] animate-pulse' : 'text-neutral-400'
                }`}
              />
              <span className="font-medium hidden sm:inline">Research</span>
            </button>

            {/* Prompt Sharpening Tool */}
            <button
              onClick={handleSharpen}
              disabled={!input.trim() || isSharpening || isStreaming}
              title="Transform inquiry into a high-depth, rigorous prompt"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-mono text-neutral-400 transition-all hover:bg-[#d4af37]/10 hover:text-[#e5b974] disabled:opacity-30 disabled:pointer-events-none"
            >
              {isSharpening ? (
                <>
                  <Sparkles className="h-3 w-3 animate-spin text-[#d4af37]" />
                  <span>Sharpening...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3 text-[#d4af37]" />
                  <span className="hidden sm:inline">Sharpen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Attached Photo Preview Thumbnail */}
        {attachedImage && (
          <div className="flex items-center gap-3 border-b border-white/5 bg-black/40 px-3.5 py-2 animate-in fade-in duration-150">
            <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-[#d4af37]/40 shadow-md">
              <img
                src={attachedImage}
                alt="Attached"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="absolute top-0.5 right-0.5 rounded-full bg-black/75 p-0.5 text-neutral-300 hover:text-white"
                title="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="text-xs">
              <p className="font-mono text-neutral-200 font-medium">Image attached to inquiry</p>
              <p className="text-[11px] text-neutral-500 font-mono">Berno will analyze visual features with infinite IQ</p>
            </div>
          </div>
        )}

        {/* Input Textarea Area */}
        <div className="flex items-end gap-3 p-3.5 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              researchMode
                ? 'Ask Berno with real-time Google Search grounding...'
                : `Ask Berno (${activeRoleConfig.title})...`
            }
            className="max-h-48 min-h-[48px] w-full resize-none bg-transparent px-2 py-1 text-[15px] leading-relaxed text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
          />

          {/* Send Button Column */}
          <div className="shrink-0 pb-1 flex items-center">

            {isStreaming ? (
              <button
                onClick={onStop}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 transition-all hover:bg-red-500/30"
                title="Stop generation"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim() && !attachedImage}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37] text-neutral-950 font-bold shadow-lg transition-all hover:bg-[#e2bd4e] hover:scale-105 active:scale-95 disabled:opacity-20 disabled:pointer-events-none disabled:hover:scale-100"
                title="Send inquiry"
              >
                <ArrowUp className="h-5 w-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Smart Query Elevation Suggestion */}
        {input.trim().length > 3 && input.trim().length < 80 && !isStreaming && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-white/[0.015] px-3.5 py-1.5 text-xs animate-in fade-in duration-200">
            <span className="flex items-center gap-1.5 text-neutral-400 font-mono text-[11px]">
              <Sparkles className="h-3 w-3 text-[#d4af37]" />
              <span>Elevate inquiry into an analytical architectural prompt:</span>
            </span>
            <button
              type="button"
              onClick={handleSharpen}
              disabled={isSharpening}
              className="flex items-center gap-1 rounded-md bg-[#d4af37]/15 border border-[#d4af37]/30 px-2 py-0.5 font-mono text-[11px] font-medium text-[#f3e7cb] hover:bg-[#d4af37]/25 transition-all shadow-sm"
              title="Transform this prompt using Berno Query Architect"
            >
              {isSharpening ? (
                <>
                  <Sparkles className="h-3 w-3 animate-spin text-[#d4af37]" />
                  <span>Sharpening...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3 text-[#d4af37]" />
                  <span>Sharpen Inquiry</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-2 text-[11px] font-mono text-neutral-500">
        <div className="flex items-center gap-2">
          <span>Berno Infinite IQ Titan</span>
          <span>•</span>
          <span className="text-[#d4af37]/80">Reasoning Budget: 8,192 tokens</span>
          <span>•</span>
          <span className="text-neutral-400">{activeRoleConfig.title}</span>
        </div>
        <span>Enter to dispatch • Shift + Enter for newline</span>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCaptureAndSend={(base64Image) => {
          setAttachedImage(base64Image);
        }}
      />
    </div>
  );
}
