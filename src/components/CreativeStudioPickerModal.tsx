import React from 'react';
import {
  Image as ImageIcon,
  Film,
  Layers,
  Sparkles,
  X,
  ArrowRight,
  Video,
  Wand2,
} from 'lucide-react';
import { StudioTab } from './VeoVideoStudioModal';

interface CreativeStudioPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (tab: StudioTab) => void;
}

export function CreativeStudioPickerModal({
  isOpen,
  onClose,
  onSelectOption,
}: CreativeStudioPickerModalProps) {
  if (!isOpen) return null;

  const studioOptions = [
    {
      id: 'create_image' as StudioTab,
      badge: 'Gemini 3.1 Image Preview',
      badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      title: 'AI Image Studio & Inpainting Editor',
      description:
        'Synthesize publication-grade artwork, conceptual schematics, editorial portraits, and modify existing visuals using prompt-guided neural inpainting.',
      icon: ImageIcon,
      iconColor: 'text-[#d4af37]',
      bgGradient: 'from-[#d4af37]/10 via-transparent to-transparent',
      borderColor: 'group-hover:border-[#d4af37]/60',
      features: ['Text-to-Image Generation', 'Reference Image Inpainting', 'Multi-Aspect Ratios (1:1, 16:9, 4:3)'],
    },
    {
      id: 'text_to_video' as StudioTab,
      badge: 'Veo 3.1 Fast Preview',
      badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
      title: 'Veo 3.1 Cinematic Video Synthesizer',
      description:
        'Transform high-concept prompts or existing still photography into fluid, cinematic video scenes with physics-accurate lighting and camera dynamics.',
      icon: Film,
      iconColor: 'text-blue-400',
      bgGradient: 'from-blue-500/10 via-transparent to-transparent',
      borderColor: 'group-hover:border-blue-500/50',
      features: ['Text-to-Video Engine', 'Photo-to-Video Motion', '16:9 Cinema & 9:16 Reels'],
    },
    {
      id: 'edit_image' as StudioTab,
      badge: 'Multi-Modal Concept Lab',
      badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      title: 'Visual Storyboard & Concept Director',
      description:
        'Direct multi-scene narrative arcs, transform styles with cinematic lighting transfers, and iterate across visual drafts for creative productions.',
      icon: Layers,
      iconColor: 'text-emerald-400',
      bgGradient: 'from-emerald-500/10 via-transparent to-transparent',
      borderColor: 'group-hover:border-emerald-500/50',
      features: ['Sequential Concept Framing', 'Style & Lighting Transformations', 'Draft Comparison Matrix'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-[#d4af37]/30 bg-[#0d0f16] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-gradient-to-r from-[#141824] via-[#0d0f16] to-[#141824]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30">
              <Sparkles className="h-5 w-5 text-[#d4af37]" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-white tracking-wide">
                Creative Media Studio
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Select your generative production environment
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3 Options Grid */}
        <div className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {studioOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <div
                key={opt.id}
                onClick={() => {
                  onSelectOption(opt.id);
                  onClose();
                }}
                className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#121520]/80 p-4 transition-all duration-200 hover:scale-[1.01] hover:bg-[#161a29] ${opt.borderColor} cursor-pointer shadow-lg`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40 group-hover:bg-white/5 transition-colors">
                    <Icon className={`h-6 w-6 ${opt.iconColor}`} />
                  </div>

                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif text-sm font-semibold text-neutral-100 group-hover:text-white transition-colors">
                        {opt.title}
                      </h3>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-medium ${opt.badgeColor}`}
                      >
                        {opt.badge}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed max-w-lg">
                      {opt.description}
                    </p>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {opt.features.map((feat, i) => (
                        <span
                          key={i}
                          className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-neutral-300"
                        >
                          • {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center font-mono text-xs text-[#d4af37] font-medium group-hover:translate-x-1 transition-transform">
                  <span>Launch</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-6 py-3 bg-[#0a0c12] flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <span className="flex items-center gap-1.5 text-neutral-400">
            <Sparkles className="h-3 w-3 text-[#d4af37]" />
            High-Fidelity Studio Production
          </span>
          <span>Berno Creative Suite</span>
        </div>
      </div>
    </div>
  );
}
