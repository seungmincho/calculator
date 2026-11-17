import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/devRoadmap.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/devRoadmap.032a56f3f96682c9.json', ['devRoadmap'])
  : import('../../../../messages/generated/en/ns/devRoadmap.json').then(module => module.default))
