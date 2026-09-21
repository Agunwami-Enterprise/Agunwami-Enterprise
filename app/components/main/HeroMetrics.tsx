export default function HeroMetrics() {
  return (
    <section className="w-full bg-primary py-8 md:py-10 px-6 md:px-20 text-white shadow-md">
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-white/20">
        <div className="flex flex-col items-center justify-center gap-1.5 p-2">
          <span className="text-[36px] md:text-[48px] font-primary font-bold leading-none tracking-tight">
            20+
          </span>
          <span className="text-[11px] md:text-[12px] tracking-[0.2em] uppercase font-semibold text-white/90">
            Digital Solutions Delivered
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-1.5 p-2">
          <span className="text-[36px] md:text-[48px] font-primary font-bold leading-none tracking-tight">
            99.9%
          </span>
          <span className="text-[11px] md:text-[12px] tracking-[0.2em] uppercase font-semibold text-white/90">
            Platform Reliability
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-1.5 p-2">
          <span className="text-[36px] md:text-[48px] font-primary font-bold leading-none tracking-tight">
            5+
          </span>
          <span className="text-[11px] md:text-[12px] tracking-[0.2em] uppercase font-semibold text-white/90">
            Industries Served
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-1.5 p-2">
          <span className="text-[28px] md:text-[36px] font-primary font-bold leading-none tracking-tight">
            End-to-End
          </span>
          <span className="text-[11px] md:text-[12px] tracking-[0.2em] uppercase font-semibold text-white/90">
            Strategy to Deployment
          </span>
        </div>
      </div>
    </section>
  );
}
