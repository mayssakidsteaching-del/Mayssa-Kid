import { useState, useRef, useEffect } from 'react';
import { ThinkingMode, ChatbotRole, User } from '../types';
import { THINKING_MODES } from '../utils/constants';
import { CHATBOT_ROLES, AVAILABLE_MODELS } from '../utils/chatbotRoles';
import { ExportProgressRing } from './ExportProgressRing';
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
  BookOpen,
  Bookmark,
  Mail,
  Maximize2,
  Minimize2,
  Gauge,
  ListOrdered,
  User as UserIcon,
  LogOut,
  Sparkles,
  Compass,
  Share2,
  FileSpreadsheet,
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
  onShareEmail?: () => void;
  isExportingPdf?: boolean;
  isExportingMarkdown?: boolean;
  exportProgress?: number;
  user?: User | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  isChatSaved?: boolean;
  hasActiveConversation?: boolean;
  onOpenVoice: () => void;
  onOpenStudio?: () => void;
  currentMode: ThinkingMode;
  selectedModel: string;
  onChangeModel: (model: string) => void;
  chatbotRole: ChatbotRole;
  onChangeChatbotRole: (role: ChatbotRole) => void;
  readabilityMode: boolean;
  onToggleReadabilityMode: () => void;
  readingListCount?: number;
  onOpenReadingList?: () => void;
  isFocusZen?: boolean;
  onToggleFocusZen?: () => void;
  onOpenReaderDashboard?: () => void;
  onToggleTableOfContents?: () => void;
  isTableOfContentsOpen?: boolean;
  onOpenPedigree?: () => void;
  onOpenKnowledgeGraph?: () => void;
  onDownloadCitationsCsv?: () => void;
  citationCount?: number;
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
  onShareEmail,
  isExportingPdf = false,
  isExportingMarkdown = false,
  exportProgress = 0,
  user = null,
  onOpenAuth,
  onLogout,
  isChatSaved = false,
  hasActiveConversation = true,
  onOpenVoice,
  onOpenStudio,
  currentMode,
  selectedModel,
  onChangeModel,
  chatbotRole,
  onChangeChatbotRole,
  readabilityMode,
  onToggleReadabilityMode,
  readingListCount = 0,
  onOpenReadingList,
  isFocusZen = false,
  onToggleFocusZen,
  onOpenReaderDashboard,
  onToggleTableOfContents,
  isTableOfContentsOpen = false,
  onOpenPedigree,
  onOpenKnowledgeGraph,
  onDownloadCitationsCsv,
  citationCount = 0,
}: HeaderProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const modeConfig =
    THINKING_MODES.find((m) => m.id === currentMode) || THINKING_MODES[0];

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(e.target as Node)
      ) {
        setIsExportMenuOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
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


        {/* Readability Mode Toggle */}
        <button
          onClick={onToggleReadabilityMode}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all shadow-sm ${
            readabilityMode
              ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#f3cf65] shadow-[0_0_12px_rgba(212,175,55,0.25)] font-semibold'
              : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
          }`}
          title={
            readabilityMode
              ? 'Readability Mode Active: Centered serif flow & subtle golden thematic phrase highlights (Alt+R to toggle)'
              : 'Toggle Readability Mode: Hides sidebar with elegant serif typography and subtle golden thematic highlights (Alt+R)'
          }
        >
          <BookOpen className={`h-3.5 w-3.5 ${readabilityMode ? 'text-[#f3cf65]' : 'text-neutral-400'}`} />
          <span className="hidden md:inline">Readability</span>
        </button>

        {/* Reader Dashboard Button (Readability Mode) */}
        {readabilityMode && onOpenReaderDashboard && (
          <button
            onClick={onOpenReaderDashboard}
            className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-2.5 py-1 text-xs font-mono text-[#f3cf65] hover:bg-[#d4af37]/20 transition-all shadow-sm"
            title="Reader Dashboard: Focus Timer, Cumulative Stats & Daily Goals"
          >
            <Gauge className="h-3.5 w-3.5 text-[#d4af37]" />
            <span className="hidden lg:inline">Dashboard</span>
          </button>
        )}

        {/* Table of Contents Button (Readability Mode) */}
        {readabilityMode && onToggleTableOfContents && (
          <button
            onClick={onToggleTableOfContents}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all ${
              isTableOfContentsOpen
                ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#f3cf65]'
                : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Table of Contents (Jump to sections)"
          >
            <ListOrdered className="h-3.5 w-3.5 text-[#d4af37]" />
            <span className="hidden xl:inline">Outline</span>
          </button>
        )}

        {/* Focus Zen Fullscreen Reading Toggle */}
        {onToggleFocusZen && (
          <button
            onClick={onToggleFocusZen}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all ${
              isFocusZen
                ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#f3cf65] font-semibold'
                : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
            title={isFocusZen ? 'Exit Focus Zen (Esc)' : 'Focus Zen: Distraction-free full-screen reading'}
          >
            {isFocusZen ? (
              <Minimize2 className="h-3.5 w-3.5 text-[#d4af37]" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5 text-neutral-400" />
            )}
            <span className="hidden xl:inline">{isFocusZen ? 'Zen On' : 'Zen'}</span>
          </button>
        )}

        {/* Persistent Reading List Launcher */}
        {onOpenReadingList && (
          <button
            onClick={onOpenReadingList}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all ${
              readingListCount > 0
                ? 'border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f3cf65] hover:bg-[#d4af37]/20 shadow-sm'
                : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
            title={`Reading List: ${readingListCount} saved editorial insights across sessions`}
          >
            <Bookmark
              className={`h-3.5 w-3.5 ${
                readingListCount > 0 ? 'fill-[#d4af37] text-[#d4af37]' : 'text-neutral-400'
              }`}
            />
            <span className="hidden lg:inline">Reading List</span>
            {readingListCount > 0 && (
              <span className="rounded-full bg-[#d4af37]/30 px-1.5 py-0.2 text-[10px] font-bold text-[#fef08a]">
                {readingListCount}
              </span>
            )}
          </button>
        )}

        {/* Intellectual Pedigree D3 Timeline Button */}
        {onOpenPedigree && (
          <button
            onClick={onOpenPedigree}
            disabled={!hasActiveConversation}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all ${
              citationCount > 0
                ? 'border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f3cf65] hover:bg-[#d4af37]/20 shadow-sm'
                : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
            } ${!hasActiveConversation ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Intellectual Pedigree: D3 timeline chart tracking cited sources across dialogue depth"
          >
            <Compass className="h-3.5 w-3.5 text-[#d4af37]" />
            <span className="hidden xl:inline">Pedigree</span>
            {citationCount > 0 && (
              <span className="rounded-full bg-[#d4af37]/30 px-1.5 py-0.2 text-[10px] font-bold text-[#fef08a]">
                {citationCount}
              </span>
            )}
          </button>
        )}

        {/* Knowledge Graph D3 Force Network Button */}
        {onOpenKnowledgeGraph && (
          <button
            onClick={onOpenKnowledgeGraph}
            disabled={!hasActiveConversation}
            className={`flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-mono text-cyan-300 hover:bg-cyan-500/20 transition-all shadow-sm ${
              !hasActiveConversation ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Knowledge Graph: D3 network mapping relationships between concepts and entities"
          >
            <Share2 className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Graph</span>
          </button>
        )}

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

        {/* Quick PDF Export Button with Visual Progress Ring */}
        <button
          onClick={handlePdfClick}
          disabled={!hasActiveConversation || isExportingPdf || isExportingMarkdown}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all shadow-sm ${
            isExportingPdf
              ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#f3cf65] font-semibold ring-1 ring-[#d4af37]/50'
              : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-[#d4af37]/10 hover:border-[#d4af37]/40 hover:text-[#f3cf65]'
          } ${!hasActiveConversation ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={
            isExportingPdf
              ? `Synthesizing Executive Arc & PDF (${exportProgress}%)...`
              : 'Export conversation as Styled PDF Document with AI Executive Summary'
          }
        >
          {isExportingPdf ? (
            <>
              <ExportProgressRing progress={exportProgress} color="#d4af37" size={15} />
              <span className="font-mono text-[11px] text-[#f3cf65]">
                PDF <span className="text-[10px] opacity-90 font-bold">{exportProgress}%</span>
              </span>
            </>
          ) : (
            <>
              <FileText className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="hidden sm:inline font-mono text-[11px]">PDF</span>
            </>
          )}
        </button>

        {/* Quick Markdown Export Button with Visual Progress Ring */}
        <button
          onClick={handleMarkdownClick}
          disabled={!hasActiveConversation || isExportingPdf || isExportingMarkdown}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all shadow-sm ${
            isExportingMarkdown
              ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 font-semibold ring-1 ring-cyan-500/50'
              : 'border-white/10 bg-white/5 text-neutral-300 hover:bg-cyan-500/10 hover:border-cyan-500/40 hover:text-cyan-300'
          } ${!hasActiveConversation ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={
            isExportingMarkdown
              ? `Synthesizing Executive Arc & Markdown (${exportProgress}%)...`
              : 'Export conversation as Markdown Document (.md) with AI Executive Summary & References'
          }
        >
          {isExportingMarkdown ? (
            <>
              <ExportProgressRing progress={exportProgress} color="#06b6d4" size={15} />
              <span className="font-mono text-[11px] text-cyan-300">
                MD <span className="text-[10px] opacity-90 font-bold">{exportProgress}%</span>
              </span>
            </>
          ) : (
            <>
              <Code className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline font-mono text-[11px]">MD</span>
            </>
          )}
        </button>

        {/* Export Dropdown Menu (All Formats) */}
        <div className="relative" ref={exportDropdownRef}>
          <button
            onClick={() => setIsExportMenuOpen((prev) => !prev)}
            disabled={!hasActiveConversation || isExportingPdf || isExportingMarkdown}
            className={`flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-neutral-300 transition-colors hover:bg-white/10 hover:text-white ${
              !hasActiveConversation ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="More export options (JSON, Email, Summary)"
          >
            {isExportingPdf ? (
              <>
                <ExportProgressRing progress={exportProgress} color="#d4af37" size={14} />
                <span className="hidden xl:inline font-mono text-[10px] text-[#e5b974]">
                  {exportProgress}%
                </span>
              </>
            ) : isExportingMarkdown ? (
              <>
                <ExportProgressRing progress={exportProgress} color="#06b6d4" size={14} />
                <span className="hidden xl:inline font-mono text-[10px] text-cyan-300">
                  {exportProgress}%
                </span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 text-neutral-400" />
                <ChevronDown className="h-3 w-3 text-neutral-400" />
              </>
            )}
          </button>

          {/* Dropdown Options */}
          {isExportMenuOpen && hasActiveConversation && (
            <div className="absolute right-0 top-full mt-2 w-68 rounded-xl border border-white/15 bg-[#10131b] p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border-b border-white/10 mb-1 flex items-center justify-between">
                <span>Export Inquiry</span>
                {(isExportingPdf || isExportingMarkdown) && (
                  <span className="text-[#d4af37] font-semibold">{exportProgress}%</span>
                )}
              </div>

              {/* PDF Export Option */}
              <button
                onClick={handlePdfClick}
                disabled={isExportingPdf || isExportingMarkdown}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors group ${
                  isExportingPdf ? 'bg-[#d4af37]/15 border border-[#d4af37]/40' : 'hover:bg-white/10'
                }`}
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] group-hover:bg-[#d4af37]/20">
                  {isExportingPdf ? (
                    <ExportProgressRing progress={exportProgress} color="#d4af37" size={18} />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      Styled PDF Document
                    </span>
                    <span className="font-mono text-[9px] bg-[#d4af37]/15 text-[#d4af37] px-1.5 py-0.2 rounded">
                      {isExportingPdf ? `${exportProgress}% Arc` : 'Executive Arc'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">
                    {isExportingPdf
                      ? 'Generating Executive Summary with AI synthesis ring...'
                      : 'Editorial typography with AI Session Executive Summary'}
                  </p>
                </div>
              </button>

              {/* Markdown Export Option */}
              <button
                onClick={handleMarkdownClick}
                disabled={isExportingPdf || isExportingMarkdown}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors group ${
                  isExportingMarkdown ? 'bg-cyan-500/15 border border-cyan-500/40' : 'hover:bg-white/10'
                }`}
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 group-hover:bg-cyan-500/20">
                  {isExportingMarkdown ? (
                    <ExportProgressRing progress={exportProgress} color="#06b6d4" size={18} />
                  ) : (
                    <Code className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">
                      Markdown Document
                    </span>
                    <span className="font-mono text-[9px] bg-white/10 text-neutral-300 px-1.5 py-0.2 rounded">
                      {isExportingMarkdown ? `${exportProgress}% Arc` : '.md'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">
                    {isExportingMarkdown
                      ? 'Synthesizing summary and formatted References section...'
                      : 'Standard format with AI Session Executive Summary & References'}
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

              {/* Share via Email Option */}
              {onShareEmail && (
                <button
                  onClick={() => {
                    onShareEmail();
                    setIsExportMenuOpen(false);
                  }}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/10 group border-t border-white/5 mt-1"
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 group-hover:bg-emerald-500/20">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white">
                        Share via Email
                      </span>
                      <span className="font-mono text-[9px] bg-emerald-500/15 text-emerald-300 px-1.5 py-0.2 rounded">
                        mailto
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">
                      Mail summary & link to this application
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* User Authentication & Scholar Profile Dropdown */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 px-2 py-1 text-xs transition-all hover:bg-[#d4af37]/20 shadow-sm"
              title={`Logged in as ${user.name} (${user.tier})`}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d4af37] text-[10px] font-bold text-black font-mono">
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden md:inline font-mono text-[11px] text-[#f3cf65] font-medium max-w-[85px] truncate">
                {user.name.split(' ')[0]}
              </span>
              <span className="hidden lg:inline font-mono text-[9px] bg-[#d4af37]/25 text-[#fef08a] px-1 py-0.2 rounded">
                {user.tier}
              </span>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-white/15 bg-[#10131b] p-3 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d4af37] text-xs font-bold text-black font-mono shadow-md shrink-0">
                    {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                    <div className="text-[10px] text-neutral-400 font-mono truncate">{user.email}</div>
                  </div>
                </div>

                <div className="py-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Cognitive Tier:</span>
                    <span className="font-mono font-semibold text-[#f3cf65] bg-[#d4af37]/15 px-1.5 py-0.5 rounded">
                      {user.tier}
                    </span>
                  </div>
                  {user.role && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">Affiliation:</span>
                      <span className="font-mono text-neutral-300 truncate max-w-[130px]">{user.role}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-2 space-y-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAuth?.();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span>Switch Scholar Account</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout?.();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 px-2.5 py-1 text-xs font-mono text-[#f3cf65] hover:bg-[#d4af37]/20 hover:border-[#d4af37]/60 transition-all shadow-sm"
            title="Sign In / Log In to Berno"
          >
            <UserIcon className="h-3.5 w-3.5 text-[#d4af37]" />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}

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
