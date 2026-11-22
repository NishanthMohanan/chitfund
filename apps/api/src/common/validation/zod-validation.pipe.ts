import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { getDtoSchema } from './zod-dto';

export type FieldErrors = Record<string, string[]>;

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type === 'custom') {
      return value;
    }

    const schema = getDtoSchema(metadata.metatype);
    if (!schema) {
      return value;
    }

    const result = schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    const fieldErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
      (fieldErrors[key] ??= []).push(issue.message);
    }

    throw new BadRequestException({
      code: 'VALIDATION_FAILED',
      message: 'Some fields need attention',
      fieldErrors,
    });
  }
}
