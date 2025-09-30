'use client';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export const PinContainer = ({
  children,
  title,
  href,
  className,
  containerClassName,
}: {
  children?: React.ReactNode;
  title?: string;
  href?: string;
  className?: string;
  containerClassName?: string;
}) => {
  return (
    <motion.a
      className={cn('relative z-50  cursor-pointer', containerClassName)}
      drag
      dragMomentum={false}
    >
      <PinPerspective title={title} href={href} />
    </motion.a>
  );
};

export const PinPerspective = ({ title, href }: { title?: string; href?: string }) => {
  return (
    <motion.div className="pointer-events-none  w-72 h-60 flex items-center justify-center opacity-100 z-[60] transition duration-500">
      <div className=" w-full h-full -mt-7 flex-none  inset-0">
        <div className="absolute top-0 inset-x-0  flex justify-center">
          <div className="relative flex space-x-2 items-center z-10 rounded-full bg-zinc-950 py-0.5 px-3 ring-1 ring-white/10 ">
            <span className="relative z-20 text-white text-xs font-bold inline-block py-0.5">
              {title}
            </span>

            <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 opacity-40"></span>
          </div>
        </div>

        <div
          style={{
            perspective: '1000px',
            transform: 'rotateX(70deg) translateZ(0)',
          }}
          className="absolute left-1/2 top-1/2 ml-[0.09375rem] mt-4 -translate-x-1/2 -translate-y-1/2"
        >
          <>
            <motion.div
              initial={{
                opacity: 0,
                scale: 0,
                transform: 'translateY(75px) translateX(78px) translate(-50%, -50%) scale(0)',
              }}
              animate={{
                opacity: [0, 1, 0.5, 0],
                scale: 1,
                transform: 'translateY(75px) translateX(78px) translate(-50%, -50%) scale(1)',
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: 0,
              }}
              className="absolute right-1/2 bottom-1/2 h-20 w-20 rounded-[50%] bg-sky-500/[0.08] shadow-[0_8px_16px_rgb(0_0_0/0.4)]"
            ></motion.div>
            <motion.div
              initial={{
                opacity: 0,
                scale: 0,
                transform: 'translateY(75px) translateX(78px) translate(-50%, -50%) scale(0)',
              }}
              animate={{
                opacity: [0, 1, 0.5, 0],
                scale: 1,
                transform: 'translateY(75px) translateX(78px) translate(-50%, -50%) scale(1)',
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: 2,
              }}
              className="absolute right-1/2 bottom-1/2 h-20 w-20 rounded-[50%] bg-sky-500/[0.08] shadow-[0_8px_16px_rgb(0_0_0/0.4)]"
            ></motion.div>
          </>
        </div>

        <>
          <motion.div className="absolute right-1/2 bottom-1/2 bg-gradient-to-b from-transparent to-cyan-500 translate-y-[14px] w-px h-32 blur-[2px]" />
          <motion.div className="absolute right-1/2 bottom-1/2 bg-gradient-to-b from-transparent to-cyan-500 translate-y-[14px] w-px h-32  " />
          <motion.div className="absolute right-1/2 translate-x-[1.5px] bottom-1/2 bg-cyan-600 translate-y-[14px] w-[4px] h-[4px] rounded-full z-40 blur-[3px]" />
          <motion.div className="absolute right-1/2 translate-x-[0.5px] bottom-1/2 bg-cyan-300 translate-y-[14px] w-[2px] h-[2px] rounded-full z-40 " />
        </>
      </div>
    </motion.div>
  );
};
