import { useState, useRef, useEffect } from 'react';
import { ThinkingMode, ChatbotRole } from '../types';
import { THINKING_MODES } from '../utils/constants';
import { CHATBOT_ROLES, AVAILABLE_MODELS } from '../utils/chatbotRoles';
import {
  Menu,
  Plus,
  Download,
  Info,
  Radio,
  Film,
  FileText,
  Code,
  Save,
  Check,
  Loader2,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onOpenAbout: () => void;
  onExport?: () => void;
  onExportMarkdown?: () => void;
  onExportPdf?: () => void;
  onExportJson?: () => void;
  onSaveChat?: () => void;
  isExportingPdf?: boolean;
  isChatSaved?: boolean;
  hasActiveConversation?: boolean;
  onOpenVoice: () => void;
  onOpenVeo: () => void;
  currentMode: ThinkingMode;
  selectedModel: string;
  onChangeModel: (model: string) => void;
  chatbotRole: ChatbotRole;
  onChangeChatbotRole: (role: ChatbotRole) => void;
}

export function Header({
  onToggleSidebar,
  onNewChat,
  onOpenAbout,
  onExport,
  onExportMarkdown,
  onExportPdf,
  onExportJson,
  onSaveChat,
  isExportingPdf = false,
  isChatSaved = false,
  hasActiveConversation = true,
  onOpenVoice,
  onOpenVeo,
  currentMode,
  selectedModel,
  onChangeModel,
  chatbotRole,
  onChangeChatbotRole,
}: HeaderProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const modeConfig =
    THINKING_MODES.find((m) => m.id === currentMode) || THINKING_MODES[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(e.target as Node)
      ) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManualSave = () => {
    onSaveChat?.();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handlePdfClick = () => {
    setIsExportMenuOpen(false);
    onExportPdf?.();
  };

  const handleMarkdownClick = () => {
    setIsExportMenuOpen(false);
    if (onExportMarkdown) {
      onExportMarkdown();
    } else if (onExport) {
      onExport();
    }
  };

  const handleJsonClick = () => {
    setIsExportMenuOpen(false);
    onExportJson?.();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-white/10 bg-[#090b0e]/95 px-3 sm:px-4 backdrop-blur-md">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
          title="Toggle Navigation (Ctrl+Shift+S)"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-bold tracking-wide text-neutral-100">
            Berno
          </span>
          <span className="hidden sm:inline-block h-3.5 w-[1px] bg-white/15" />
          <span
            className="hidden sm:inline-block font-mono text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${modeConfig.accentColor}15`,
              color: modeConfig.accentColor,
            }}
          >
            {modeConfig.name}
          </span>
        </div>
      </div>

      {/* Center/Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Gemini Chatbot Role Selector */}
        <div className="hidden lg:flex items-center gap-1">
          <select
            value={chatbotRole}
            onChange={(e) => onChangeChatbotRole(e.target.value as ChatbotRole)}
            className="rounded-lg border border-white/10 bg-[#12151d] px-2 py-1 text-[11px] font-mono text-neutral-300 focus:outline-none focus:border-[#d4af37]"
            title="Chatbot System Persona"
          >
            {Object.values(CHATBOT_ROLES).map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>

        {/* Gemini Model Selector */}
        <div className="flex items-center gap-1">
          <select
            value={selectedModel}
            onChange={(e) => onChangeModel(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#12151d] px-2 py-1 text-[11px] font-mono text-[#d4af37] focus:outline-none focus:border-[#d4af37]"
            title="Select AI Model"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.badge})
              </option>
            ))}
          </select>
        </div>

        {/* Live Voice Button */}
        <button
          onClick={onOpenVoice}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-300 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50 shadow-sm"
          title="Start real-time bidirectional voice conversation with gemini-3.8-live"
        >
          <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">Voice</span>
        </button>

        {/* Veo 3 Video Studio Button */}
        <button
          onClick={onOpenVeo}
          className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-2.5 py-1 text-xs font-mono text-[#e5c46b] transition-all hover:bg-[#d4af37]/20 hover:border-[#d4af37]/50 shadow-sm"
          title="Veo 3 Video Studio: Text to Video & Animate Photos (veo-3.1-fast-generate-preview)"
        >
          <Film className="h-3.5 w-3.5 text-[#d4af37]" />
          <span className="hidden sm:inline">Veo Video</span>
        </button>

        {/* New Session Button */}
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
          title="New Inquiry (Ctrl+K)"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">New</span>
        </button>

        {/* Save Chat Button */}
        <button
          onClick={handleManualSave}
          disabled={!hasActiveConversation}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all ${
            justSaved || isChatSaved
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
          } ${!hasActiveConversation ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Save chat to storage (Ctrl+S)"
        >
          {justSaved ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden md:inline">Saved</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 text-neutral-400" />
              <span className="hidden md:inline">Save</span>
            </>
          )}
        </button>

        {/* Export Dropdown Menu */}
        <div className="relative" ref={exportDropdownRef}>
          <button
            onClick={() => setIsExportMenuOpen((prev) => !prev)}
            disabled={!hasActiveConversation}
            className={`flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-neutral-300 transition-colors hover:bg-white/10 hover:text-white ${
              !hasActiveConversation ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Export conversation (PDF, Markdown, JSON)"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#d4af37]" />
                <span className="hidden sm:inline font-mono text-[11px] text-[#e5b974]">
                  Generating...
                </span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 text-neutral-400" />
                <span className="hidden sm:inline font-mono text-[11px]">Export</span>
                <ChevronDown className="h-3 w-3 text-neutral-400" />
              </>
            )}
          </button>

          {/* Dropdown Options */}
          {isExportMenuOpen && hasActiveConversation && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-white/15 bg-[#10131b] p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border-b border-white/10 mb-1">
                Export Inquiry
              </div>

              {/* PDF Export Option */}
              <button
                onClick={handlePdfClick}
                disabled={isExportingPdf}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/10 group"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] group-hover:bg-[#d4af37]/20">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      Styled PDF Document
                    </span>
                    <span className="font-mono text-[9px] bg-[#d4af37]/15 text-[#d4af37] px-1.5 py-0.2 rounded">
                      Editorial
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">
                    Clean Berno typography, thought arcs & citations
                  </p>
                </div>
              </button>

              {/* Markdown Export Option */}
              <button
                onClick={handleMarkdownClick}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/10 group"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 group-hover:bg-cyan-500/20">
                  <Code className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">
                      Markdown Document
                    </span>
                    <span className="font-mono text-[9px] bg-white/10 text-neutral-300 px-1.5 py-0.2 rounded">
                      .md
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">
                    Standard GitHub & Obsidian compatible format
                  </p>
                </div>
              </button>

              {/* JSON Backup Option */}
              <button
                onClick={handleJsonClick}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/10 group"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-300 group-hover:bg-purple-500/20">
                  <Save className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">
                      Raw JSON Backup
                    </span>
                    <span className="font-mono text-[9px] bg-white/10 text-neutral-300 px-1.5 py-0.2 rounded">
                      .json
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">
                    Complete structured messages & metadata
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Intellectual architecture modal */}
        <button
          onClick={onOpenAbout}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/5 hover:text-[#d4af37]"
          title="Why Berno is Smarter"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
