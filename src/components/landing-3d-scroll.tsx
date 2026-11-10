"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { brand } from "@/lib/brand";

export function Landing3DScroll({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Pointer position for subtle interactive 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 75, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 75, damping: 20 });

  // Scroll tracking across the section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    restDelta: 0.001,
  });

  // 3D transformations driven by scroll
  const scrollRotateX = useTransform(smoothProgress, [0, 0.4, 0.8, 1], [16, 2, -6, -14]);
  const scrollRotateY = useTransform(smoothProgress, [0, 0.5, 1], [-12, 0, 10]);
  const scrollTranslateZ = useTransform(smoothProgress, [0, 0.5, 1], [-60, 20, -40]);
  const scrollScale = useTransform(smoothProgress, [0, 0.4, 0.8, 1], [0.92, 1, 0.98, 0.92]);

  // Combined rotation with mouse tilt
  const mouseRotateX = useTransform(smoothMouseY, [-0.5, 0.5], [6, -6]);
  const mouseRotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-8, 8]);

  useEffect(() => {
    if (reduceMotion) return;
    const handleMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouseX.set(e.clientX / innerWidth - 0.5);
      mouseY.set(e.clientY / innerHeight - 0.5);
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY, reduceMotion]);

  return (
    <div
      ref={containerRef}
      className={cn("relative py-12 lg:py-20 overflow-hidden", className)}
    >
      <div className="container-page">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/50 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            3D Spatial Experience
          </div>
          <h2 className="display-2 mt-3 text-foreground">
            Explore venues with real depth &amp; verified slots.
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-strong">
            Scroll down to interact with live spatial bookings. Every hall and ground has verified dimensions, capacity limits, and instant server confirmation.
          </p>
        </div>

        {/* 3D Stage Container */}
        <div
          className="relative mx-auto w-full max-w-5xl [perspective:1400px] select-none"
          style={{ minHeight: "480px" }}
        >
          <motion.div
            className="relative w-full [transform-style:preserve-3d] transition-shadow"
            style={
              reduceMotion
                ? undefined
                : {
                    rotateX: scrollRotateX,
                    rotateY: scrollRotateY,
                    scale: scrollScale,
                    z: scrollTranslateZ,
                  }
            }
          >
            {/* 3D Base Plinth with Grid Texture */}
            <div className="relative mx-auto w-full rounded-2xl border border-border/80 bg-gradient-to-b from-surface via-surface-raised to-stone/25 p-5 sm:p-8 shadow-[0_30px_90px_rgba(32,35,31,0.12)]">
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(36,76,59,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(36,76,59,0.12) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />

              {/* Grid of 3D Isometric Preview Cards */}
              <div className="relative grid gap-5 sm:gap-6 md:grid-cols-3 [transform-style:preserve-3d]">
                {/* 3D Card 1: Community Hall */}
                <motion.div
                  className="rounded-xl border border-border bg-surface p-5 shadow-[0_16px_36px_rgba(32,35,31,0.08)] [transform-style:preserve-3d]"
                  style={
                    reduceMotion
                      ? undefined
                      : {
                          transform: "translateZ(30px)",
                        }
                  }
                  whileHover={{ y: -6, z: 45 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-[0.68rem] font-semibold text-primary">
                      <Building2 className="h-3 w-3" />
                      Community Hall
                    </span>
                    <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted">
                      Live Slot
                    </span>
                  </div>

                  <h3 className="mt-3.5 font-display text-base font-semibold text-foreground">
                    Heritage Banquet &amp; Hall
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    Indiranagar, Bengaluru
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-y border-border/80 py-2.5 text-[0.72rem]">
                    <div className="flex items-center gap-1.5 text-foreground-soft">
                      <Users className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span>Capacity 450</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-foreground-soft">
                      <Clock className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span>Half &amp; Full Day</span>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-baseline justify-between">
                    <div>
                      <span className="text-[0.65rem] text-muted uppercase">From</span>
                      <p className="font-display text-lg font-bold text-primary">₹35,000</p>
                    </div>
                    <span className="text-[0.68rem] font-medium text-success bg-success-soft px-2 py-0.5 rounded">
                      Available this weekend
                    </span>
                  </div>
                </motion.div>

                {/* 3D Card 2: Community Sports Ground */}
                <motion.div
                  className="rounded-xl border border-border bg-surface p-5 shadow-[0_16px_36px_rgba(32,35,31,0.08)] [transform-style:preserve-3d]"
                  style={
                    reduceMotion
                      ? undefined
                      : {
                          transform: "translateZ(50px)",
                        }
                  }
                  whileHover={{ y: -6, z: 65 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8eed3] px-2.5 py-0.5 text-[0.68rem] font-semibold text-[#244c3b]">
                      <Compass className="h-3 w-3" />
                      Community Ground
                    </span>
                    <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted">
                      Hourly
                    </span>
                  </div>

                  <h3 className="mt-3.5 font-display text-base font-semibold text-foreground">
                    Kaveri Green Sports Turf
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    Koramangala, Bengaluru
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-y border-border/80 py-2.5 text-[0.72rem]">
                    <div className="flex items-center gap-1.5 text-foreground-soft">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                      <span>FIFA turf &amp; nets</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-foreground-soft">
                      <Clock className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span>Floodlights ready</span>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-baseline justify-between">
                    <div>
                      <span className="text-[0.65rem] text-muted uppercase">Rate</span>
                      <p className="font-display text-lg font-bold text-primary">₹1,200<span className="text-xs font-normal text-muted">/hr</span></p>
                    </div>
                    <span className="text-[0.68rem] font-medium text-primary bg-primary-soft px-2 py-0.5 rounded">
                      Instant Booking
                    </span>
                  </div>
                </motion.div>

                {/* 3D Card 3: Digital Booking Pass */}
                <motion.div
                  className="rounded-xl border border-primary/30 bg-gradient-to-br from-[#244c3b] to-[#173327] p-5 text-white shadow-[0_20px_45px_rgba(25,58,44,0.28)] [transform-style:preserve-3d]"
                  style={
                    reduceMotion
                      ? undefined
                      : {
                          transform: "translateZ(70px)",
                        }
                  }
                  whileHover={{ y: -6, z: 85 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[0.68rem] font-semibold text-[#c8d59b]">
                      <CalendarCheck className="h-3 w-3" />
                      Confirmed Pass
                    </span>
                    <span className="text-[0.65rem] font-mono tracking-wider text-white/70">
                      BK-9482
                    </span>
                  </div>

                  <h3 className="mt-3.5 font-display text-base font-semibold text-white">
                    Official Venue Pass
                  </h3>
                  <p className="mt-1 text-xs text-white/70">
                    Auto-generated receipt &amp; entry QR
                  </p>

                  <div className="my-3.5 flex items-center justify-between rounded-lg bg-white/10 p-2.5 backdrop-blur-sm">
                    <div className="text-[0.72rem] space-y-0.5">
                      <p className="text-white/60">Verified Entry</p>
                      <p className="font-semibold text-white">Gate Pass Valid</p>
                    </div>
                    <QrCode className="h-9 w-9 text-[#c8d59b] shrink-0" />
                  </div>

                  <div className="flex items-center justify-between text-[0.72rem] text-white/80 border-t border-white/15 pt-2.5">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#c8d59b]" />
                      Payment Verified
                    </span>
                    <span className="font-semibold text-[#c8d59b]">Invoice Attached</span>
                  </div>
                </motion.div>
              </div>

              {/* Bottom Feature Badges */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Real availability from database
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Razorpay test &amp; live integration
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Automatic Gmail confirmations &amp; invoices
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

