import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/api/client';
import { toast } from '@/stores/toast';

/** Leva os erros de validação da API (422) para os campos do formulário; o resto vira toast. */
export function applyApiErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly string[]) {
  if (error instanceof ApiError && error.status === 422) {
    let mapped = false;
    for (const [key, messages] of Object.entries(error.errors)) {
      const field = fields.find((f) => key === f || key.startsWith(`${f}.`));
      if (field) {
        setError(field as Path<T>, { message: messages[0] });
        mapped = true;
      }
    }
    if (!mapped) toast.error(error.firstError);
    return;
  }
  toast.error(error instanceof ApiError ? error.firstError : 'Não foi possível concluir a operação.');
}
