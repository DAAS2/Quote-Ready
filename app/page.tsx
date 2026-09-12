import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "QuoteReady — Stop quoting blind",
  description:
    "QuoteReady turns vague trade enquiries into quote-ready job scopes — showing exactly what is known, missing, assumed, unsafe, or requires a site inspection before you commit to a price.",
};

export default function Landing() {
  return <LandingPage />;
}
