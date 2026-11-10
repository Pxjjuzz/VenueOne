"use client";

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/cn";

export function ArchitecturalSculpture({
  className,
  variant = "hero",
}: {
  className?: string;
  variant?: "hero" | "hall" | "ground";
}) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 60, damping: 18, mass: 0.5 });
  const springY = useSpring(pointerY, { stiffness: 60, damping: 18, mass: 0.5 });

  const { scrollY } = useScroll();
  const scrollRotateX = useTransform(scrollY, [0, 500], [0, -10]);
  const scrollRotateY = useTransform(scrollY, [0, 500], [0, 12]);
  const scrollScale = useTransform(scrollY, [0, 500], [1, 0.94]);
  const scrollYOffset = useTransform(scrollY, [0, 500], [0, 30]);

  const pointerRotateY = useTransform(springX, [-0.5, 0.5], [-5, 5]);
  const pointerRotateX = useTransform(springY, [-0.5, 0.5], [4, -4]);
  const translateX = useTransform(springX, [-0.5, 0.5], [-7, 7]);

  useEffect(() => {
    if (reduceMotion) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        pointerX.set(event.clientX / window.innerWidth - 0.5);
        pointerY.set(event.clientY / window.innerHeight - 0.5);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pointerX, pointerY, reduceMotion]);

  return (
    <div
      className={cn("pointer-events-none relative select-none", className)}
      aria-hidden="true"
    >
      <div className="absolute inset-0 grid-floor opacity-70" />

      <motion.div
        className="relative h-full w-full"
        style={
          reduceMotion
            ? undefined
            : {
                rotateX: pointerRotateX,
                rotateY: pointerRotateY,
                x: translateX,
                scale: scrollScale,
                y: scrollYOffset,
              }
        }
      >
        <div className="perspective-stage absolute inset-0 grid place-items-center">
          <div className="relative h-[78%] w-[86%]">
            {/* Ground plane */}
            <div className="absolute bottom-[8%] left-1/2 h-[46%] w-[92%] -translate-x-1/2 tilt-scene rounded-[4px] bg-[linear-gradient(135deg,#e9e7dc_0%,#dbd7c9_60%,#cfcabb_100%)] shadow-[0_40px_80px_rgba(32,35,31,0.16)]">
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(36,76,59,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(36,76,59,0.14) 1px, transparent 1px)",
                  backgroundSize: "34px 34px",
                }}
              />
            </div>

            {/* Main architectural mass */}
            <motion.div
              className="absolute left-[13%] top-[20%] w-[54%]"
              animate={reduceMotion ? undefined : { y: [0, -7, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="arch-slab relative aspect-[1.35/1] rounded-[3px]">
                <div className="absolute inset-x-[12%] bottom-0 top-[32%] arch-slab-green rounded-t-[2px]" />
                <div className="absolute left-[18%] top-[12%] h-3 w-[44%] arch-slab-lime" />
                <div className="absolute inset-x-0 bottom-[28%] h-[3px] bg-white/60" />
                <div className="absolute bottom-0 left-[18%] h-[32%] w-[2px] bg-white/45" />
                <div className="absolute bottom-0 right-[20%] h-[44%] w-[2px] bg-white/40" />
              </div>
              <div className="absolute -bottom-[14%] left-[6%] h-[16%] w-[88%] rounded-[50%] bg-[rgba(32,35,31,0.16)] blur-xl" />
            </motion.div>

            {/* Floating slab */}
            <motion.div
              className="absolute right-[8%] top-[8%] w-[40%]"
              animate={reduceMotion ? undefined : { y: [0, 9, 0] }}
              transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            >
              <div className="arch-slab-charcoal aspect-[1.6/1] rounded-[3px]">
                <div className="absolute inset-3 border border-white/15" />
                <div className="absolute left-3 top-1/2 h-px w-1/2 bg-white/25" />
              </div>
            </motion.div>

            {/* Slim columns */}
            <div className="absolute bottom-[16%] right-[16%] flex items-end gap-[6%]">
              <motion.div
                className="arch-column h-24 w-3 rounded-t-[2px] sm:h-32"
                animate={reduceMotion ? undefined : { scaleY: [1, 1.025, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "bottom" }}
              />
              <motion.div
                className="arch-column h-16 w-3 rounded-t-[2px] sm:h-20"
                animate={reduceMotion ? undefined : { scaleY: [1, 1.04, 1] }}
                transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                style={{ transformOrigin: "bottom" }}
              />
              <motion.div
                className="arch-column h-11 w-3 rounded-t-[2px] sm:h-14"
                animate={reduceMotion ? undefined : { scaleY: [1, 1.03, 1] }}
                transition={{ duration: 7.4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                style={{ transformOrigin: "bottom" }}
              />
            </div>

            {/* Accent disc / plan view */}
            <motion.div
              className="absolute bottom-[24%] left-[2%] h-16 w-16 rounded-full border border-primary/25 bg-accent/25 sm:h-24 sm:w-24"
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute inset-[26%] rounded-full border border-primary/30" />
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary/20" />
            </motion.div>

            {/* Low plinth */}
            <div className="absolute bottom-[2%] left-[22%] h-[7%] w-[56%] rounded-[2px] bg-[linear-gradient(180deg,#f4f2ea,#d7d3c6)] shadow-[0_20px_40px_rgba(32,35,31,0.12)]" />

            {variant === "ground" ? (
              <div className="absolute bottom-[7%] left-1/2 h-[26%] w-[46%] -translate-x-1/2 rotate-[-8deg] rounded-full border border-primary/20" />
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
