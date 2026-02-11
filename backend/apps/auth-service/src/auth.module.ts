import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@budget-assistant-api/prisma-client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from './user.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    JwtModule.register({
      secret: process.env.SECRET_KEY || '',
      signOptions: {
        expiresIn: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '10080') * 60,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService],
})
export class AuthModule {}
