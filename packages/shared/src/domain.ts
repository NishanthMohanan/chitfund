import { z } from 'zod';
import { istDateFromIso } from './dates';
import { idSchema, paiseSchema, phoneSchema } from './schemas';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const optionalPhone = z
  .union([phoneSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

/** A calendar date typed as yyyy-mm-dd, parsed to midnight India time. */
export const istDateSchema = z.string().transform((value, ctx) => {
  const date = istDateFromIso(value);
  if (!date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid date' });
    return z.NEVER;
  }
  return date;
});

const positivePaise = paiseSchema.refine((value) => value > 0n, 'Enter an amount above zero');

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Enter your password').max(128),
});

export const listQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
});

export const memberInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  phone: phoneSchema,
  phoneVerified: z.boolean().default(false),
  address: optionalText(500),
  idProofType: optionalText(60),
  idProofNumber: optionalText(60),
  nomineeName: optionalText(120),
  nomineePhone: optionalPhone,
  notes: optionalText(1000),
});
export type MemberInput = z.input<typeof memberInputSchema>;

export const paymentModeInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(60),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const templateMonthInputSchema = z.object({
  monthNumber: z.number().int().min(1),
  payoutAmount: paiseSchema,
  isOrganizerMonth: z.boolean().default(false),
});

export const templateInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a name').max(120),
    chitValue: positivePaise,
    memberCount: z.number().int().min(2).max(200),
    durationMonths: z.number().int().min(2).max(240),
    monthlyInstallment: positivePaise,
    months: z.array(templateMonthInputSchema).min(2).max(240),
  })
  .superRefine((value, ctx) => {
    const numbers = value.months.map((month) => month.monthNumber).sort((a, b) => a - b);
    const complete =
      numbers.length === value.durationMonths && numbers.every((number, i) => number === i + 1);
    if (!complete) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['months'],
        message: 'Enter one payout amount for every month of the plan',
      });
    }
  });
export type TemplateInput = z.input<typeof templateInputSchema>;

export const groupCreateSchema = z.object({
  templateId: idSchema,
  name: z.string().trim().min(2, 'Enter a name').max(120),
  code: z
    .string()
    .trim()
    .min(1, 'Enter a code')
    .max(32)
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and hyphens only')
    .transform((value) => value.toUpperCase()),
  startDate: istDateSchema,
  dueDayOfMonth: z.number().int().min(1).max(31),
});

export const groupUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(120).optional(),
  /** Changing it moves the due date of every month that has not been paid out. */
  dueDayOfMonth: z.number().int().min(1).max(31).optional(),
});

export const groupMonthUpdateSchema = z.object({
  dueDate: istDateSchema.optional(),
  payoutAmount: paiseSchema.optional(),
});

export const groupStatusChangeSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']),
});

export const ticketAssignSchema = z.object({
  memberId: idSchema,
});

export const ticketReplaceSchema = z.object({
  memberId: idSchema,
  fromMonth: z.number().int().min(1),
  reason: z.string().trim().min(2, 'Enter a reason').max(500),
});

export const paymentCreateSchema = z.object({
  ticketId: idSchema,
  amount: positivePaise,
  modeId: idSchema,
  reference: optionalText(120),
  note: optionalText(500),
  paidOn: istDateSchema,
});

export const paymentReverseSchema = z.object({
  reason: z.string().trim().min(2, 'Enter a reason').max(500),
});

export const payoutCreateSchema = z.object({
  monthNumber: z.number().int().min(1),
  ticketId: idSchema,
  amount: positivePaise,
  paidOn: istDateSchema,
  modeId: idSchema.optional().nullable(),
  reference: optionalText(120),
  note: optionalText(500),
});

export const paymentListQuerySchema = z.object({
  groupId: idSchema.optional(),
  ticketId: idSchema.optional(),
  memberId: idSchema.optional(),
});

export const dueListQuerySchema = z.object({
  groupId: idSchema.optional(),
  /** "unpaid" lists tickets with an outstanding balance; "all" lists every ticket. */
  filter: z.enum(['unpaid', 'all']).default('unpaid'),
  search: z.string().trim().max(120).optional(),
});
