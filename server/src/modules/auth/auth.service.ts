import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { HttpError } from '../../utils/errors';
import { UserRepository } from '../../repositories/user.repository';

const repository = new UserRepository();

export async function login(email: string, password: string) {
  const user = await repository.findByEmail(email);
  if (!user) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: '2h'
  });

  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}
