'use client'

import messages from '../../../messages/generated/ko/shared.json'
import { createTranslations } from './translationLookup'

// Korean-only behavior intentionally matches the existing translator.
export const useTranslations = createTranslations(messages)
