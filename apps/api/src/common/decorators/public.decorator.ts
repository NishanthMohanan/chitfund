import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opts a route out of authentication. Use only for health checks and login flows. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
