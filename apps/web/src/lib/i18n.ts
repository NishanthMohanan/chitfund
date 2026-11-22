import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en/common.json';
import ta from '../locales/ta/common.json';

export const SUPPORTED_LANGUAGES = ['en', 'ta'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const resources = {
  en: { common: en },
  ta: { common: ta },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common'],
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18n };
