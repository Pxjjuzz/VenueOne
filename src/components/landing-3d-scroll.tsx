"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/cn";

/**
 * Axonometric of a generic hall. It is a drawing, not a venue, which is why the
 * caption says so and why no price, capacity or availability number appears.
 * The roof lifts as the section scrolls to expose the floor, so the motion
 * explains what a listing actually has to describe.
 */
const HALL = { width: 420, depth: 300, height: 150 };
const ROOF_LIFT = 118;
const AXIS = Math.cos(Math.PI / 6);

function project(x: number, y: number, z: number): readonly [number, number] {
  return [(x - y) * AXIS, (x + y) * 0.5 - z];
}

function face(corners: ReadonlyArray<readonly [number, number, number]>): string {
  return corners
    .map(([x, y, z]) => {
      const [px, py] = project(x, y, z);
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
}

const { width: W, depth: D, height: H } = HALL;

const FLOOR = face([
  [0, 0, 0],
  [W, 0, 0],
  [W, D, 0],
  [0, D, 0],
]);

const ROOF = face([
  [0, 0, H],
  [W, 0, H],
  [W, D, H],
  [0, D, H],
]);

const WALL_LONG = face([
  [0, 0, 0],
  [W, 0, 0],
  [W, 0, H],
  [0, 0, H],
]);

const WALL_SHORT = face([
  [0, 0, 0],
  [0, D, 0],
  [0, D, H],
  [0, 0, H],
]);

/** One bay marked in the accent colour: the hours a booking would hold. */
const BAY = face([
  [70, 58, 1],
  [212, 58, 1],
  [212, 182, 1],
  [70, 182, 1],
]);

const GRID_STEPS = [0.25, 0.5, 0.75];

const COLUMNS: ReadonlyArray<readonly [number, number]> = [
  [W, 0],
  [0, D],
  [W, D],
];

const points: Array<{ title: string; body: string }> = [
  {
    title: "The space",
    body: "Dimensions, capacity, kitchen, stage, parking and step-free access come from the owner's listing and then an administrator's review. Nothing on a venue page is invented to fill a gap.",
  },
  {
    title: "The slot",
    body: "Availability is calculated from the booking engine and the bookings already held. Halls sell half days and full days, grounds sell hours, and a slot you cannot book is not shown as free.",
  },
  {
    title: "The total",
    body: "The amount is priced again on the server before payment, so the figure charged matches the itemised total shown to you. Refund terms are saved with the booking when it is created.",
  },
];

export function Landing3DScroll({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start end", "end start"],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  });

  const roofY = useTransform(progress, [0.15, 0.72], [-18, -ROOF_LIFT]);
  const rotateY = useTransform(progress, [0, 1], [-7, 7]);
  const rotateX = useTransform(progress, [0, 1], [5, -3]);
  const stageScale = useTransform(progress, [0, 1], [0.96, 1]);

  const staticRoofY = -ROOF_LIFT * 0.9;

  return (
    <section
      ref={stageRef}
      className={cn("border-y border-border bg-background-deep/45", className)}
      aria-labelledby="spatial-heading"
    >
      <div className="container-page py-16 sm:py-20 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-16 lg:gap-y-6">
          <div className="lg:col-start-2 lg:row-start-1">
            <Reveal>
              <p className="eyebrow">What a listing has to answer</p>
              <h2 id="spatial-heading" className="display-2 mt-2 max-w-lg">
                A space is only as bookable as the details behind it.
              </h2>
              <p className="measure mt-4 text-sm leading-relaxed text-muted sm:text-base">
                Every venue page is built from three things you can check before money moves:
                what the space is, when it is actually free, and what the total will be.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center">
            <Reveal>
              <div className="[perspective:1300px]">
                <motion.div
                  style={
                    reduceMotion
                      ? undefined
                      : { rotateX, rotateY, scale: stageScale, transformStyle: "preserve-3d" }
                  }
                >
                  <svg
                    viewBox="-310 -300 720 720"
                    className="mx-auto h-auto w-full max-w-[560px]"
                    role="img"
                    aria-label="Axonometric drawing of a community hall with its roof lifted away from the floor plan"
                  >
                    <defs>
                      <linearGradient id="ax-floor" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#f2f0e6" />
                        <stop offset="1" stopColor="#e2ded0" />
                      </linearGradient>
                      <linearGradient id="ax-wall" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#e6e3d6" />
                        <stop offset="1" stopColor="#d3cfc1" />
                      </linearGradient>
                      <linearGradient id="ax-roof" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#fbfaf6" />
                        <stop offset="1" stopColor="#e9e6da" />
                      </linearGradient>
                    </defs>

                    {/* Floor plate and the grid that stands in for the plan */}
                    <polygon points={FLOOR} fill="url(#ax-floor)" stroke="#a9b0a1" strokeWidth="1.2" />
                    <g stroke="#244c3b" strokeWidth="0.9" opacity="0.22">
                      {GRID_STEPS.map((fraction) => {
                        const [ax, ay] = project(W * fraction, 0, 0);
                        const [bx, by] = project(W * fraction, D, 0);
                        return <line key={`x-${fraction}`} x1={ax} y1={ay} x2={bx} y2={by} />;
                      })}
                      {GRID_STEPS.map((fraction) => {
                        const [ax, ay] = project(0, D * fraction, 0);
                        const [bx, by] = project(W, D * fraction, 0);
                        return <line key={`y-${fraction}`} x1={ax} y1={ay} x2={bx} y2={by} />;
                      })}
                    </g>

                    <polygon points={BAY} fill="#c8d59b" opacity="0.85" stroke="#a9b57c" strokeWidth="1" />

                    {/* Far walls, without a roof in the way */}
                    <polygon points={WALL_LONG} fill="url(#ax-wall)" stroke="#244c3b" strokeWidth="1.2" />
                    <polygon points={WALL_SHORT} fill="#dcd8ca" stroke="#244c3b" strokeWidth="1.2" />

                    {/* Columns standing at the free corners */}
                    {COLUMNS.map(([x, y]) => {
                      const [px, py] = project(x, y, 0);
                      return (
                        <line
                          key={`column-${x}-${y}`}
                          x1={px}
                          y1={py}
                          x2={px}
                          y2={py - H}
                          stroke="#244c3b"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          opacity="0.42"
                        />
                      );
                    })}

                    {/* Roof. Lifts away from the plan as the section scrolls. */}
                    <motion.g style={{ y: reduceMotion ? staticRoofY : roofY }}>
                      <polygon
                        points={ROOF}
                        fill="#20231f"
                        opacity="0.08"
                        transform="translate(0 14)"
                      />
                      <polygon
                        points={ROOF}
                        fill="url(#ax-roof)"
                        stroke="#244c3b"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <polygon
                        points={ROOF}
                        fill="none"
                        stroke="#244c3b"
                        strokeWidth="0.7"
                        opacity="0.3"
                        transform="translate(0 12)"
                      />
                    </motion.g>
                  </svg>
                </motion.div>
              </div>

              <p className="mt-4 max-w-md text-xs leading-relaxed text-muted">
                An illustrative axonometric of a hall, not a venue listing. The roof lifts
                away from the floor plan to show what a listing has to describe.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-start-2 lg:row-start-2">
            <Reveal delay={0.08}>
              <ol className="border-t border-border">
                {points.map((point, index) => (
                  <li
                    key={point.title}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b border-border py-5 sm:grid-cols-[3.5rem_minmax(0,1fr)]"
                  >
                    <span
                      className="font-display text-sm font-semibold text-primary tabular"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-display text-base font-semibold tracking-[-0.02em] text-foreground">
                        {point.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{point.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
