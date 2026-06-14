import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from '@sdarm/i18n';

export const routing = defineRouting({ locales, defaultLocale, localeCookie: false });
