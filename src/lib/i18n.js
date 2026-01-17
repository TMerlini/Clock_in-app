import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from '../locales/en/translation.json';
import ptTranslations from '../locales/pt/translation.json';
import { pt } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      pt: {
        translation: ptTranslations
      }
    },
    lng: 'pt', // Default language is Portuguese
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false // Avoid suspense requirement for simpler setup
    }
  });

// Export a function to get date-fns locale based on current language
export function getDateFnsLocale() {
  const currentLang = i18n.language || 'pt';
  if (currentLang === 'pt') {
    return pt;
  }
  // Return English locale (fallback)
  return enUS;
}

export default i18n;