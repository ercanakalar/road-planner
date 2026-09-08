import {
  startTransition,
  useActionState,
  useCallback,
  useState,
} from 'react';

interface FormActionConfig<Values> {
  initialValues: Values;
  /**
   * Returns a message when the values cannot be sent yet, or '' when they can.
   * Runs as part of the action, so a rejected submit never hits the network.
   */
  validate?: (values: Values) => string;
  /** Performs the request. Throw to fail. */
  submit: (values: Values) => Promise<void>;
  /** Shown when `submit` throws. */
  failureMessage: string;
}

/**
 * A text form backed by a React action: the fields, and one submit whose
 * pending flag and error message come from `useActionState` rather than from a
 * pair of `useState` calls kept in step by hand.
 *
 * Submitting runs inside a transition, so `isPending` covers validation, the
 * request and the navigation that follows it — the button stays busy for the
 * whole thing instead of only for the mutation.
 */
export function useFormAction<Values extends Record<string, string>>({
  initialValues,
  validate,
  submit,
  failureMessage,
}: FormActionConfig<Values>) {
  const [values, setValues] = useState<Values>(initialValues);
  // Whether the fields have been touched since the last submit. An error about
  // values that have since been retyped is just noise.
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
    // There is no form element to hand the action to on this platform, so the
    // transition has to be opened by hand — without it `isPending` never
    // flips and the button never shows itself as busy.
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
