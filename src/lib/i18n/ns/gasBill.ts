import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gasBill.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gasBill.7ddf646246b1d471.json', ['gasBill'])
  : import('../../../../messages/generated/en/ns/gasBill.json').then(module => module.default))
