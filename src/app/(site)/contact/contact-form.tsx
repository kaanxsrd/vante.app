'use client';

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  type LucideIcon,
  Mail,
  MessageSquareText,
  RotateCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { type FormEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { isWellFormedEmail, LIMITS } from '@/features/contact/validation';
import type { SiteCopy } from '@/features/copy/fields';
import { cn } from '@/lib/utils';

type Step = 'compose' | 'verify' | 'sent';
type FieldName = 'name' | 'email' | 'message';
type FieldErrors = Partial<Record<FieldName, string>>;

const STEPS: Step[] = ['compose', 'verify', 'sent'];
const RESEND_COOLDOWN = 30;
const CODE_LENGTH = 6;
const COUNTER_WARNING_AT = 0.9;

const CONTROL_CLASS =
  'w-full rounded-xl border bg-background/60 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground/70 hover:border-foreground/25 focus:border-foreground/40 focus:ring-4 focus:ring-foreground/10 aria-invalid:border-critical aria-invalid:ring-critical/15';
const PRIMARY_BUTTON_CLASS =
  'group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-medium text-background outline-none transition-[transform,opacity] duration-200 hover:opacity-90 focus-visible:ring-4 focus-visible:ring-foreground/25 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50';
const QUIET_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
const PANEL_CLASS =
  'duration-300 animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none';

async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

function withBoldEmail(template: string, email: string): ReactNode {
  const parts = template.split('{email}');
  return parts.map((part, index) => (
    <span key={index}>
      {part}
      {index < parts.length - 1 && (
        <strong className="font-medium break-all text-foreground">{email}</strong>
      )}
    </span>
  ));
}

function validate(name: string, email: string, message: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = 'Please enter your name.';
  if (!isWellFormedEmail(email.trim())) errors.email = 'Please enter a valid email address.';
  if (!message.trim()) errors.message = 'Please write a message.';
  return errors;
}

function Progress({ step }: { step: Step }) {
  const current = STEPS.indexOf(step);
  return (
    <div aria-hidden="true" className="mb-7 flex gap-1.5">
      {STEPS.map((item, index) => (
        <span key={item} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <span
            className={cn(
              'block h-full origin-left rounded-full bg-foreground transition-transform duration-500 ease-out',
              index <= current ? 'scale-x-100' : 'scale-x-0',
            )}
          />
        </span>
      ))}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-critical/30 bg-critical/10 p-3 text-sm text-critical-foreground duration-200 animate-in fade-in-0 motion-reduce:animate-none"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  error,
  aside,
  children,
}: {
  id: FieldName;
  label: string;
  icon: LucideIcon;
  error?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground/90">
          {label}
        </label>
        {aside}
      </div>
      <div className="group/field relative">
        <Icon className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-muted-foreground/70 transition-colors group-focus-within/field:text-foreground" />
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-critical-foreground">
          {error}
        </p>
      )}
    </div>
  );
}

