// SQL 파일을 DATABASE_URL(.env.local)로 실행한다.
// 사용: node --env-file=.env.local scripts/apply-sql.mjs <file1.sql> [file2.sql ...]
import pg from "pg";
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("사용법: node --env-file=.env.local scripts/apply-sql.mjs <file.sql ...>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL 없음 (.env.local 확인)");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});
await client.connect();
console.log("✅ 접속");
try {
  for (const f of files) {
    await client.query(readFileSync(f, "utf8"));
    console.log(`✅ ${f}`);
  }
  console.log("🎉 완료");
} catch (e) {
  console.error("❌", e.message);
  process.exit(1);
} finally {
  await client.end();
}
