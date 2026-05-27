/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-smart-tracker-secret-key-2026';

export interface SecuredRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export function authRequired(req: SecuredRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'OAuth Session validation context failed. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Active login token expired or signature failed. Please login again.' });
    }
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
    next();
  });
}
