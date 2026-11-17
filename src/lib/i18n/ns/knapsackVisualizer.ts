import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/knapsackVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/knapsackVisualizer.c1155eaff1440335.json', ['knapsackVisualizer'])
  : import('../../../../messages/generated/en/ns/knapsackVisualizer.json').then(module => module.default))
