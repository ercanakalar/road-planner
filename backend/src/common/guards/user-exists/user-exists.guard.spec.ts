import { UserExistsGuard } from './user-exists.guard';

describe('UserExistsGuard', () => {
  it('should be defined', () => {
    expect(new UserExistsGuard()).toBeDefined();
  });
});
