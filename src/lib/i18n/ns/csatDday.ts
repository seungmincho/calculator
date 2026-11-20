import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/csatDday.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/csatDday.fcfe2bf4ca07b2e1.json', ['csatDday'])
  : import('../../../../messages/generated/en/ns/csatDday.json').then(module => module.default))
