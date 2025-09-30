'use client';

import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PinContainer } from '@/components/magicui/3d-pin';
import { ArrowLeft } from 'lucide-react';
import { useRef, useState } from 'react';

export default function ContactPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value;
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value;
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message.');
      setSuccess(true);
      formRef.current?.reset();
    } catch (err: any) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
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
            hello. I'm always open to connecting and happy to help!
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
            <img
              alt="world map"
              loading="lazy"
              width="500"
              height="500"
              decoding="async"
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
          <form ref={formRef} className="relative z-20 w-full" onSubmit={handleSubmit}>
            <div className="mb-4 w-full">
              <label
                className="mb-2 inline-block text-sm font-medium text-neutral-600 dark:text-neutral-300"
                htmlFor="name"
              >
                Full name
              </label>
              <input
                id="name"
                name="name"
                placeholder="Kaan Karahanlı"
                className="shadow-input h-10 w-full rounded-md border border-transparent bg-white pl-4 text-sm text-neutral-700 placeholder-neutral-500 outline-none focus:ring-2 focus:ring-neutral-800 focus:outline-none active:outline-none dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
                type="text"
              />
            </div>
            <div className="mb-4 w-full">
              <label
                className="mb-2 inline-block text-sm font-medium text-neutral-600 dark:text-neutral-300"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                placeholder="contact@vante.app"
                className="shadow-input h-10 w-full rounded-md border border-transparent bg-white pl-4 text-sm text-neutral-700 placeholder-neutral-500 outline-none focus:ring-2 focus:ring-neutral-800 focus:outline-none active:outline-none dark:border-neutral-800 dark:bg-neutral-800 dark:text-white"
                type="email"
              />
            </div>

            <div className="mb-4 w-full">
              <label
                className="mb-2 inline-block text-sm font-medium text-neutral-600 dark:text-neutral-300"
                htmlFor="message"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                placeholder="Type your message here"
                className="shadow-input w-full rounded-md border border-transparent bg-white pt-4 pl-4 text-sm text-neutral-700 placeholder-neutral-500 outline-none focus:ring-2 focus:ring-neutral-800 focus:outline-none active:outline-none dark:border-neutral-800 dark:bg-neutral-800 dark:text-white min-h-24 max-h-40 resize-y"
              ></textarea>
            </div>
            <button
              className="relative z-10 flex items-center justify-center rounded-md border border-transparent bg-neutral-800 px-4 py-2 text-sm font-medium text-white shadow-[0px_1px_0px_0px_#FFFFFF20_inset] transition duration-200 hover:bg-neutral-900 md:text-sm disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Submit'}
            </button>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            {success && <p className="mt-2 text-sm text-green-600">Message sent successfully!</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
