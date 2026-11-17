import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/powerOfAttorney.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/powerOfAttorney.cffa1af5cfc15e2e.json', ['powerOfAttorney'])
  : import('../../../../messages/generated/en/ns/powerOfAttorney.json').then(module => module.default))
