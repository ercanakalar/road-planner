import { collectDtoErrors, validateDto } from 'src/testing/validate-dto';
import { UpdateUserDto } from './update-user.dto';

const ADMIN_PERMIT_ID = '909c9b35-eec3-4afe-a21d-986682659f5a';

describe('UpdateUserDto', () => {
  describe('privilege escalation (C2)', () => {
    it('strips permitId, so a client cannot promote itself to ADMIN', async () => {
      const result = await validateDto(UpdateUserDto, {
        firstName: 'Ercan',
        permitId: ADMIN_PERMIT_ID,
      });

      expect(result).not.toHaveProperty('permitId');
      expect(result).toEqual({ firstName: 'Ercan' });
    });

    it('strips email, so a client cannot take over another address', async () => {
      const result = await validateDto(UpdateUserDto, {
        firstName: 'Ercan',
        email: 'victim@example.com',
      });

      expect(result).not.toHaveProperty('email');
    });

    it('strips id, so a client cannot retarget the update', async () => {
      const result = await validateDto(UpdateUserDto, {
        id: 'some-other-user-id',
        firstName: 'Ercan',
      });

      expect(result).not.toHaveProperty('id');
    });

    it('strips deletedAt, so a client cannot soft-delete or resurrect itself', async () => {
      const result = await validateDto(UpdateUserDto, {
        firstName: 'Ercan',
        deletedAt: null,
      });

      expect(result).not.toHaveProperty('deletedAt');
    });

    it.each(['createdAt', 'updatedAt', 'tokens', 'manuelAuth', 'permit'])(
      'strips %s',
      async (field) => {
        const result = await validateDto(UpdateUserDto, {
          firstName: 'Ercan',
          [field]: 'anything',
        });

        expect(result).not.toHaveProperty(field);
      },
    );

    it('keeps stripping when no legitimate field is present', async () => {
      const result = await validateDto(UpdateUserDto, {
        permitId: ADMIN_PERMIT_ID,
      });

      expect(result).toEqual({});
    });
  });

  describe('accepted fields', () => {
    it('accepts the four mutable profile fields', async () => {
      const result = await validateDto(UpdateUserDto, {
        firstName: 'Ercan',
        lastName: 'Akalar',
        photo: 'https://cdn.example.com/a.png',
        nickName: 'ercan_a',
      });

      expect(result).toEqual({
        firstName: 'Ercan',
        lastName: 'Akalar',
        photo: 'https://cdn.example.com/a.png',
        nickName: 'ercan_a',
      });
    });

    it('accepts a partial update', async () => {
      await expect(
        validateDto(UpdateUserDto, { nickName: 'ercan_a' }),
      ).resolves.toEqual({ nickName: 'ercan_a' });
    });

    it('accepts the payload the shipped client sends', async () => {
      const result = await validateDto(UpdateUserDto, {
        id: 'user-1',
        firstName: 'Ercan',
        lastName: 'Akalar',
        email: 'ercan@example.com',
        photo: 'https://cdn.example.com/a.png',
        nickName: 'ercan_a',
      });

      expect(result).toEqual({
        firstName: 'Ercan',
        lastName: 'Akalar',
        photo: 'https://cdn.example.com/a.png',
        nickName: 'ercan_a',
      });
    });
  });

  describe('nickName', () => {
    it('rejects a nickname shorter than 3 characters', async () => {
      await expect(
        collectDtoErrors(UpdateUserDto, { nickName: 'ab' }),
      ).resolves.toEqual(
        expect.arrayContaining([expect.stringMatching(/nickName/)]),
      );
    });

    it('rejects a nickname longer than 30 characters', async () => {
      await expect(
        collectDtoErrors(UpdateUserDto, { nickName: 'a'.repeat(31) }),
      ).resolves.toEqual(
        expect.arrayContaining([expect.stringMatching(/nickName/)]),
      );
    });

    it.each(['has space', 'has/slash', 'quote"', 'semi;colon', '<script>'])(
      'rejects %p',
      async (nickName) => {
        await expect(
          collectDtoErrors(UpdateUserDto, { nickName }),
        ).resolves.not.toEqual([]);
      },
    );

    it.each(['ercan_a', 'ercan.a', 'ercan-a', 'Ercan123'])(
      'accepts %p',
      async (nickName) => {
        await expect(
          collectDtoErrors(UpdateUserDto, { nickName }),
        ).resolves.toEqual([]);
      },
    );

    it('trims surrounding whitespace', async () => {
      const result = await validateDto(UpdateUserDto, {
        nickName: '  ercan_a  ',
      });

      expect(result.nickName).toBe('ercan_a');
    });
  });

  describe('length limits', () => {
    it.each(['firstName', 'lastName'])(
      'rejects a %s longer than 255 characters',
      async (field) => {
        await expect(
          collectDtoErrors(UpdateUserDto, { [field]: 'a'.repeat(256) }),
        ).resolves.not.toEqual([]);
      },
    );

    it('rejects a photo URL longer than 2048 characters', async () => {
      await expect(
        collectDtoErrors(UpdateUserDto, { photo: 'a'.repeat(2049) }),
      ).resolves.not.toEqual([]);
    });
  });

  describe('type coercion', () => {
    it.each([42, true, { nested: 'object' }, ['array']])(
      'rejects %p as a firstName',
      async (firstName) => {
        await expect(
          collectDtoErrors(UpdateUserDto, { firstName }),
        ).resolves.not.toEqual([]);
      },
    );
  });

  it('collapses an empty string to undefined rather than blanking the field', async () => {
    const result = await validateDto(UpdateUserDto, { firstName: '   ' });

    expect(result.firstName).toBeUndefined();
  });
});
