import { HeroSection } from "@/features/landing/components/hero-section";
import { TickerSection } from "@/features/landing/components/ticker-section";
import { ProblemSection } from "@/features/landing/components/problem-section";
import { SolutionSection } from "@/features/landing/components/solution-section";
import { ProcessSection } from "@/features/landing/components/process-section";
import { WhyZanSection } from "@/features/landing/components/why-zan-section";
import { SecuritySection } from "@/features/landing/components/security-section";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <TickerSection />
      <ProblemSection />
      <SolutionSection />
      <ProcessSection />
      <WhyZanSection />
      <SecuritySection />
    </div>
  );
}
