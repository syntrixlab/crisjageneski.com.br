import { Router } from 'express';
import * as controller from './auth.controller';

export const authRoutes = Router();

authRoutes.post('/login', controller.login);
