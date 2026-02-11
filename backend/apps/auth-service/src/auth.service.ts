import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  createToken(userId: string): string {
    return this.jwtService.sign({ sub: userId });
  }

  verifyToken(token: string): { sub: string } | null {
    try {
      return this.jwtService.verify<{ sub: string }>(token);
    } catch {
      return null;
    }
  }

  verifyTokenAllowExpired(token: string): { sub: string } | null {
    try {
      return this.jwtService.verify<{ sub: string }>(token, {
        ignoreExpiration: true,
      });
    } catch {
      return null;
    }
  }
}
