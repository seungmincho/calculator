import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/customsDuty.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/customsDuty.feb5fff3d72de7cf.json', ['customsDuty'])
  : import('../../../../messages/generated/en/ns/customsDuty.json').then(module => module.default))
