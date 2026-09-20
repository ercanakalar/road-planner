import {
  startTransition,
  useActionState,
  useCallback,
  useState,
} from 'react';

interface FormActionConfig<Values> {
  initialValues: Values;
  validate?: (values: Values) => string;
  submit: (values: Values) => Promise<void>;
  failureMessage: string;
}

export function useFormAction<Values extends Record<string, string>>({
  initialValues,
  validate,
  submit,
  failureMessage,
}: FormActionConfig<Values>) {
  const [values, setValues] = useState<Values>(initialValues);
  const [isEdited, setIsEdited] = useState(false);

  const [submitError, runAction, isPending] = useActionState<string, Values>(
    async (_previous, next) => {
      const invalid = validate?.(next) ?? '';
      if (invalid) return invalid;

      try {
        await submit(next);
        return '';
      } catch {
        return failureMessage;
      }
    },
    '',
  );

  const handleChange = useCallback(
    (field: keyof Values) => (value: string) => {
      setValues((previous) => ({ ...previous, [field]: value }));
      setIsEdited(true);
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    setIsEdited(false);
    startTransition(() => runAction(values));
  }, [runAction, values]);

  return {
    values,
    handleChange,
    handleSubmit,
    isPending,
    error: isEdited ? '' : submitError,
  };
}

export default useFormAction;
