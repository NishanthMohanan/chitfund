import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { loginSchema } from '@chitfund/shared';
import { type CookieOptions, type Request, type Response } from 'express';
import { type AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { createZodDto } from '../../common/validation/zod-dto';
import { APP_CONFIG } from '../../config/config.module';
import { type Env } from '../../config/env';
import { AuthService } from './auth.service';
import { LoginRateLimiter } from './login-rate-limiter';
import { SESSION_COOKIE } from './session-token';

class LoginDto extends createZodDto(loginSchema) {}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly limiter: LoginRateLimiter,
    @Inject(APP_CONFIG) private readonly config: Env,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.config.NODE_ENV === 'production',
      path: '/api',
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const key = req.ip ?? 'unknown';
    if (!this.limiter.allow(key)) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const result = await this.auth.login(body.phone, body.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.limiter.reset(key);
    res.cookie(SESSION_COOKIE, result.token, {
      ...this.cookieOptions(),
      maxAge: this.config.SESSION_IDLE_HOURS * 60 * 60_000,
    });
    return { user: result.user };
  }

  @Roles('SUPERADMIN', 'ORGANIZER')
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(user.sessionId);
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @Roles('SUPERADMIN', 'ORGANIZER')
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.profile(user.id);
  }
}
