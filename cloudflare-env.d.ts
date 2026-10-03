declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    RETRY_ADMIN_EMAIL?: string;
    BUCKET?: R2Bucket;
  }
}

