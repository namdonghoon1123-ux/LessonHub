// Vercel Serverless wrapper around the existing Express app.
// vercel.json rewrites every /api/* request here, so the Express
// router seen by browsers is identical to the Docker deployment.
const { app } = require('../backend/src/index.js');
module.exports = app;
