import type { LanguageId, ServerLanguageId } from '@shared/language-registry';
import { hasLanguageServer } from '@shared/language-registry';

export function serverLanguage(languageId: LanguageId): ServerLanguageId | null {
  return hasLanguageServer(languageId) ? languageId : null;
}
