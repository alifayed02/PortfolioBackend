import { Router } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';

import { chat, rebuildVectorStore } from '../controllers/chat_controller.js';

const router = Router();

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many requests, try again later.',
  });

router.post('/chat', limiter, express.json(), chat);
router.post('/rebuild-vector-store', limiter, express.json(), rebuildVectorStore);

export default router;