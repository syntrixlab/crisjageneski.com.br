import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface UserPayload extends JwtPayload {
      id: string;
      email: string;
      role: 'admin' | 'editor' | 'user';
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
