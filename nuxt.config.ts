import { resolve } from 'pathe'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@nuxt/content',
    '@nuxtjs/i18n',
  ],
  content: {
    documentDriven: true,
    sources: {
      content: {
        driver: 'fs',
        base: resolve(__dirname, 'ctx'),
      }
    }
  },
  i18n: {
    locales: [
      {
        code: 'en',
        name: 'English',
      },
      {
        code: 'tr',
        name: 'Türkçe',
      },
      {
        code: 'se',
        name: 'Svenska',
      },
    ],
    strategy: 'prefix',
    defaultLocale: 'en',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root'
    },
  }
})
