import { useState, useRef, useEffect } from 'react';
import { Tag as TagIcon, Plus, Check, X, Hash } from 'lucide-react';
import { PRESET_TAGS, getTagStyle, normalizeTag } from '../utils/tagUtils';

interface TagPickerProps {
  currentTags?: string[];
  onUpdateTags: (tags: string[]) => void;
  onClose: () => void;
  anchorRect?: DOMRect | null;
}

export function TagPicker({
  currentTags = [],
  onUpdateTags,
  onClose,
}: TagPickerProps) {
  const [customInput, setCustomInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleToggleTag = (tag: string) => {
    const norm = normalizeTag(tag);
    if (!norm) return;

    if (currentTags.includes(norm)) {
      onUpdateTags(currentTags.filter((t) => t !== norm));
    } else {
      onUpdateTags([...currentTags, norm]);
    }
  };

  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const norm = normalizeTag(customInput);
    if (!norm) return;

    if (norm.length > 24) {
      setErrorMsg('Tag name must be 24 characters or less');
      return;
    }

    if (currentTags.includes(norm)) {
      setErrorMsg('Tag already added');
      return;
    }

    setErrorMsg(null);
    onUpdateTags([...currentTags, norm]);
    setCustomInput('');
  };

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-8 z-50 w-72 rounded-xl border border-white/15 bg-[#0f121a] p-3 text-xs shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-neutral-200">
          <TagIcon className="h-3.5 w-3.5 text-[#d4af37]" />
          <span>Categorize Chat</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-neutral-400 hover:bg-white/10 hover:text-white"
          title="Close tag picker"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Active Tags */}
      {currentTags.length > 0 && (
        <div className="mt-2.5">
          <div className="mb-1 text-[10px] font-mono uppercase text-neutral-500">
            Active Tags ({currentTags.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentTags.map((tag) => {
              const style = getTagStyle(tag);
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-medium transition-all"
                  style={{
                    color: style.color,
                    backgroundColor: style.bgColor,
                    border: `1px solid ${style.borderColor}`,
                  }}
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => handleToggleTag(tag)}
                    className="ml-0.5 rounded-full hover:opacity-80"
                    title={`Remove ${tag}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Preset Quick Tags */}
      <div className="mt-3">
        <div className="mb-1 text-[10px] font-mono uppercase text-neutral-500">
          Preset Categories
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESET_TAGS.map((pt) => {
            const isSelected = currentTags.includes(pt.name);
            return (
              <button
                key={pt.id}
                type="button"
                onClick={() => handleToggleTag(pt.name)}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left font-mono text-[11px] transition-all border ${
                  isSelected
                    ? 'shadow-sm font-semibold'
                    : 'bg-white/[0.02] border-white/10 text-neutral-300 hover:bg-white/5 hover:text-white'
                }`}
                style={
                  isSelected
                    ? {
                        color: pt.color,
                        backgroundColor: pt.bgColor,
                        borderColor: pt.borderColor,
                      }
                    : {}
                }
              >
                <span>{pt.name}</span>
                {isSelected && <Check className="h-3 w-3 shrink-0 stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Tag Input */}
      <form onSubmit={handleAddCustom} className="mt-3 border-t border-white/10 pt-2.5">
        <div className="mb-1 text-[10px] font-mono uppercase text-neutral-500">
          Create Custom Tag
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative flex flex-1 items-center">
            <Hash className="absolute left-2.5 h-3 w-3 text-neutral-500" />
            <input
              ref={inputRef}
              type="text"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="e.g. finance, draft"
              className="w-full rounded-lg border border-white/15 bg-black/50 py-1.5 pl-7 pr-2 font-mono text-xs text-neutral-100 placeholder:text-neutral-500 focus:border-[#d4af37] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!customInput.trim()}
            className="flex h-7 items-center gap-1 rounded-lg bg-[#d4af37] px-2.5 font-mono text-[11px] font-semibold text-black transition-all hover:bg-[#e2bd4e] disabled:opacity-30 disabled:pointer-events-none"
          >
            <Plus className="h-3 w-3" />
            <span>Add</span>
          </button>
        </div>
        {errorMsg && (
          <p className="mt-1 text-[10px] text-red-400 font-mono">{errorMsg}</p>
        )}
      </form>
    </div>
  );
}
