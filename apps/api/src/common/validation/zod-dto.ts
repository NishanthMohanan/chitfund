import { type z } from 'zod';

export type ZodDto<S extends z.ZodTypeAny> = {
  new (): z.output<S>;
  readonly schema: S;
};

/**
 * Wraps a shared Zod schema in a class so it can be used as a parameter type
 * (`@Body() body: CreateGroupDto`). The global ZodValidationPipe reads the
 * attached schema and replaces the raw input with the parsed output.
 */
export function createZodDto<S extends z.ZodTypeAny>(schema: S): ZodDto<S> {
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- parameter metadata must reference a class
  class Dto {
    static readonly schema = schema;
  }
  return Dto as unknown as ZodDto<S>;
}

export function getDtoSchema(metatype: unknown): z.ZodTypeAny | undefined {
  if (typeof metatype !== 'function' || !('schema' in metatype)) {
    return undefined;
  }
  return (metatype as { schema: z.ZodTypeAny }).schema;
}
