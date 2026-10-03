'use client'

import sharedKo from '../../../messages/generated/ko/shared.json'
import sharedEn from '../../../messages/generated/en/shared.json'
import runningKo from '../../../messages/generated/ko/runningPace.json'
import runningEn from '../../../messages/generated/en/runningPace.json'
import { createTranslations } from './translationLookup'

export const runningTranslations = {
  ko: createTranslations({ ...sharedKo, ...runningKo }),
  en: createTranslations({ ...sharedEn, ...runningEn }),
}
