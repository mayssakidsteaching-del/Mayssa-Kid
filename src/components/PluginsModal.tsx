import React, { useState, useEffect } from 'react';
import { WebsitePluginTheme, ApiKeyItem, Conversation, ReadingListItem, User } from '../types';
import { saveApiKeyToCloud, loadApiKeysFromCloud, revokeApiKeyInCloud } from '../lib/firebase';
import {
  Puzzle,
  Globe,
  Check,
  Sparkles,
  X,
  ExternalLink,
  RotateCcw,
  Palette,
  Type,
  Layers,
  ArrowRight,
  Flame,
  ShieldCheck,
  Sliders,
  Key,
  Copy,
  Plus,
  Trash2,
  FileCode,
  Download,
  Terminal,
  Database,
  CheckCircle2,
  RefreshCw,
  Code2,
} from 'lucide-react';

interface PluginsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlugin: WebsitePluginTheme | null;
  onApplyPlugin: (plugin: WebsitePluginTheme | null) => void;
  conversations?: Conversation[];
  readingList?: ReadingListItem[];
  user?: User | null;
  dailyWordsRead?: number;
  dailyReadingMinutes?: number;
}

const POPULAR_PRESETS: { label: string; url: string; domain: string; tone: string; color: string }[] = [
  { label: 'The New York Times', url: 'https://nytimes.com', domain: 'nytimes.com', tone: 'Classic Blackletter & Broadside Serif', color: '#121212' },
  { label: 'Linear', url: 'https://linear.app', domain: 'linear.app', tone: 'Obsidian Dark & Cyber Precision', color: '#5e6ad2' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com', domain: 'news.ycombinator.com', tone: 'Minimalist Terminal & Monospace', color: '#ff6600' },
  { label: 'GitHub', url: 'https://github.com', domain: 'github.com', tone: 'Emerald Cybernetic Engineering', color: '#238636' },
  { label: 'Vogue', url: 'https://vogue.com', domain: 'vogue.com', tone: 'Haute Couture Serif Luxury', color: '#000000' },
  { label: 'Stripe', url: 'https://stripe.com', domain: 'stripe.com', tone: 'Silicon Valley Vibrant Gradients', color: '#635bff' },
  { label: 'Medium', url: 'https://medium.com', domain: 'medium.com', tone: 'Literary Long-form Essayist', color: '#1a8917' },
  { label: 'Wikipedia', url: 'https://wikipedia.org', domain: 'wikipedia.org', tone: 'Encyclopedic Academic Compendium', color: '#3366cc' },
];

const DEFAULT_MASTER_KEY: ApiKeyItem = {
  id: 'key-default-master',
  name: 'Master Website Bridge Key',
  keyPrefix: 'berno_live_sk_master',
  key: 'berno_live_sk_master_polymath_intellect_2026',
  permissions: ['read:all_data', 'chat:send', 'export:full'],
  targetWebsite: 'Any Connected Website',
  createdAt: Date.now() - 86400000 * 2,
  status: 'active',
};

export function PluginsModal({
  isOpen,
  onClose,
  activePlugin,
  onApplyPlugin,
  conversations = [],
  readingList = [],
  user = null,
  dailyWordsRead = 0,
  dailyReadingMinutes = 0,
}: PluginsModalProps) {
  const [activeTab, setActiveTab] = useState<'style' | 'api_bridge'>('style');

  // Style plugin state
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedPlugin, setExtractedPlugin] = useState<WebsitePluginTheme | null>(activePlugin);
  const [adoptVoice, setAdoptVoice] = useState<boolean>(Boolean(activePlugin?.adoptTone));

  // API Key & Web Connect state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(() => {
    try {
      const saved = localStorage.getItem('berno_user_api_keys');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [DEFAULT_MASTER_KEY];
  });

  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyWebsite, setNewKeyWebsite] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [snippetTab, setSnippetTab] = useState<'curl' | 'js' | 'python' | 'widget'>('curl');
  const [testedData, setTestedData] = useState<string | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);

  // Sync API Keys from Firestore on mount
  useEffect(() => {
    if (user && isOpen) {
      loadApiKeysFromCloud(user.id).then((cloudKeys) => {
        if (cloudKeys && cloudKeys.length > 0) {
          setApiKeys(cloudKeys);
          try {
            localStorage.setItem('berno_user_api_keys', JSON.stringify(cloudKeys));
          } catch {}
        }
      });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleExtract = async (targetUrl?: string) => {
    const rawUrl = (targetUrl || urlInput).trim();
    if (!rawUrl) {
      setError('Please enter a website URL or domain (e.g., nytimes.com, linear.app)');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/plugin/extract-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to extract styles from that website');
      }

      setExtractedPlugin({
        ...data.plugin,
        adoptTone: adoptVoice,
      });
      if (targetUrl) setUrlInput(targetUrl);
    } catch (err: any) {
      setError(err?.message || 'Failed to extract styles from website. Please verify URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (pluginToApply: WebsitePluginTheme) => {
    onApplyPlugin({
      ...pluginToApply,
      adoptTone: adoptVoice,
      isActive: true,
    });
    onClose();
  };

  const handleResetToDefault = () => {
    onApplyPlugin(null);
    setExtractedPlugin(null);
    setUrlInput('');
    onClose();
  };

  // API Key Generation Handler
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsCreatingKey(true);
    try {
      // Create key via backend endpoint
      const res = await fetch('/api/v1/keys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          targetWebsite: newKeyWebsite.trim() || 'Any Connected Website',
          permissions: ['read:all_data', 'chat:send', 'export:full'],
        }),
      });

      const data = await res.json();
      let newKeyItem: ApiKeyItem;

      if (res.ok && data.apiKey) {
        newKeyItem = {
          id: data.apiKey.id,
          name: data.apiKey.name,
          keyPrefix: data.apiKey.key.slice(0, 16),
          key: data.apiKey.key,
          permissions: data.apiKey.permissions,
          targetWebsite: data.apiKey.targetWebsite,
          createdAt: data.apiKey.createdAt,
          status: 'active',
        };
      } else {
        // Fallback generator
        const rand = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        const generatedKey = `berno_live_sk_${rand}_${Date.now()}`;
        newKeyItem = {
          id: `key-${Date.now()}`,
          name: newKeyName.trim(),
          keyPrefix: generatedKey.slice(0, 16),
          key: generatedKey,
          permissions: ['read:all_data', 'chat:send', 'export:full'],
          targetWebsite: newKeyWebsite.trim() || 'Any Connected Website',
          createdAt: Date.now(),
          status: 'active',
        };
      }

      const updated = [newKeyItem, ...apiKeys];
      setApiKeys(updated);
      try {
        localStorage.setItem('berno_user_api_keys', JSON.stringify(updated));
      } catch {}

      // Persist in cloud if user is logged in
      if (user) {
        saveApiKeyToCloud(user.id, newKeyItem);
      }

      setNewKeyName('');
      setNewKeyWebsite('');
      setShowKeyForm(false);
    } catch (err) {
      console.error('Error creating key:', err);
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleCopyKey = (keyItem: ApiKeyItem) => {
    navigator.clipboard.writeText(keyItem.key);
    setCopiedKeyId(keyItem.id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const handleRevokeKey = async (keyId: string) => {
    const updated = apiKeys.map((k) => (k.id === keyId ? { ...k, status: 'revoked' as const } : k));
    setApiKeys(updated);
    try {
      localStorage.setItem('berno_user_api_keys', JSON.stringify(updated));
    } catch {}
    try {
      await fetch('/api/v1/keys/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      });
    } catch {}
    if (user) {
      revokeApiKeyInCloud(user.id, keyId);
    }
  };

  // Compile and retrieve all information from the app
  const compileAllAppData = () => {
    return {
      app: {
        name: 'Berno',
        version: '2.4.0',
        tagline: 'The Cognitive Thinking Assistant & Epistemic Intellect',
        exportedAt: new Date().toISOString(),
        user: user ? { id: user.id, name: user.name, email: user.email, tier: user.tier } : 'Scholar Guest',
      },
      metrics: {
        totalConversations: conversations.length,
        totalMessages: conversations.reduce((acc, c) => acc + c.messages.length, 0),
        dailyWordsRead,
        dailyReadingMinutes,
        savedBookmarksCount: readingList.length,
      },
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        mode: c.mode,
        chatbotRole: c.chatbotRole,
        isPinned: Boolean(c.pinned),
        tags: c.tags || [],
        createdAt: new Date(c.createdAt).toISOString(),
        updatedAt: new Date(c.updatedAt).toISOString(),
        executiveSummary: c.executiveSummary || null,
        messagesCount: c.messages.length,
        messages: c.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          thinkingContent: m.thinkingContent || null,
          timestamp: new Date(m.timestamp).toISOString(),
          groundingSources: m.groundingSources || [],
          searchQueries: m.searchQueries || [],
        })),
      })),
      readingList: readingList.map((item) => ({
        id: item.id,
        conversationTitle: item.conversationTitle,
        snippet: item.snippet,
        fullContent: item.fullContent,
        wordCount: item.wordCount,
        readingTimeDisplay: item.readingTimeDisplay,
        bookmarkedAt: new Date(item.bookmarkedAt).toISOString(),
      })),
    };
  };

  const handleFetchAllData = async () => {
    setIsTestingApi(true);
    try {
      // Test the live API endpoint with the active key
      const activeKey = apiKeys.find((k) => k.status === 'active')?.key || DEFAULT_MASTER_KEY.key;
      const res = await fetch('/api/v1/app-data', {
        headers: { 'x-api-key': activeKey },
      });

      if (res.ok) {
        const json = await res.json();
        // Merge with client live conversation state for absolute completeness
        const full = {
          ...json.data,
          ...compileAllAppData(),
        };
        setTestedData(JSON.stringify(full, null, 2));
      } else {
        // Fallback to local full bundle
        setTestedData(JSON.stringify(compileAllAppData(), null, 2));
      }
    } catch {
      setTestedData(JSON.stringify(compileAllAppData(), null, 2));
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleDownloadAllData = () => {
    const data = compileAllAppData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `berno-all-app-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeKeyForCode = apiKeys.find((k) => k.status === 'active')?.key || 'berno_live_sk_YOUR_KEY';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://berno.ai';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-[#d4af37]/35 bg-[#0b0e14] shadow-2xl overflow-hidden text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-gradient-to-r from-[#141724] via-[#0b0e14] to-[#141724]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37]">
              <Puzzle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-white tracking-wide">
                  Plugins & External Web Connect
                </h2>
                <span className="rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#f3cf65]">
                  API v1.0
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                Borrow any website's style OR connect external websites to receive all app information via API Keys
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-[#0e111a] px-6 pt-2">
          <button
            onClick={() => setActiveTab('style')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-mono transition-all ${
              activeTab === 'style'
                ? 'border-[#d4af37] text-[#f3cf65] font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Website Style & Theme</span>
            {activePlugin && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('api_bridge')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-mono transition-all ${
              activeTab === 'api_bridge'
                ? 'border-[#d4af37] text-[#f3cf65] font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>Web Connect & API Keys (Get All App Data)</span>
            <span className="rounded-full bg-blue-500/20 px-1.5 py-0.2 text-[9px] text-blue-300 font-mono">
              {apiKeys.filter((k) => k.status === 'active').length} Keys
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* TAB 1: WEBSITE STYLE EXTRACTOR */}
          {activeTab === 'style' && (
            <div className="space-y-6">
              {/* Active Plugin Notice */}
              {activePlugin && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-7 w-7 rounded-lg border border-white/20 flex items-center justify-center text-white font-bold text-xs shadow"
                      style={{ backgroundColor: activePlugin.primaryColor }}
                    >
                      {activePlugin.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span>Currently Applied:</span>
                        <span className="text-emerald-300 font-serif">{activePlugin.name}</span>
                        <span className="font-mono text-[10px] text-neutral-400">({activePlugin.domain})</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        {activePlugin.editorialTone}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleResetToDefault}
                    className="flex items-center gap-1 text-[11px] font-mono text-red-400 hover:text-red-300 underline decoration-red-400/40 hover:decoration-red-300 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset to Berno Standard</span>
                  </button>
                </div>
              )}

              {/* URL Input Box */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Connect Any Website URL</span>
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500 font-mono text-xs">
                      https://
                    </div>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                      placeholder="e.g. nytimes.com, linear.app, stripe.com, theverge.com"
                      className="w-full rounded-xl border border-white/15 bg-[#12151f] pl-18 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37] font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExtract()}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-xl border border-[#d4af37]/60 bg-[#d4af37]/20 hover:bg-[#d4af37]/30 text-[#f3cf65] px-5 py-2.5 text-xs font-mono font-semibold transition-all shadow-md disabled:opacity-50 shrink-0"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-[#f3cf65] border-t-transparent animate-spin" />
                        <span>Extracting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Extract Style</span>
                      </>
                    )}
                  </button>
                </div>

                {error && <p className="text-xs text-red-400 font-mono pt-1">{error}</p>}
              </div>

              {/* Quick Connect Popular Website Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span>Instant 1-Click Signature Presets</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">Curated Publications</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {POPULAR_PRESETS.map((preset) => (
                    <button
                      key={preset.domain}
                      type="button"
                      onClick={() => handleExtract(preset.url)}
                      className={`flex flex-col items-start p-2.5 rounded-xl border transition-all text-left group ${
                        activePlugin?.domain === preset.domain
                          ? 'border-[#d4af37] bg-[#d4af37]/15'
                          : 'border-white/10 bg-[#12151f] hover:bg-white/5 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: preset.color }}
                        />
                        {activePlugin?.domain === preset.domain && (
                          <Check className="h-3 w-3 text-[#d4af37]" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-white group-hover:text-[#f3cf65] truncate w-full">
                        {preset.label}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 truncate w-full mt-0.5">
                        {preset.domain}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Extracted Style Preview & Activation Card */}
              {extractedPlugin && (
                <div className="rounded-xl border border-[#d4af37]/40 bg-[#141824] p-4 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md"
                        style={{ backgroundColor: extractedPlugin.primaryColor }}
                      >
                        {extractedPlugin.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-serif text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{extractedPlugin.name} Style Plugin</span>
                          {extractedPlugin.domain && (
                            <span className="font-mono text-[10px] text-neutral-400">
                              ({extractedPlugin.domain})
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-neutral-300 font-mono">
                          {extractedPlugin.editorialTone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300 uppercase">
                        Font: {extractedPlugin.fontFamily}
                      </span>
                    </div>
                  </div>

                  {/* Style Tokens Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                      <div className="text-[10px] text-neutral-500 mb-1">Primary Color</div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: extractedPlugin.primaryColor }}
                        />
                        <span className="text-white text-[11px]">{extractedPlugin.primaryColor}</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                      <div className="text-[10px] text-neutral-500 mb-1">Background</div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: extractedPlugin.backgroundColor }}
                        />
                        <span className="text-white text-[11px]">{extractedPlugin.backgroundColor}</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                      <div className="text-[10px] text-neutral-500 mb-1">Typography</div>
                      <div className="text-white text-[11px] capitalize">
                        {extractedPlugin.fontFamily} Face
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                      <div className="text-[10px] text-neutral-500 mb-1">Border Radius</div>
                      <div className="text-white text-[11px]">{extractedPlugin.borderRadius}</div>
                    </div>
                  </div>

                  {/* Live Preview Card Styled as the Target Website */}
                  <div
                    className="p-4 rounded-xl transition-all shadow-inner border"
                    style={{
                      backgroundColor: extractedPlugin.backgroundColor,
                      color: extractedPlugin.textColor,
                      borderRadius: extractedPlugin.borderRadius,
                      borderColor: `${extractedPlugin.primaryColor}40`,
                      fontFamily:
                        extractedPlugin.fontFamily === 'serif'
                          ? 'ui-serif, Georgia, serif'
                          : extractedPlugin.fontFamily === 'mono'
                          ? 'monospace'
                          : 'sans-serif',
                    }}
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/10">
                      <span className="font-bold text-xs uppercase tracking-wider" style={{ color: extractedPlugin.primaryColor }}>
                        {extractedPlugin.name} Editorial Stream
                      </span>
                      <span className="text-[10px] opacity-70">Live UI Emulation</span>
                    </div>
                    <h5 className="font-bold text-sm mb-1 leading-snug">
                      The Metaphysics of Intelligent Autonomous Systems
                    </h5>
                    <p className="text-xs opacity-80 leading-relaxed">
                      First-principles exploration synthesized according to {extractedPlugin.name}'s visual vocabulary and aesthetic hierarchy.
                    </p>
                  </div>

                  {/* Adopt Website Editorial Tone Toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs font-mono cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={adoptVoice}
                        onChange={(e) => setAdoptVoice(e.target.checked)}
                        className="rounded border-white/20 bg-[#12151d] text-[#d4af37] focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-neutral-300">
                        Adopt {extractedPlugin.name}'s editorial voice in responses
                      </span>
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleApply(extractedPlugin)}
                      className="flex items-center gap-2 rounded-xl border border-[#d4af37] bg-[#d4af37] hover:bg-[#e6c148] text-neutral-950 px-5 py-2 text-xs font-mono font-bold tracking-wide transition-all shadow-lg"
                    >
                      <Check className="h-4 w-4" />
                      <span>Apply Style as Active Plugin</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WEB CONNECT & API KEYS (GET ALL APP INFORMATION) */}
          {activeTab === 'api_bridge' && (
            <div className="space-y-6">
              {/* Feature Hero Banner */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-mono text-xs uppercase tracking-wider">
                  <Database className="h-4 w-4" />
                  <span>Full App Information & External Website Bridge</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Connect any external website or backend to Berno. External websites can authenticate using an API Key and immediately retrieve <strong>all information from the app</strong> (conversations, reasoning traces, citations, reading lists, metrics, and live AI responses).
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-mono text-neutral-400">
                  <span className="rounded bg-black/40 px-2 py-0.5 border border-white/10 text-emerald-400">
                    GET /api/v1/app-data
                  </span>
                  <span>•</span>
                  <span className="rounded bg-black/40 px-2 py-0.5 border border-white/10 text-cyan-400">
                    POST /api/v1/chat
                  </span>
                  <span>•</span>
                  <span>Header: x-api-key: berno_live_sk_...</span>
                </div>
              </div>

              {/* Action Bar: Create API Key & Inspect App Data */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowKeyForm(!showKeyForm)}
                    className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/60 bg-[#d4af37]/20 hover:bg-[#d4af37]/30 text-[#f3cf65] px-3.5 py-2 text-xs font-mono font-semibold transition-all shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create New API Key</span>
                  </button>

                  <button
                    onClick={handleFetchAllData}
                    disabled={isTestingApi}
                    className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white px-3.5 py-2 text-xs font-mono transition-all shadow-sm"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-[#60a5fa] ${isTestingApi ? 'animate-spin' : ''}`} />
                    <span>Inspect All App Data</span>
                  </button>
                </div>

                <button
                  onClick={handleDownloadAllData}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 text-neutral-300 hover:text-white px-3 py-2 text-xs font-mono transition-all"
                  title="Export all app data as structured JSON file"
                >
                  <Download className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>Download Full JSON</span>
                </button>
              </div>

              {/* Create API Key Form Modal / Drawer */}
              {showKeyForm && (
                <form
                  onSubmit={handleCreateApiKey}
                  className="rounded-xl border border-[#d4af37]/40 bg-[#121622] p-4 space-y-3.5 animate-in fade-in duration-200"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-mono text-xs uppercase tracking-wide text-[#d4af37] flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5" />
                      <span>Provision New External Website API Key</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowKeyForm(false)}
                      className="text-neutral-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-neutral-400 mb-1">
                        Key Name / Application
                      </label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. My Next.js Blog, Linear Bot"
                        required
                        className="w-full rounded-xl border border-white/10 bg-[#0c0e15] px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#d4af37] focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-neutral-400 mb-1">
                        Target Website Domain
                      </label>
                      <input
                        type="text"
                        value={newKeyWebsite}
                        onChange={(e) => setNewKeyWebsite(e.target.value)}
                        placeholder="e.g. https://mywebsite.com"
                        className="w-full rounded-xl border border-white/10 bg-[#0c0e15] px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#d4af37] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono text-neutral-300">
                    <span className="text-[#d4af37] font-semibold">Included Scopes:</span>
                    <ul className="mt-1 space-y-0.5 list-disc list-inside text-neutral-400">
                      <li><code className="text-emerald-300">read:all_data</code> — Access all conversations, messages, thinking traces, reading list, and telemetry</li>
                      <li><code className="text-cyan-300">chat:send</code> — Submit queries to Berno's Infinite-IQ reasoning engine directly from external site</li>
                      <li><code className="text-amber-300">export:full</code> — Full JSON export and sync capabilities</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowKeyForm(false)}
                      className="px-3 py-1.5 text-xs font-mono text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingKey}
                      className="flex items-center gap-1.5 rounded-xl border border-[#d4af37] bg-[#d4af37] hover:bg-[#e6c148] text-neutral-950 px-4 py-1.5 text-xs font-mono font-bold transition-all shadow-md"
                    >
                      {isCreatingKey ? 'Generating...' : 'Create API Key'}
                    </button>
                  </div>
                </form>
              )}

              {/* Active API Keys List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span>Your Active Website API Keys ({apiKeys.length})</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {user ? 'Synced with Firebase' : 'Saved in Browser'}
                  </span>
                </div>

                <div className="space-y-2">
                  {apiKeys.map((k) => (
                    <div
                      key={k.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                        k.status === 'revoked'
                          ? 'border-red-500/20 bg-red-950/10 opacity-60'
                          : 'border-white/10 bg-[#12151f] hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white truncate">{k.name}</span>
                          <span
                            className={`rounded-full px-2 py-0.2 text-[9px] font-mono uppercase font-semibold ${
                              k.status === 'revoked'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {k.status}
                          </span>
                          {k.targetWebsite && (
                            <span className="text-[10px] font-mono text-neutral-400 truncate">
                              • {k.targetWebsite}
                            </span>
                          )}
                        </div>

                        {/* Masked Key Display */}
                        <div className="flex items-center gap-2 font-mono text-xs text-neutral-300 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5 w-fit">
                          <Key className="h-3 w-3 text-[#d4af37] shrink-0" />
                          <span className="text-[#f3cf65] select-all">
                            {k.key.slice(0, 18)}••••••••••••••••{k.key.slice(-4)}
                          </span>
                        </div>
                      </div>

                      {/* Actions: Copy & Revoke */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleCopyKey(k)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-neutral-300 hover:text-white hover:bg-white/10 transition-all"
                          title="Copy Full API Key to Clipboard"
                        >
                          {copiedKeyId === k.id ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-neutral-400" />
                              <span>Copy Key</span>
                            </>
                          )}
                        </button>

                        {k.status !== 'revoked' && (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="rounded-lg p-1.5 text-neutral-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                            title="Revoke API Key"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live App Data Inspector Preview */}
              {testedData && (
                <div className="rounded-xl border border-blue-500/40 bg-[#0c101a] p-4 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="font-mono text-xs text-blue-300 flex items-center gap-1.5">
                      <Code2 className="h-4 w-4 text-blue-400" />
                      <span>Live App Data Delivered to Connected Website</span>
                    </span>
                    <button
                      onClick={() => setTestedData(null)}
                      className="text-xs font-mono text-neutral-400 hover:text-white"
                    >
                      Hide
                    </button>
                  </div>
                  <pre className="max-h-56 overflow-y-auto text-[11px] font-mono text-emerald-300 bg-black/60 p-3 rounded-lg border border-white/5 whitespace-pre">
                    {testedData}
                  </pre>
                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-neutral-400">
                    <span>Includes all {conversations.length} conversations, reasoning logs, and reading lists</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(testedData);
                        alert('Full JSON copied to clipboard!');
                      }}
                      className="text-[#d4af37] hover:underline"
                    >
                      Copy Complete Payload
                    </button>
                  </div>
                </div>
              )}

              {/* Code Integration Snippets for External Websites */}
              <div className="rounded-xl border border-white/10 bg-[#12151f] p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="font-mono text-xs uppercase tracking-wide text-neutral-300 flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span>How to Fetch All App Information from Any Website</span>
                  </span>

                  {/* Snippet Tabs */}
                  <div className="flex rounded-lg bg-black/40 p-0.5 border border-white/5 text-[10px] font-mono">
                    {(['curl', 'js', 'python', 'widget'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSnippetTab(tab)}
                        className={`px-2 py-0.5 rounded capitalize transition-all ${
                          snippetTab === tab
                            ? 'bg-[#d4af37]/20 text-[#f3cf65] font-semibold'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {tab === 'js' ? 'JavaScript' : tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Code Block Container */}
                <div className="relative rounded-lg bg-[#08090d] p-3 border border-white/5 font-mono text-xs text-neutral-200 overflow-x-auto">
                  {snippetTab === 'curl' && (
                    <pre className="text-emerald-300 leading-relaxed">
{`# 1. Fetch ALL information from the app (conversations, messages, metrics)
curl -X GET "${origin}/api/v1/app-data" \\
  -H "x-api-key: ${activeKeyForCode}"

# 2. Query Berno's Infinite-IQ reasoning engine directly from external site
curl -X POST "${origin}/api/v1/chat" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${activeKeyForCode}" \\
  -d '{"message": "Deconstruct quantum error correction from first principles"}'`}
                    </pre>
                  )}

                  {snippetTab === 'js' && (
                    <pre className="text-cyan-300 leading-relaxed">
{`// Connect to Berno and retrieve all app information
async function fetchBernoAppData() {
  const response = await fetch("${origin}/api/v1/app-data", {
    headers: {
      "x-api-key": "${activeKeyForCode}"
    }
  });
  const { data } = await response.json();
  console.log("Retrieved all app inquiries & metrics:", data);
  return data;
}`}
                    </pre>
                  )}

                  {snippetTab === 'python' && (
                    <pre className="text-amber-300 leading-relaxed">
{`import requests

# Fetch all inquiries, reasoning traces and reading metrics
response = requests.get(
    "${origin}/api/v1/app-data",
    headers={"x-api-key": "${activeKeyForCode}"}
)
app_data = response.json().get("data")
print("Total Inquiries Retrieved:", len(app_data.get("conversations", [])))`}
                    </pre>
                  )}

                  {snippetTab === 'widget' && (
                    <pre className="text-purple-300 leading-relaxed">
{`<!-- Embed Berno into any website with your API key -->
<iframe 
  src="${origin}?apiKey=${activeKeyForCode}&embedded=true" 
  width="100%" 
  height="700px" 
  style="border: none; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);"
></iframe>`}
                    </pre>
                  )}

                  {/* Copy Snippet Button */}
                  <button
                    onClick={() => {
                      let code = '';
                      if (snippetTab === 'curl') code = `curl -X GET "${origin}/api/v1/app-data" -H "x-api-key: ${activeKeyForCode}"`;
                      if (snippetTab === 'js') code = `fetch("${origin}/api/v1/app-data", { headers: { "x-api-key": "${activeKeyForCode}" } }).then(r => r.json());`;
                      if (snippetTab === 'python') code = `import requests\nrequests.get("${origin}/api/v1/app-data", headers={"x-api-key": "${activeKeyForCode}"}).json()`;
                      if (snippetTab === 'widget') code = `<iframe src="${origin}?apiKey=${activeKeyForCode}" width="100%" height="700px"></iframe>`;
                      navigator.clipboard.writeText(code);
                      alert('Snippet copied to clipboard!');
                    }}
                    className="absolute top-2 right-2 flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[10px] text-neutral-300 hover:text-white hover:bg-white/20 transition-all"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-6 py-3 bg-[#0a0c12] flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <span>
            {activeTab === 'style'
              ? 'Style plugins adopt CSS tokens & tone'
              : 'API Keys allow any connected website to query & receive all app information'}
          </span>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
