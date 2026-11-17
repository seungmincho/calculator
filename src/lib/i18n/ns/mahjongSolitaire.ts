import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/mahjongSolitaire.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/mahjongSolitaire.e7b254dbc96e1e2f.json', ['mahjongSolitaire'])
  : import('../../../../messages/generated/en/ns/mahjongSolitaire.json').then(module => module.default))
