import { type ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  className?: string
  reverse?: boolean
  pauseOnHover?: boolean
  children: React.ReactNode
  vertical?: boolean
  repeat?: number
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
        {
          "flex-row": !vertical,
          "flex-col": vertical,
        },
        className
      )}
      style={{
        gap: "var(--gap)",
      }}
    >
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-100% - var(--gap, 1rem))); }
        }
        @keyframes marquee-reverse {
          from { transform: translateX(calc(-100% - var(--gap, 1rem))); }
          to { transform: translateX(0); }
        }
        .magic-marquee-item {
          animation: marquee var(--duration) linear infinite;
        }
        .magic-marquee-reverse {
          animation: marquee-reverse var(--duration) linear infinite;
        }
        .group:hover .magic-marquee-pause:hover,
        .group:hover .magic-marquee-item {
          animation-play-state: paused;
        }
      `}</style>
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex shrink-0 justify-around",
              reverse ? "magic-marquee-reverse" : "magic-marquee-item",
              pauseOnHover && "magic-marquee-pause"
            )}
            style={{
              gap: "var(--gap)",
            }}
          >
            {children}
          </div>
        ))}
    </div>
  )
}
export default Marquee
