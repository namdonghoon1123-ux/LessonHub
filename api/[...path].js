// Vercel Serverless Function — catchall for /api/*
// 모든 /api/* 요청을 backend Express app 으로 위임.
// vercel.json rewrites 없이도 동작.
const { app } = require('../backend/src/index.js');

module.exports = (req, res) => app(req, res);
