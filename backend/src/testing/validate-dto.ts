import { ValidationPipe } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: false,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
});

export async function validateDto<T extends object>(
  cls: ClassConstructor<T>,
  payload: unknown,
): Promise<T> {
  return (await pipe.transform(payload, {
    type: 'body',
    metatype: cls,
  })) as T;
}

export async function collectDtoErrors<T extends object>(
  cls: ClassConstructor<T>,
  payload: unknown,
): Promise<string[]> {
  try {
    await validateDto(cls, payload);
    return [];
  } catch (error) {
    const response = (error as { response?: { message?: string[] | string } })
      .response;
    const message = response?.message ?? [];
    return Array.isArray(message) ? message : [message];
  }
}
