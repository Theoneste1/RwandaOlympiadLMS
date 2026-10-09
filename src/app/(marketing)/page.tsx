import Link from "next/link";
import { Container } from "@/components/container";
import { CompetitionCard } from "@/components/competition-card";
import { COMPETITIONS } from "@/data/competitions";
import { SITE } from "@/lib/site-config";

const STATS = [
  { label: "Provinces reached", value: "5" },
  { label: "Schools participating", value: "500+" },
  { label: "Students annually", value: "50,000+" },
  { label: "Exam centers", value: "20+" },
];

export default function Home() {
  return (
    <>
      <section className="bg-brand text-brand-foreground">
        <Container className="py-20 lg:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold">
            {SITE.name}
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-4xl font-normal tracking-tight sm:text-5xl lg:text-6xl">
            {SITE.tagline}
          </h1>
          <p className="mt-4 max-w-xl text-brand-foreground/80">{SITE.description}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/competitions"
              className="inline-flex items-center rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:brightness-95"
            >
              Explore Competitions
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-md border border-brand-foreground/40 px-6 py-3 text-sm font-semibold hover:bg-brand-foreground/10"
            >
              Register a Student
            </Link>
          </div>
        </Container>
      </section>

      <section className="border-b border-border bg-muted">
        <Container className="grid grid-cols-2 gap-8 py-10 text-center sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-brand">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </Container>
        <Container className="pb-6">
          <p className="text-xs text-muted-foreground">
            Placeholder figures shown above — replace with verified statistics.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl font-normal tracking-tight">Upcoming Competitions</h2>
              <p className="mt-2 text-muted-foreground">
                National competitions open for registration across Rwanda.
              </p>
            </div>
            <Link href="/competitions" className="text-sm font-semibold text-brand hover:underline">
              View all competitions →
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {COMPETITIONS.slice(0, 3).map((competition) => (
              <CompetitionCard key={competition.slug} competition={competition} />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-border bg-muted py-16">
        <Container className="grid gap-10 lg:grid-cols-3">
          <div>
            <h2 className="font-serif text-3xl font-normal tracking-tight">Why the Foundation exists</h2>
            <p className="mt-3 text-muted-foreground">
              We identify and celebrate mathematical and scientific talent in
              students across every province, and connect schools with a
              consistent national competition structure. Placeholder mission
              copy — replace with the Foundation&apos;s official statement.
            </p>
            <Link href="/about" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
              Learn more about us →
            </Link>
          </div>
          <div>
            <h3 className="font-semibold">For Students & Teachers</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Register for competitions, find your nearest exam center, and
              access results and certificates once available.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">For Schools</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage bulk student registrations, coordinate with exam
              centers, and track your school&apos;s participation each season.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
