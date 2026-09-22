export interface SupportedLanguage {
  code: string;       // BCP-47 / ISO 639-1 prefix e.g. 'en', 'es', 'fr'
  name: string;       // English name e.g. 'Spanish'
  nativeName: string; // Native name e.g. 'Español'
  flag: string;       // Flag representation or icon label
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
];

/**
 * Detect primary language of a piece of text
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text || !text.trim()) {
    return SUPPORTED_LANGUAGES[0]; // English
  }

  // Strip code blocks and markdown markers for accurate linguistic analysis
  const clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .slice(0, 3000)
    .toLowerCase();

  // 1. Script checks
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(clean)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'ja')!;
  }
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(clean)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'ko')!;
  }
  if (/[\u4E00-\u9FFF]/.test(clean)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'zh')!;
  }
  if (/[\u0600-\u06FF]/.test(clean)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'ar')!;
  }
  if (/[\u0900-\u097F]/.test(clean)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'hi')!;
  }
  if (/[\u0400-\u04FF]/.test(clean)) {
    if (/[іїєґ]/.test(clean)) {
      return SUPPORTED_LANGUAGES.find((l) => l.code === 'uk') || SUPPORTED_LANGUAGES.find((l) => l.code === 'ru')!;
    }
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'ru')!;
  }
  if (/[\u0370-\u03FF]/.test(clean)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'el')!;
  }
  if (/[\u0590-\u05FF]/.test(clean)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'he')!;
  }
  if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/.test(clean)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'vi')!;
  }

  // 2. High-precision Latin language frequency score
  const scores: Record<string, number> = {
    es: 0,
    fr: 0,
    de: 0,
    it: 0,
    pt: 0,
    nl: 0,
    tr: 0,
    pl: 0,
    sv: 0,
    id: 0,
    en: 0,
  };

  // Specific characters
  if (/[¿¡ñ]/.test(clean)) scores.es += 8;
  if (/[œç]/.test(clean)) scores.fr += 5;
  if (/[äöüß]/.test(clean)) scores.de += 6;
  if (/[ãõ]/.test(clean)) scores.pt += 6;
  if (/[ışğ]/.test(clean)) scores.tr += 8;
  if (/[ąęłśźż]/.test(clean)) scores.pl += 8;
  if (/[å]/.test(clean)) scores.sv += 6;

  const countMatches = (regex: RegExp) => (clean.match(regex) || []).length;

  // Spanish stop words
  scores.es += countMatches(/\b(el|la|los|las|una|para|con|como|pero|este|esta|del|por|son|está|están|más|también)\b/g) * 2;

  // French stop words
  scores.fr += countMatches(/\b(le|la|les|des|dans|pour|avec|cette|mais|plus|est|sont|une|sur|qui|que|nous|vous)\b/g) * 2;

  // German stop words
  scores.de += countMatches(/\b(der|die|das|den|dem|des|ein|eine|einen|und|in|ist|sind|für|mit|von|nicht|auf|zu)\b/g) * 2;

  // Italian stop words
  scores.it += countMatches(/\b(il|lo|la|gli|del|della|per|con|sono|questo|questa|anche|più|come|non|nella|delle)\b/g) * 2;

  // Portuguese stop words
  scores.pt += countMatches(/\b(não|para|com|uma|dos|das|pelo|pela|são|como|este|esta|mais|está|estão|você)\b/g) * 2;

  // Dutch stop words
  scores.nl += countMatches(/\b(het|een|van|voor|maar|zijn|naar|niet|over|deze|door|hier)\b/g) * 2;

  // Turkish stop words
  scores.tr += countMatches(/\b(bir|ve|bu|için|ile|çok|daha|olan|olarak|gibi|kadar|nasıl)\b/g) * 2;

  // Polish stop words
  scores.pl += countMatches(/\b(się|nie|jest|jak|ale|dla|oraz|tylko|tego|przez|może)\b/g) * 2;

  // English stop words
  scores.en += countMatches(/\b(the|and|is|are|in|of|to|with|that|this|for|on|as|by|from|which|an|have|has)\b/g) * 1.5;

  let bestLang = 'en';
  let bestScore = scores.en;

  for (const [code, score] of Object.entries(scores)) {
    if (code !== 'en' && score > 6 && score > bestScore) {
      bestScore = score;
      bestLang = code;
    }
  }

  const found = SUPPORTED_LANGUAGES.find((l) => l.code === bestLang);
  return found || SUPPORTED_LANGUAGES[0];
}

/**
 * Get language information from a BCP-47 tag (e.g. "es-ES" -> Spanish)
 */
export function getLanguageFromTag(bcpTag: string): SupportedLanguage {
  if (!bcpTag) return SUPPORTED_LANGUAGES[0];
  const primary = bcpTag.split('-')[0].toLowerCase();
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === primary);
  if (found) return found;

  return {
    code: primary,
    name: bcpTag,
    nativeName: bcpTag,
    flag: '🌐',
  };
}
