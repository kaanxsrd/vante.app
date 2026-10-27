'use client';

import Image from 'next/image';
import { PinContainer } from '@/components/magicui/3d-pin';
import { useEffect, useState } from 'react';

type Step = 'compose' | 'verify' | 'sent';

const MESSAGE_LIMIT = 2000;
const RESEND_COOLDOWN = 30;

const inputClass =
  'shadow-input h-10 w-full rounded-md border border-transparent bg-white pl-4 text-sm text-neutral-700 placeholder-neutral-500 outline-none focus:ring-2 focus:ring-neutral-800 focus:outline-none active:outline-none dark:border-neutral-800 dark:bg-neutral-800 dark:text-white';
const labelClass = 'mb-2 inline-block text-sm font-medium text-neutral-600 dark:text-neutral-300';
const buttonClass =
  'relative z-10 flex items-center justify-center rounded-md border border-transparent bg-neutral-800 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_0px_0px_#FFFFFF20_inset] transition duration-200 hover:bg-neutral-900 md:text-sm disabled:opacity-60';
const linkButtonClass =
  'text-sm text-neutral-600 underline-offset-4 hover:underline disabled:opacity-50 disabled:no-underline dark:text-neutral-400';

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export default function ContactPage() {
  const [step, setStep] = useState<Step>('compose');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestCode() {
    setError(null);
    setLoading(true);
    try {
      const data = await post('/api/contact/verify', { email, website });
      setToken(data.token);
      setCode('');
      setStep('verify');
      setCooldown(RESEND_COOLDOWN);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCompose(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await requestCode();
  }

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await post('/api/contact', { name, email, message, code, token, website });
      setStep('sent');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setName('');
    setEmail('');
    setMessage('');
    setCode('');
    setToken('');
    setError(null);
    setStep('compose');
  }

  return (
    <div>
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-10 md:px-6 md:py-20 lg:grid-cols-2">
        <div className="relative flex flex-col items-center overflow-hidden lg:items-start pt-4 sm:pt-10">
          <h2 className="mt-2 bg-gradient-to-b from-neutral-800 to-neutral-900 bg-clip-text text-left text-xl font-bold text-transparent md:text-3xl lg:text-5xl dark:from-neutral-200 dark:to-neutral-300">
            Contact me
          </h2>
          <p className="mt-8 max-w-lg text-center text-base text-neutral-600 md:text-left dark:text-neutral-400">
            Feel free to contact me for anything—questions, feedback, collaboration, or just to say
            hello. I&apos;m always open to connecting and happy to help!
          </p>
          <div className="relative mt-20 flex w-[600px] flex-shrink-0 -translate-x-10 items-center justify-center [perspective:800px] [transform-style:preserve-3d] sm:-translate-x-0 lg:-translate-x-32">
            <div
              className="absolute z-50 flex flex-col items-center"
              style={{
                left: '50%',
                top: '80%',
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'none',
              }}
            >
              <PinContainer
                title="I'm here"
                containerClassName="!bg-transparent !border-none !ring-0"
              />
            </div>
            <Image
              alt="world map"
              loading="lazy"
              width="500"
              height="500"
              className="[transform:rotateX(45deg)_translateZ(0px)] dark:invert dark:filter"
              src="/world.svg"
              style={{ color: 'transparent' }}
            />
          </div>
        </div>
        {/* Right Form Section */}
        <div className="relative mx-auto flex w-full max-w-2xl flex-col items-start gap-4 overflow-hidden rounded-3xl bg-gradient-to-b from-gray-100 to-gray-200 p-4 sm:p-10 dark:from-neutral-900 dark:to-neutral-950 mt-8">
          {/* SVG background pattern */}
          <div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(white,transparent)]">
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/30 to-zinc-900/30 opacity-10 [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] dark:from-zinc-900/30 dark:to-zinc-900/30">
              <svg
                aria-hidden="true"
                className="absolute inset-0 h-full w-full fill-black/100 stroke-black/100 mix-blend-overlay dark:fill-white/100 dark:stroke-white/100"
              >
                <defs>
                  <pattern
                    id="pattern-contact"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                    x="-12"
                    y="4"
                  >
                    <path d="M.5 20V.5H20" fill="none"></path>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" strokeWidth="0" fill="url(#pattern-contact)" />
                <svg x="-12" y="4" className="overflow-visible">
                  <rect strokeWidth="0" width="21" height="21" x="140" y="100" />
                  <rect strokeWidth="0" width="21" height="21" x="140" y="20" />
                  <rect strokeWidth="0" width="21" height="21" x="200" y="100" />
                  <rect strokeWidth="0" width="21" height="21" x="180" y="80" />
                  <rect strokeWidth="0" width="21" height="21" x="140" y="80" />
                </svg>
              </svg>
            </div>
          </div>
          {/* Contact Form */}
          {step === 'compose' && (
            <form className="relative z-20 w-full" onSubmit={handleCompose}>
              <div className="mb-4 w-full">
                <label className={labelClass} htmlFor="name">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  placeholder="Kaan Karahanlı"
                  className={inputClass}
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="mb-4 w-full">
                <label className={labelClass} htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  placeholder="contact@vante.app"
                  className={inputClass}
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Honeypot: invisible to people, so only bots fill it in. */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="mb-4 w-full">
                <label className={labelClass} htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  placeholder="Type your message here"
                  maxLength={MESSAGE_LIMIT}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="shadow-input w-full rounded-md border border-transparent bg-white pt-4 pl-4 text-sm text-neutral-700 placeholder-neutral-500 outline-none focus:ring-2 focus:ring-neutral-800 focus:outline-none active:outline-none dark:border-neutral-800 dark:bg-neutral-800 dark:text-white min-h-24 max-h-40 resize-y"
                ></textarea>
                <p className="mt-1 text-right text-xs text-neutral-500">
                  {message.length}/{MESSAGE_LIMIT}
                </p>
              </div>
              <button className={buttonClass} type="submit" disabled={loading}>
                {loading ? 'Sending code...' : 'Continue'}
              </button>
              <p className="mt-3 text-xs text-neutral-500">
                To keep spam out, I&apos;ll email you a 6-digit code to confirm your address before
                your message is sent.
              </p>
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            </form>
          )}

          {step === 'verify' && (
            <form className="relative z-20 w-full" onSubmit={handleVerify}>
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                Check your email
              </h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                I sent a 6-digit code to{' '}
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{email}</span>.
                Enter it below to send your message. It expires in 10 minutes.
              </p>
              <div className="mt-6 mb-4 w-full">
                <label className={labelClass} htmlFor="code">
                  Verification code
                </label>
                <input
                  id="code"
                  name="code"
                  placeholder="123456"
                  className={`${inputClass} font-mono tracking-[0.4em]`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              <button className={buttonClass} type="submit" disabled={loading || code.length !== 6}>
                {loading ? 'Sending...' : 'Verify & send'}
              </button>
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                <button
                  type="button"
                  className={linkButtonClass}
                  onClick={requestCode}
                  disabled={loading || cooldown > 0}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  className={linkButtonClass}
                  onClick={() => {
                    setError(null);
                    setStep('compose');
                  }}
                  disabled={loading}
                >
                  Change email or message
                </button>
              </div>
            </form>
          )}

          {step === 'sent' && (
            <div className="relative z-20 w-full">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                Message sent
              </h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Thanks, {name.split(' ')[0]}! Your email is confirmed and your message is on its
                way. I&apos;ll reply to {email}.
              </p>
              <button type="button" className={`${buttonClass} mt-6`} onClick={startOver}>
                Send another message
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="h-7 md:hidden w-full" aria-hidden="true" />
    </div>
  );
}
