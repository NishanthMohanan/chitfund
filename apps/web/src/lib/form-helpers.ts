import {
  PAGE_SIZE_MAX,
  formatIstDate,
  paiseFromString,
  parseRupeesToPaise,
} from '@chitfund/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, NetworkError } from './api';

/** A rupee amount typed by a person, e.g. "2,500" or "2500.50". */
export const rupeesSchema = z
  .string()
  .trim()
  .min(1, 'Enter an amount')
  .refine((value) => parseRupeesToPaise(value) !== null, 'Enter a valid amount');

/** Typed rupees as the decimal paise string the API expects. */
export function rupeesToPaise(value: string): string {
  const paise = parseRupeesToPaise(value);
  if (paise === null) {
    throw new Error('Invalid rupee amount');
  }
  return paise.toString();
}

/** Paise from the API as text for a rupee input, e.g. "250000" to "2500". */
export function paiseToRupees(paise: string): string {
  const value = paiseFromString(paise);
  const whole = value / 100n;
  const fraction = value % 100n;
  return fraction === 0n ? whole.toString() : `${whole}.${fraction.toString().padStart(2, '0')}`;
}

export function todayIso(): string {
  return formatIstDate(new Date(), 'yyyy-MM-dd');
}

export function toIsoDay(value: string): string {
  return formatIstDate(new Date(value), 'yyyy-MM-dd');
}

/** National part of an E.164 Indian number, for editing in `<PhoneInput>`. */
export function nationalPhone(phone: string | null): string {
  return phone ? phone.replace(/^\+91/, '') : '';
}

/** Lists that feed a select fetch one full page. */
export const PICKER_PAGE = { page: 1, pageSize: PAGE_SIZE_MAX } as const;

export function errorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }
  if (error instanceof NetworkError) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  if (error instanceof ApiError) {
    return error.status >= 500 ? 'Something went wrong. Try again.' : error.message;
  }
  return 'Something went wrong. Try again.';
}

/** Puts the server's field errors under the matching form fields. */
export function applyFieldErrors<T extends FieldValues>(form: UseFormReturn<T>, error: unknown) {
  if (!(error instanceof ApiError)) {
    return;
  }
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if (field in form.getValues()) {
      form.setError(field as Path<T>, { message: messages[0] });
    }
  }
}

/**
 * A change that refreshes every screen when it succeeds. One organizer on one
 * laptop: refetching everything is cheap and never leaves a stale total.
 */
export function useChange<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  onSuccess?: (result: TResult, input: TInput) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (result, input) => {
      await queryClient.invalidateQueries();
      onSuccess?.(result, input);
    },
  });
}
