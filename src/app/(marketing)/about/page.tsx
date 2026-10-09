import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/container";

export const metadata: Metadata = { title: "About" };

const VALUES = [
  {
    title: "Access",
    body: "Competitions reachable by students in every province, regardless of school resources.",
  },
  {
    title: "Rigor",
    body: "Problems and exams designed to genuinely test and build mathematical reasoning.",
  },
  {
    title: "Recognition",
    body: "Meaningful certificates and rankings that celebrate achievement at every level.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="Building a national culture of mathematical excellence"
        description="Placeholder mission statement — replace with the Foundation's official About copy."
      />

      <Container className="grid gap-12 py-16 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-bold">Our Mission</h2>
            <p className="mt-2 text-muted-foreground">
              The Rwanda Olympiad Foundation exists to organize national
              mathematics, science, and informatics competitions that reach
              students in every district, and to give schools and teachers a
              consistent, well-run competition structure to participate in
              each year. (Placeholder — replace with verified mission text.)
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold">Our Story</h2>
            <p className="mt-2 text-muted-foreground">
              Sample placeholder history paragraph. Replace with the
              Foundation&apos;s real founding story, key milestones, and
              partnerships.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted p-6">
          <h3 className="font-semibold">Quick Facts</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Founded</dt>
              <dd className="font-medium">To be announced</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Provinces covered</dt>
              <dd className="font-medium">5</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Annual competitions</dt>
              <dd className="font-medium">4</dd>
            </div>
          </dl>
        </div>
      </Container>

      <div className="border-t border-border bg-muted py-16">
        <Container>
          <h2 className="text-xl font-bold">What we value</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {VALUES.map((value) => (
              <div key={value.title} className="rounded-lg border border-border bg-background p-6">
                <h3 className="font-semibold text-brand">{value.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{value.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </>
  );
}
