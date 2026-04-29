import type { SessionChatMessageResponse } from '../types/api';

const SESSION_LANGUAGES = [
  'COMMON',
  'DWARVISH',
  'ELVISH',
  'GIANT',
  'GNOMISH',
  'GOBLIN',
  'HALFLING',
  'ORC',
  'ABYSSAL',
  'CELESTIAL',
  'DRACONIC',
  'DEEP_SPEECH',
  'INFERNAL',
  'PRIMORDIAL',
  'SYLVAN',
  'UNDERCOMMON',
  'THIEVES_CANT',
  'EGYPTIAN',
] as const;

export const DEFAULT_LANGUAGES = [...SESSION_LANGUAGES];
export const ALL_LANGUAGES = [...SESSION_LANGUAGES];

export const getFontClass = (language?: string) => {
  if (!language) return 'font-common';

  switch (language.toUpperCase()) {
    case 'DWARVISH':
      return 'font-dwarvish';
    case 'ELVISH':
      return 'font-elvish';
    case 'GIANT':
      return 'font-giant';
    case 'GNOMISH':
      return 'font-gnomish';
    case 'GOBLIN':
      return 'font-goblin';
    case 'HALFLING':
      return 'font-halfling';
    case 'ORC':
      return 'font-orc';
    case 'ABYSSAL':
      return 'font-abyssal';
    case 'CELESTIAL':
      return 'font-celestial';
    case 'DRACONIC':
      return 'font-draconic';
    case 'DEEP_SPEECH':
      return 'font-deep-speech';
    case 'INFERNAL':
      return 'font-infernal';
    case 'PRIMORDIAL':
      return 'font-primordial';
    case 'SYLVAN':
      return 'font-sylvan';
    case 'UNDERCOMMON':
      return 'font-undercommon';
    case 'THIEVES_CANT':
      return 'font-thieves-cant';
    case 'EGYPTIAN':
      return 'font-egyptian';
    default:
      return 'font-common';
  }
};

export const scrambleText = (text: string) => {
  const runes = '#$%&*+=?@ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  return text
    .split('')
    .map((char) => {
      if (/[a-zA-Z]/.test(char)) {
        return runes[Math.floor(Math.random() * runes.length)];
      }

      return char;
    })
    .join('');
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const getFileIcon = (type: string) => {
  if (type === 'IMAGE') return '[IMG]';
  if (type === 'PDF') return '[PDF]';
  return '[FILE]';
};

export const sortChatMessages = (messages: SessionChatMessageResponse[]) =>
  [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
