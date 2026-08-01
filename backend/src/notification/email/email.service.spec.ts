import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';

import { createConfigMock } from 'src/testing/mocks';
import { EmailService } from './email.service';

jest.mock('nodemailer');

const mailConfig = {
  MAIL_HOST: 'smtp.example.com',
  MAIL_PORT: 587,
  MAIL_USERNAME: 'mailer',
  MAIL_PASSWORD: 'pw',
  MAIL_FROM: 'no-reply@example.com',
  MAIL_TLS_REJECT_UNAUTHORIZED: true,
};

describe('EmailService', () => {
  let service: EmailService;
  let sendMail: jest.Mock;
  let verify: jest.Mock;
  let createTransport: jest.SpyInstance;

  const build = async (overrides: Record<string, unknown> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: createConfigMock({ ...mailConfig, ...overrides }),
        },
      ],
    }).compile();

    const built = module.get(EmailService);
    built.onModuleInit();
    return built;
  };

  beforeEach(async () => {
    sendMail = jest.fn().mockResolvedValue({ messageId: 'id' });
    verify = jest.fn().mockResolvedValue(true);
    createTransport = jest
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue({ sendMail, verify } as never);

    service = await build();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('verifies TLS certificates by default', () => {
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ tls: { rejectUnauthorized: true } }),
    );
  });

  it('honours MAIL_TLS_REJECT_UNAUTHORIZED=false when explicitly configured', async () => {
    createTransport.mockClear();
    await build({ MAIL_TLS_REJECT_UNAUTHORIZED: false });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ tls: { rejectUnauthorized: false } }),
    );
  });

  it('does not pin a retired TLS cipher', () => {
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        tls: expect.not.objectContaining({ ciphers: 'SSLv3' }),
      }),
    );
  });

  it('builds the transport from configuration rather than process.env', () => {
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 587,
        auth: { user: 'mailer', pass: 'pw' },
      }),
    );
  });

  it('sends mail with the configured sender', async () => {
    await service.sendEmail({
      to: 'user@example.com',
      subject: 'Hi',
      html: '<p>Hi</p>',
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Hi',
        from: 'no-reply@example.com',
      }),
    );
  });

  it('resolves true on a successful send', async () => {
    await expect(
      service.sendEmail({ to: 'a@b.com', subject: 's', html: 'h' }),
    ).resolves.toBe(true);
  });

  it('surfaces a transport failure as a 500 rather than resolving', async () => {
    sendMail.mockRejectedValue(new Error('smtp down'));

    await expect(
      service.sendEmail({ to: 'a@b.com', subject: 's', html: 'h' }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('does not leak the underlying transport error to the caller', async () => {
    sendMail.mockRejectedValue(new Error('AUTH failed for user mailer'));

    await expect(
      service.sendEmail({ to: 'a@b.com', subject: 's', html: 'h' }),
    ).rejects.toThrow('Failed to send email');
  });

  describe('verifyConnection', () => {
    it('resolves when the transport verifies', async () => {
      await expect(service.verifyConnection()).resolves.toBeUndefined();
    });

    it('throws when the transport cannot be reached', async () => {
      verify.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.verifyConnection()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
