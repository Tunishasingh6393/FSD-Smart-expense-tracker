/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api';

const app = express();
const PORT = process.env.PORT || 4000;

// Setup Middleware standard parameters
app.use(cors());
app.use(express.json());

// API Entry router
app.use('/api', apiRouter);

// Service default health ping diagnostic
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Core Ledger Gateway Node'
  });
});

app.listen(PORT, () => {
  console.log(`[Smart Expense Tracker Backend REST node] running successfully on port ${PORT}`);
});

export default app;
