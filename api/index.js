// Vercel Serverless Function — Express app wrapper.
// vercel.json 의 rewrites 가 모든 /api/* 요청을 이 파일로 매핑.
const { app } = require('../backend/src/index.js');

module.exports = (req, res) => app(req, res);
