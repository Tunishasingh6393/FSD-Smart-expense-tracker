/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { registerUser, loginUser, getMyProfile } from '../controllers/authController';
import { getDashboardSummaryData, addManualTx, getTransactionsList } from '../controllers/expenseController';
import { authRequired } from '../middleware/auth';

const router = Router();

// Authentication Interfaces
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);
router.get('/auth/me', authRequired, getMyProfile);

// Core Wealth Ledger interfaces 
router.get('/dashboard/summary', authRequired, getDashboardSummaryData);
router.get('/transactions', authRequired, getTransactionsList);
router.post('/transactions', authRequired, addManualTx);

export default router;
