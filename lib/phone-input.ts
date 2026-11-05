/** What a phone box accepts while typing: digits, spaces, dashes and one leading +, at most 10 digits after an optional +91/91/0. */
export function cleanPhoneInput(raw: string): string {
  const plus = raw.trimStart().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  const prefix = (plus && digits.startsWith("91")) || (!plus && digits.length > 10 && digits.startsWith("91")) ? "91" : !plus && digits.startsWith("0") ? "0" : "";
  const rest = digits.slice(prefix.length, prefix.length + 10);
  return `${plus ? "+" : ""}${prefix}${rest}`;
}

/** Props for a phone <input>: numeric keypad on phones, letters and extra digits are dropped as you type. */
export const phoneInputProps = {
  type: "tel",
  inputMode: "tel" as const,
  maxLength: 13,
  onInput: (e: React.FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const clean = cleanPhoneInput(el.value);
    if (clean !== el.value) el.value = clean;
  },
};