function CodeInput({
  inputRef,
  label,
  value,
  invalidCount,
  disabled,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  value: string;
  invalidCount: number;
  disabled: boolean;
  onChange: (next: string) => void;
}) {
  const [focused, setFocused] = useState(true);
  const active = Math.min(value.length, CODE_LENGTH - 1);

  return (
    <div>
      <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-foreground/90">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          required
          autoFocus
          disabled={disabled}
          value={value}
          aria-invalid={invalidCount > 0 && value.length === 0}
          onChange={(event) =>
            onChange(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))
          }
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 z-10 size-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
        />
        <div
          key={invalidCount}
          aria-hidden="true"
          className={cn('grid grid-cols-6 gap-2', invalidCount > 0 && 'code-shake')}
        >
          {Array.from({ length: CODE_LENGTH }, (_, index) => index).map((index) => {
            const digit = value[index];
            const isActive = focused && index === active;
            return (
              <span
                key={index}
                className={cn(
                  'relative flex h-14 items-center justify-center rounded-xl border bg-background/60 font-mono text-xl text-foreground transition-[border-color,box-shadow] duration-150',
                  isActive && 'border-foreground/50 ring-4 ring-foreground/10',
                  invalidCount > 0 && value.length === 0 && 'border-critical/60',
                )}
              >
                {digit ? (
                  <span className="duration-150 animate-in fade-in-0 zoom-in-50 motion-reduce:animate-none">
                    {digit}
                  </span>
                ) : (
                  isActive && <span className="code-caret h-6 w-px bg-foreground" />
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ContactForm({ copy }: { copy: SiteCopy }) {
  const [step, setStep] = useState<Step>('compose');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [cooldown, setCooldown] = useState(0);
  const [wrongCodes, setWrongCodes] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const sentRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'sent') sentRef.current?.focus();
  }, [step]);

  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function requestCode() {
    setError(null);
    setLoading(true);
    try {
      const data = await post('/api/contact/verify', { email, website });
      setToken(data.token);
      setCode('');
      setWrongCodes(0);
      setStep('verify');
      setCooldown(RESEND_COOLDOWN);
      codeRef.current?.focus();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCompose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(name, email, message);
    setFieldErrors(errors);
    const firstInvalid = (['name', 'email', 'message'] as const).find((field) => errors[field]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    await requestCode();
  }

  async function submitCode(value: string) {
    setError(null);
    setLoading(true);
    try {
      await post('/api/contact', { name, email, message, code: value, token, website });
      setStep('sent');
    } catch (err: unknown) {
      setError((err as Error).message);
      setCode('');
      setWrongCodes((count) => count + 1);
      requestAnimationFrame(() => codeRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  function changeCode(next: string) {
    setCode(next);
    if (next.length === CODE_LENGTH && !loading) void submitCode(next);
  }

  function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length === CODE_LENGTH && !loading) void submitCode(code);
  }

  function startOver() {
    setName('');
    setEmail('');
    setMessage('');
    setCode('');
    setToken('');
    setError(null);
    setFieldErrors({});
    setCooldown(0);
    setStep('compose');
  }

  const nearLimit = message.length >= LIMITS.message * COUNTER_WARNING_AT;

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card/60 p-6 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.6)] backdrop-blur sm:p-8">
      <span
        aria-hidden="true"
        className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent"
      />
      <Progress step={step} />

      {step === 'compose' && (
        <form noValidate className={cn('space-y-4', PANEL_CLASS)} onSubmit={handleCompose}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="name"
              label={copy['contact.nameLabel']}
              icon={UserRound}
              error={fieldErrors.name}
            >
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength={LIMITS.name}
                placeholder={copy['contact.namePlaceholder']}
                className={cn(CONTROL_CLASS, 'h-11 pr-3 pl-10')}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  clearFieldError('name');
                }}
              />
            </Field>
            <Field
              id="email"
              label={copy['contact.emailLabel']}
              icon={Mail}
              error={fieldErrors.email}
            >
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={LIMITS.email}
                placeholder={copy['contact.emailPlaceholder']}
                className={cn(CONTROL_CLASS, 'h-11 pr-3 pl-10')}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearFieldError('email');
                }}
              />
            </Field>
          </div>

          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>

          <Field
            id="message"
            label={copy['contact.messageLabel']}
            icon={MessageSquareText}
            error={fieldErrors.message}
            aside={
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums text-muted-foreground',
                  nearLimit && 'text-warning-foreground',
                )}
              >
                {message.length}/{LIMITS.message}
              </span>
            }
          >
            <textarea
              id="message"
              name="message"
              maxLength={LIMITS.message}
              placeholder={copy['contact.messagePlaceholder']}
              className={cn(
                CONTROL_CLASS,
                'block max-h-72 min-h-36 resize-none py-3 pr-3 pl-10 leading-relaxed [field-sizing:content]',
              )}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={fieldErrors.message ? 'message-error' : undefined}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                clearFieldError('message');
              }}
            />
          </Field>

          {error && <ErrorNote message={error} />}

          <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {copy['contact.sendingCodeLabel']}
              </>
            ) : (
              <>
                {copy['contact.continueLabel']}
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-px size-3.5 shrink-0" />
            <span>{copy['contact.verifyNote']}</span>
          </p>
        </form>
      )}

      {step === 'verify' && (
        <form className={cn('space-y-5', PANEL_CLASS)} onSubmit={handleVerify}>
          <div>
            <h2 className="title text-xl font-medium">{copy['contact.verifyHeading']}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {withBoldEmail(copy['contact.verifyBody'], email)}
            </p>
          </div>

          <CodeInput
            inputRef={codeRef}
            label={copy['contact.codeLabel']}
            value={code}
            invalidCount={wrongCodes}
            disabled={loading}
            onChange={changeCode}
          />

          {error && <ErrorNote message={error} />}

          <button
            className={PRIMARY_BUTTON_CLASS}
            type="submit"
            disabled={loading || code.length !== CODE_LENGTH}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? copy['contact.verifySending'] : copy['contact.verifySubmit']}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <button
              type="button"
              className={QUIET_BUTTON_CLASS}
              disabled={loading}
              onClick={() => {
                setError(null);
                setStep('compose');
              }}
            >
              <ArrowLeft className="size-3.5" />
              {copy['contact.changeLabel']}
            </button>
            <button
              type="button"
              className={QUIET_BUTTON_CLASS}
              disabled={loading || cooldown > 0}
              onClick={() => void requestCode()}
            >
              <RotateCw className="size-3.5" />
              {cooldown > 0
                ? fill(copy['contact.resendCountdown'], { seconds: cooldown })
                : copy['contact.resendLabel']}
            </button>
          </div>
        </form>
      )}

      {step === 'sent' && (
        <div className={cn('flex flex-col items-center py-6 text-center', PANEL_CLASS)}>
          <span className="sent-badge relative flex size-16 items-center justify-center rounded-full border bg-background/60">
            <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
              <path
                className="sent-check"
                d="M5 12.5l4.5 4.5L19 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h2 ref={sentRef} tabIndex={-1} className="title mt-5 text-xl font-medium outline-none">
            {copy['contact.sentHeading']}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {fill(copy['contact.sentBody'], { name: name.trim().split(' ')[0] ?? name, email })}
          </p>
          <button
            type="button"
            className={cn(QUIET_BUTTON_CLASS, 'mt-6 underline-offset-4 hover:underline')}
            onClick={startOver}
          >
            {copy['contact.sendAnotherLabel']}
          </button>
        </div>
      )}
    </section>
  );
}
