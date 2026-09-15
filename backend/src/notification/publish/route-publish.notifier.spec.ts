import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from 'src/prisma/prisma.service';
import {
  createConfigMock,
  createPrismaMock,
  PrismaMock,
} from 'src/testing/mocks';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../inbox/notification.service';
import { escapeHtml, RoutePublishNotifier } from './route-publish.notifier';

const ROAD_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const AUTHOR_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';

describe('RoutePublishNotifier', () => {
  let notifier: RoutePublishNotifier;
  let prisma: PrismaMock;
  let email: { sendEmail: jest.Mock };
  let inbox: { notifyMany: jest.Mock };

  const publishedRoad = (overrides: Record<string, unknown> = {}) => ({
    id: ROAD_ID,
    title: 'Aegean coast',
    userId: AUTHOR_ID,
    user: { nickName: 'ercan', firstName: 'Ercan' },
    ...overrides,
  });

  const followers = (...emails: (string | null)[]) =>
    emails.map((address, index) => ({
      follower: {
        id: `follower-${index}`,
        email: address,
        notifyByEmail: true,
      },
    }));

  /** Somebody who wants the inbox line but not the email. */
  const quietFollower = (id: string) => ({
    follower: { id, email: `${id}@example.com`, notifyByEmail: false },
  });

  beforeEach(async () => {
    prisma = createPrismaMock();
    email = { sendEmail: jest.fn().mockResolvedValue(true) };
    inbox = { notifyMany: jest.fn().mockResolvedValue(0) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutePublishNotifier,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
        { provide: NotificationService, useValue: inbox },
        {
          provide: ConfigService,
          useValue: createConfigMock({
            SHARE_LINK_BASE_URL: 'https://routes.example/',
            FRONTEND_URL: 'https://app.example',
          }),
        },
      ],
    }).compile();

    notifier = module.get(RoutePublishNotifier);

    prisma.road.findFirst.mockResolvedValue(publishedRoad());
    prisma.authorFollow.findMany.mockResolvedValue([]);
  });

  it('writes to each follower of the author', async () => {
    prisma.authorFollow.findMany.mockResolvedValue(
      followers('one@example.com', 'two@example.com'),
    );

    await expect(notifier.notifyFollowers(ROAD_ID)).resolves.toBe(2);

    expect(email.sendEmail).toHaveBeenCalledTimes(2);
    expect(email.sendEmail.mock.calls.map(([payload]) => payload.to)).toEqual([
      'one@example.com',
      'two@example.com',
    ]);
  });

  it('looks up followers of the author, not of the route', async () => {
    await notifier.notifyFollowers(ROAD_ID);

    expect(prisma.authorFollow.findMany.mock.calls[0][0].where).toEqual({
      authorId: AUTHOR_ID,
    });
  });

  it('names the author and the route, and links to it', async () => {
    prisma.authorFollow.findMany.mockResolvedValue(
      followers('one@example.com'),
    );

    await notifier.notifyFollowers(ROAD_ID);

    const [payload] = email.sendEmail.mock.calls[0];

    expect(payload.subject).toBe('ercan published a new route');
    expect(payload.html).toContain('Aegean coast');
    expect(payload.html).toContain(`https://routes.example/route/${ROAD_ID}`);
  });

  it('says nothing to anyone about a route that is no longer public', async () => {
    // The road may have been unpublished, or deleted, between the write and
    // this running — which is not a failure, just nothing left to announce.
    prisma.road.findFirst.mockResolvedValue(null);

    await expect(notifier.notifyFollowers(ROAD_ID)).resolves.toBe(0);
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('sends to the rest when one address fails', async () => {
    prisma.authorFollow.findMany.mockResolvedValue(
      followers('one@example.com', 'two@example.com'),
    );
    email.sendEmail.mockRejectedValueOnce(new Error('mailbox full'));

    await expect(notifier.notifyFollowers(ROAD_ID)).resolves.toBe(1);
    expect(email.sendEmail).toHaveBeenCalledTimes(2);
  });

  it('never lets a mail failure reach the caller', async () => {
    prisma.authorFollow.findMany.mockRejectedValue(new Error('database gone'));

    // The route is already saved by the time this runs, so a notifier that
    // threw would turn a successful publish into an error on the owner's
    // screen.
    expect(() => notifier.notifyInBackground(ROAD_ID)).not.toThrow();

    await new Promise((resolve) => setImmediate(resolve));
  });

  it('files an inbox line for every follower', async () => {
    prisma.authorFollow.findMany.mockResolvedValue(
      followers('one@example.com', 'two@example.com'),
    );

    await notifier.notifyFollowers(ROAD_ID);

    expect(inbox.notifyMany).toHaveBeenCalledWith(
      ['follower-0', 'follower-1'],
      { kind: 'ROUTE_PUBLISHED', actorId: AUTHOR_ID, roadId: ROAD_ID },
    );
  });

  it('still files the inbox line for somebody who turned email off', async () => {
    // The two are separate switches. Turning off the mail must not take the
    // notification they actually see with it.
    prisma.authorFollow.findMany.mockResolvedValue([quietFollower('quiet')]);

    await expect(notifier.notifyFollowers(ROAD_ID)).resolves.toBe(0);

    expect(inbox.notifyMany).toHaveBeenCalledWith(
      ['quiet'],
      expect.objectContaining({ roadId: ROAD_ID }),
    );
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('emails only the followers who still want it', async () => {
    prisma.authorFollow.findMany.mockResolvedValue([
      ...followers('loud@example.com'),
      quietFollower('quiet'),
    ]);

    await notifier.notifyFollowers(ROAD_ID);

    expect(email.sendEmail.mock.calls.map(([p]) => p.to)).toEqual([
      'loud@example.com',
    ]);
  });

  it('writes the inbox before the mail goes out', async () => {
    // The inbox is the copy people see and costs one statement; it must not be
    // lost because a mail server was slow or down.
    prisma.authorFollow.findMany.mockResolvedValue(
      followers('one@example.com'),
    );
    email.sendEmail.mockRejectedValue(new Error('smtp down'));

    await notifier.notifyFollowers(ROAD_ID);

    expect(inbox.notifyMany).toHaveBeenCalled();
  });

  it('escapes a title that contains markup', () => {
    expect(escapeHtml('<b>Rally</b> & "co"')).toBe(
      '&lt;b&gt;Rally&lt;/b&gt; &amp; &quot;co&quot;',
    );
  });
});
