"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function PublicReveal({ children, className }: { children: ReactNode; className?: string }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);
      const context = gsap.context(() => {
        const heroItems = gsap.utils.toArray<HTMLElement>("[data-public-hero-item]");
        if (heroItems.length) {
          gsap.from(heroItems, {
            autoAlpha: 0,
            duration: 0.42,
            ease: "power1.out",
            stagger: 0.09,
            y: 14
          });
        }

        const processItems = gsap.utils.toArray<HTMLElement>("[data-public-process-item]");
        if (processItems.length) {
          gsap.from(processItems, {
            duration: 0.36,
            ease: "power1.out",
            immediateRender: false,
            stagger: 0.08,
            y: 12,
            scrollTrigger: {
              trigger: processItems[0].parentElement,
              start: "top 88%",
              toggleActions: "play none none reverse"
            }
          });
        }
      }, scope);

      return () => context.revert();
    },
    { scope }
  );

  return <div ref={scope} className={className}>{children}</div>;
}
