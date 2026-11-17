import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/yamlJsonConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/yamlJsonConverter.e25e8c5d17805528.json', ['yamlJsonConverter'])
  : import('../../../../messages/generated/en/ns/yamlJsonConverter.json').then(module => module.default))
