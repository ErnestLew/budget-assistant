import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@budget-assistant-api/prisma-client';
import { NotificationService } from './notification.service';

@Module({
  imports: [ConfigModule.forRoot(), PrismaModule],
  providers: [NotificationService],
})
export class NotificationModule {}
