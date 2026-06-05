import type { Messages } from '@/messages';

/**
 * 用呼叫端當下的字典，把 API 錯誤碼（點分路徑，如 'student.nameRequired'）
 * 翻成本地化字串。未知或格式錯誤的碼會退回通用錯誤訊息，確保畫面不會壞掉。
 */
export function resolveError(messages: Messages, code: unknown): string {
  if (typeof code !== 'string') return messages.common.error;

  // 依點分路徑逐層走訪字典
  const value = code.split('.').reduce<unknown>(
    (obj, key) =>
      obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined,
    messages,
  );

  return typeof value === 'string' ? value : messages.common.error;
}
