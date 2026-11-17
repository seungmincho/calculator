import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/convexHullVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/convexHullVisualizer.f062fd3ef66424db.json', ['convexHullVisualizer'])
  : import('../../../../messages/generated/en/ns/convexHullVisualizer.json').then(module => module.default))
