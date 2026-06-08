const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// db/ 디렉토리는 레포 루트(<repo>/db)에 있다. (과거 Docker 이미지에서는
// backend/db 로 평탄화됐었음.) 두 위치를 모두 확인해 존재하는 쪽을 쓴다.
function resolveDbDir(sub) {
  const candidates = [
    path.join(__dirname, '..', '..', 'db', sub),
    path.join(__dirname, '..', 'db', sub),
  ];
  return candidates.find((c) => fs.existsSync(c)) || candidates[0];
}

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString });
  await client.connect();

  const seedsDir = resolveDbDir('seeds');
  const files = fs
    .readdirSync(seedsDir)
    .filter((f) => /^\d+.*\.sql$/i.test(f))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
    await client.query(sql);
    console.log(`applied seed: ${file}`);
  }

  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
