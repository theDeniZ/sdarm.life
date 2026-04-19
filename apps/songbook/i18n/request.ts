import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import de from '@sdarm/i18n/messages/de';
import en from '@sdarm/i18n/messages/en';

const messages = { de, en } as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: messages[locale as keyof typeof messages],
  };
});
