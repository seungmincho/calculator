'use client'

import messages from '../../../messages/generated/ko/runningPace.json'
import { createLazyEnTranslations } from './navigation'

export const useTranslations = createLazyEnTranslations(messages, () =>
  import('../../../messages/generated/en/runningPace.json').then(m => m.default))
