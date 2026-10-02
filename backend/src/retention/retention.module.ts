import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';
import { RetentionService } from './retention.service';

@Module({
  imports: [PrismaModule],
  providers: [RetentionService],
})
export class RetentionModule {}
