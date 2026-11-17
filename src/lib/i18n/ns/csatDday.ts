import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/csatDday.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/csatDday.ae62beba4a790867.json', ['csatDday'])
  : import('../../../../messages/generated/en/ns/csatDday.json').then(module => module.default))
