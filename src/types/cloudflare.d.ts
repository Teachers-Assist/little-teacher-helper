// Cloudflare 綁定型別（會被 git 追蹤，CI build 也讀得到）。
//
// 注意：根目錄的 `cloudflare-env.d.ts` 被 .gitignore 忽略（那是 `cf-typegen` 的產物），
// 不會 commit，所以型別宣告必須放在這個受追蹤的檔案，否則 CI 端 CloudflareEnv 會缺 DB。
//
// 用 `import type` 只引入需要的型別、再 `declare global` 擴充全域 CloudflareEnv，
// 避免用三斜線 <reference> 把 Workers 版 Request/Response 灌進整個專案而與 DOM 型別衝突。
import type { D1Database, Fetcher } from '@cloudflare/workers-types';

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    ASSETS: Fetcher;
  }
}

export {};
