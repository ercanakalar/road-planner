import { Module } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccessStrategy } from 'src/auth/strategy/access.strategy';

@Module({
  imports: [PrismaModule, ConfigModule.forRoot(), JwtModule.register({})],
  providers: [FavoritesService, AccessStrategy],
  controllers: [FavoritesController],
})
export class FavoritesModule {}
