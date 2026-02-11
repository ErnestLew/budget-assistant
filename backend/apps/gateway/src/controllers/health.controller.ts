import { Controller, Get } from '@nestjs/common';
import { Public } from '../guards/jwt-auth.guard';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  health() {
    return { status: 'healthy', version: '1.0.0' };
  }
}
