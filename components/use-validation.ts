"use client";

import { useCallback, useState } from "react";
import type { z } from "zod";
import { fieldError, formErrors } from "@/lib/form-errors";

type Shape = Record<string, z.ZodType>;

/**
 * Live form validation using the same zod rules as the server.
 * Fields are checked when you leave them, re-checked as you fix them,
 * and the whole form is checked before it is sent.
 */
export function useValidation(shape: Shape, serverErrors?: Record<string, string>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const check = useCallback(
    (name: string, value: string) => {
      const msg = fieldError(shape, name, value);
      setErrors((e) => {
        const next = { ...e };
        if (msg) next[name] = msg;
        else delete next[name];
        return next;
      });
    },
    [shape],
  );

  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
    check(e.target.name, e.target.value);
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (touched[e.target.name] || errors[e.target.name]) check(e.target.name, e.target.value);
  };

  /** Validates everything; returns false (and focuses the first problem) if the form must not be sent. */
  const validateForm = (form: HTMLFormElement): boolean => {
    const values = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const errs = formErrors(shape, values);
    setErrors(errs);
    setTouched(Object.fromEntries(Object.keys(shape).map((k) => [k, true])));
    const first = Object.keys(shape).find((k) => errs[k]);
    if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
    return !first;
  };

  /** Use as a form's onSubmit: blocks the server action when something is invalid. */
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!validateForm(e.currentTarget)) e.preventDefault();
  };

  const error = (name: string) => errors[name] ?? (touched[name] ? undefined : serverErrors?.[name]);
  return { error, check, onBlur, onChange, onSubmit, validateForm, bind: { onBlur, onChange } };
}
