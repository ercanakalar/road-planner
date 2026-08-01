import { collectDtoErrors, validateDto } from 'src/testing/validate-dto';
import { AssignPermitDto, UpdatePermitDto } from './permissions.dto';

const USER_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const PERMIT_ID = '909c9b35-eec3-4afe-a21d-986682659f5a';

describe('AssignPermitDto', () => {
  const valid = () => ({ userId: USER_ID, permitId: PERMIT_ID });

  it('accepts two UUIDs', async () => {
    await expect(collectDtoErrors(AssignPermitDto, valid())).resolves.toEqual(
      [],
    );
  });

  it.each(['userId', 'permitId'])('requires %s', async (field) => {
    const payload = { ...valid() } as Record<string, unknown>;
    delete payload[field];

    await expect(
      collectDtoErrors(AssignPermitDto, payload),
    ).resolves.not.toEqual([]);
  });

  it.each(['userId', 'permitId'])('rejects a non-UUID %s', async (field) => {
    await expect(
      collectDtoErrors(AssignPermitDto, { ...valid(), [field]: 'nope' }),
    ).resolves.not.toEqual([]);
  });

  it('strips undeclared properties', async () => {
    const result = await validateDto(AssignPermitDto, {
      ...valid(),
      permit: { name: 'ADMIN' },
    });

    expect(result).toEqual(valid());
  });
});

describe('UpdatePermitDto', () => {
  const PERMISSION_ID = 'c3f1d2e4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';

  it('accepts a description alone', async () => {
    await expect(
      collectDtoErrors(UpdatePermitDto, { description: 'Full access' }),
    ).resolves.toEqual([]);
  });

  it('accepts a permission set alone', async () => {
    await expect(
      collectDtoErrors(UpdatePermitDto, { permissionIds: [PERMISSION_ID] }),
    ).resolves.toEqual([]);
  });

  it('accepts an empty permission set', async () => {
    await expect(
      collectDtoErrors(UpdatePermitDto, { permissionIds: [] }),
    ).resolves.toEqual([]);
  });

  it('accepts an empty body, leaving the no-op check to the service', async () => {
    await expect(collectDtoErrors(UpdatePermitDto, {})).resolves.toEqual([]);
  });

  it('rejects a non-UUID permission id', async () => {
    await expect(
      collectDtoErrors(UpdatePermitDto, { permissionIds: ['nope'] }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a duplicated permission id', async () => {
    await expect(
      collectDtoErrors(UpdatePermitDto, {
        permissionIds: [PERMISSION_ID, PERMISSION_ID],
      }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a permission set that is not an array', async () => {
    await expect(
      collectDtoErrors(UpdatePermitDto, { permissionIds: PERMISSION_ID }),
    ).resolves.not.toEqual([]);
  });

  it('strips a name, which is not updatable', async () => {
    const result = await validateDto(UpdatePermitDto, {
      description: 'Full access',
      name: 'NOT_ADMIN',
    });

    expect(result).toEqual({ description: 'Full access' });
  });
});
