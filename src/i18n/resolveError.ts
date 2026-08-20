import type { Messages } from '@/messages';

/**
 * 用呼叫端當下的字典，把 API 錯誤碼（點分路徑，如 'student.nameRequired'）
 * 翻成本地化字串。未知或格式錯誤的碼會退回通用錯誤訊息，確保畫面不會壞掉。
 *
 * 部分錯誤要講清楚「是哪一個座號、卡在誰身上」，字典項因此是函式而非字串，
 * 由 API 一併回傳 params（見 ApiError）。params 缺漏或函式拋錯時同樣退回通用
 * 訊息——訊息不精確可以接受，畫面壞掉不行。
 */
export function resolveError(messages: Messages, code: unknown, params?: unknown): string {
  if (typeof code !== 'string') return messages.common.error;

  // 依點分路徑逐層走訪字典
  const value = code.split('.').reduce<unknown>(
    (obj, key) =>
      obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined,
    messages,
  );

  if (typeof value === 'string') return value;

  if (typeof value === 'function' && typeof params === 'object' && params !== null) {
    try {
      const text = (value as (p: unknown) => unknown)(params);
      // 少帶一個 key 不會拋錯，只會生出「座號 undefined 屬於…」這種比通用訊息更糟的
      // 文案，所以產出含 undefined 時一律退回通用訊息。
      if (typeof text === 'string' && !text.includes('undefined')) return text;
    } catch {
      // 落到下方的通用訊息
    }
  }

  return messages.common.error;
}
