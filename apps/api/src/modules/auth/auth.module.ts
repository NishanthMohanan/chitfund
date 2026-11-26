import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginRateLimiter } from './login-rate-limiter';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, LoginRateLimiter],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
