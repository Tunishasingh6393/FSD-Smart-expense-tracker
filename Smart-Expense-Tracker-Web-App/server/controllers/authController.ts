/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { dbInstance } from '../config/db';
import { UserSchema } from '../models/Schemas';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-smart-tracker-secret-key-2026';

function digestPassword(p: string): string {
  return crypto.createHash('sha256').update(p).digest('hex');
}

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, currency } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please supply credentials email and password.' });
    }

    const dataStore = dbInstance.getRawData();
    const isExistent = dataStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (isExistent) {
      return res.status(400).json({ error: 'An active user registry matches this email address.' });
    }

    const newUser: UserSchema = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      name: name || 'Valued User',
      currency: currency || 'INR',
      passwordHash: digestPassword(password),
      createdAt: new Date().toISOString(),
    };

    dataStore.users.push(newUser);
    dbInstance.writeToDisk();

    const secureToken = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token: secureToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        currency: newUser.currency,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Controller boot runtime fault.' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Identification credentials omitted.' });
    }

    const dataStore = dbInstance.getRawData();
    const user = dataStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.passwordHash !== digestPassword(password)) {
      return res.status(401).json({ error: 'Invalid identification credentials. Check password or sign up.' });
    }

    const secureToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      token: secureToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        currency: user.currency,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Authentication error.' });
  }
};

export const getMyProfile = async (req: any, res: Response) => {
  try {
    const dataStore = dbInstance.getRawData();
    const user = dataStore.users.find(u => u.id === req.user?.id);

    if (!user) {
      return res.status(444).json({ error: 'User profiles offline or deleted.' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      currency: user.currency,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Controller profile lookup fail.' });
  }
};
