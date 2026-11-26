import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';

/** The superadmin runs the chit business, so it has every organizer permission. */
export const ManagerOnly = () => Roles('SUPERADMIN', 'ORGANIZER');

export function notFound(message = 'Not found'): NotFoundException {
  return new NotFoundException({ code: 'NOT_FOUND', message });
}

export function rule(code: string, message: string): BadRequestException {
  return new BadRequestException({ code, message });
}

export function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ code, message });
}

/** Case-insensitive contains filter for Prisma string fields. */
export function contains(search: string | undefined) {
  return search ? { contains: search, mode: 'insensitive' as const } : undefined;
}
