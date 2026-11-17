import type { Database } from '@realms/db';
import { ErrorCode, type LoginRequest, type RegisterRequest } from '@realms/shared';
import { AppError, isUniqueViolation } from '../../lib/errors.js';
import { accountsRepository } from './accounts.repository.js';
import { hashPassword, verifyAgainstDummy, verifyPassword } from './password.js';

export class AuthService {
  constructor(private readonly db: Database) {}

  async register(input: RegisterRequest) {
    const passwordHash = await hashPassword(input.password);
    try {
      return await accountsRepository.insert(this.db, input.email, passwordHash);
    } catch (err) {
      if (isUniqueViolation(err, 'accounts_email_uq'))
        throw new AppError(
          409,
          ErrorCode.EMAIL_TAKEN,
          'An account with this email already exists.',
        );
      throw err;
    }
  }

  async login(input: LoginRequest) {
    const account = await accountsRepository.findByEmail(this.db, input.email);
    if (!account) {
      await verifyAgainstDummy(input.password);
      throw invalidCredentials();
    }
    if (!(await verifyPassword(account.passwordHash, input.password))) throw invalidCredentials();
    if (account.status !== 'active')
      throw new AppError(403, ErrorCode.ACCOUNT_DISABLED, 'This account is not active.');
    await accountsRepository.markLogin(this.db, account.id);
    return account;
  }
}

const invalidCredentials = () =>
  new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password.');
