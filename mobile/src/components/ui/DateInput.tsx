import { useState } from 'react';

import { brToISO, shortDate } from '@/lib/dates';
import { Input, type InputProps } from './Input';

/** Data em formato brasileiro (DD/MM/AAAA) com máscara; devolve ISO (YYYY-MM-DD) ou null. */
export function DateInput({ value, onChange, ...props }: Omit<InputProps, 'value' | 'onChange'> & { value: string | null; onChange: (iso: string | null) => void }) {
  // valor inicial na montagem; formulários que recarregam dados remontam o campo (key)
  const [textValue, setText] = useState(() => (value ? shortDate(value) : ''));

  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const masked = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
    setText(masked);
    onChange(digits.length === 8 ? brToISO(masked) : null);
  };

  return <Input {...props} value={textValue} onChangeText={handle} keyboardType="number-pad" placeholder="DD/MM/AAAA" maxLength={10} />;
}
