import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string, mode: ThinkingMode) => void;
  onStop: () => void;
  isStreaming: boolean;
  selectedMode: ThinkingMode;
  onSelectMode: (mode: ThinkingMode) => void;
  researchMode: boolean;
  onToggleResearchMode: (enabled: boolean) => void;
  chatbotRole: ChatbotRole;
  onChangeChatbotRole: (role: ChatbotRole) => void;
  onOpenVoice: () => void;
  onOpenVeo: () => void;
  selectedModel: string;
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
  onOpenVeo,
  selectedModel,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isSharpening, setIsSharpening] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

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
    if (!input.trim() || isStreaming) return;
    onSend(input.trim(), selectedMode);
    setInput('');
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
      console.error('Failed to sharpen inquiry', e);
    } finally {
      setIsSharpening(false);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-3 sm:px-4 pb-6 pt-2">
      <div className="relative rounded-2xl border border-white/15 bg-[#12151c]/90 shadow-2xl backdrop-blur-md transition-all focus-within:border-[#d4af37]/60 focus-within:ring-1 focus-within:ring-[#d4af37]/30">
        {/* Top Control Bar: Thinking Stance & Chatbot Persona */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/5 px-3 sm:px-4 py-2 text-xs gap-2">
          {/* Mode & Persona Selectors */}
          <div className="flex items-center gap-2">
            {/* Thinking Stance Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowModeMenu(!showModeMenu)}
                className="flex items-center gap-1.5 sm:gap-2 rounded-lg px-2 py-1 font-medium transition-colors hover:bg-white/5"
                style={{ color: activeModeConfig.accentColor }}
                title="Select cognitive reasoning stance"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: activeModeConfig.accentColor }}
                />
                <span className="font-mono text-xs">{activeModeConfig.name}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {showModeMenu && (
                <div className="absolute left-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#0d1016] p-1.5 shadow-2xl backdrop-blur-xl">
                  <div className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                    Cognitive Stance
                  </div>
                  {THINKING_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => {
                        onSelectMode(mode.id);
                        setShowModeMenu(false);
                      }}
                      className={`flex w-full flex-col rounded-lg p-2.5 text-left transition-all ${
                        selectedMode === mode.id
                          ? 'bg-white/10 text-white'
                          : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: mode.accentColor }}
                        />
                        <span style={{ color: mode.accentColor }}>
                          {mode.name}
                        </span>
                      </div>
                      <span className="mt-1 text-[11px] text-neutral-400">
                        {mode.tagline}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chatbot Persona Dropdown */}
            <div className="relative" ref={roleDropdownRef}>
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1 text-xs font-mono text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
                title="Select Gemini Persona Role"
              >
                <Bot className="h-3 w-3 text-[#d4af37]" />
                <span className="max-w-[120px] truncate">{activeRoleConfig.title}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>

              {showRoleMenu && (
                <div className="absolute left-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#0d1016] p-1.5 shadow-2xl backdrop-blur-xl">
                  <div className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                    Chatbot Persona Role
                  </div>
                  {Object.values(CHATBOT_ROLES).map((role) => (
                    <button
                      key={role.id}
                      onClick={() => {
                        onChangeChatbotRole(role.id);
                        setShowRoleMenu(false);
                      }}
                      className={`flex w-full flex-col rounded-lg p-2.5 text-left transition-all ${
                        chatbotRole === role.id
                          ? 'bg-white/10 text-[#d4af37]'
                          : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="font-semibold text-xs">{role.title}</span>
                      <span className="mt-0.5 text-[11px] text-neutral-400">
                        {role.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions: Research Mode, Live Voice, Veo Video, Sharpen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Live Voice Shortcut */}
            <button
              type="button"
              onClick={onOpenVoice}
              className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[11px] font-mono text-emerald-400 hover:bg-emerald-500/15 transition-all"
              title="Open Gemini Live Voice (gemini-3.8-live)"
            >
              <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
              <span className="hidden sm:inline">Voice</span>
            </button>

            {/* Veo Video Shortcut */}
            <button
              type="button"
              onClick={onOpenVeo}
              className="flex items-center gap-1 rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/5 px-2 py-1 text-[11px] font-mono text-[#e0bd60] hover:bg-[#d4af37]/15 transition-all"
              title="Open Veo 3 Video Studio (veo-3.1-fast-generate-preview)"
            >
              <Film className="h-3 w-3 text-[#d4af37]" />
              <span className="hidden sm:inline">Veo</span>
            </button>

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

        {/* Input Textarea Area */}
        <div className="flex items-end gap-3 p-3.5">
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

          <div className="shrink-0 pb-1">
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
                disabled={!input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37] text-neutral-950 font-bold shadow-lg transition-all hover:bg-[#e2bd4e] hover:scale-105 active:scale-95 disabled:opacity-20 disabled:pointer-events-none disabled:hover:scale-100"
                title="Send inquiry"
              >
                <ArrowUp className="h-5 w-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between px-2 text-[11px] font-mono text-neutral-500">
        <span>Berno AI • Model: {selectedModel} • Role: {activeRoleConfig.title}</span>
        <span>Enter to dispatch • Shift + Enter for newline</span>
      </div>
    </div>
  );
}

