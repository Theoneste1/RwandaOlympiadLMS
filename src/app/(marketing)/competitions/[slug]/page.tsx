import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { PageHero } from "@/components/page-hero";
import { COMPETITIONS, getCompetitionBySlug } from "@/data/competitions";

export function generateStaticParams() {
  return COMPETITIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const competition = getCompetitionBySlug(slug);
  return { title: competition?.name ?? "Competition" };
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const competition = getCompetitionBySlug(slug);
  if (!competition) notFound();

  return (
    <>
      <PageHero
        eyebrow={competition.subject}
        title={competition.name}
        description={competition.summary}
      />

      <Container className="grid gap-12 py-16 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold">About this competition</h2>
          <p className="mt-3 text-muted-foreground">{competition.description}</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted p-6 text-sm">
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Format</dt>
                <dd className="font-medium">{competition.format}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Grade groups</dt>
                <dd className="font-medium text-right">{competition.gradeGroups.join(", ")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Registration deadline</dt>
                <dd className="font-medium">{competition.registrationDeadline}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Exam date</dt>
                <dd className="font-medium">{competition.examDate}</dd>
              </div>
            </dl>
          </div>

          <Link
            href="/register"
            className="block w-full rounded-md bg-brand px-4 py-3 text-center text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
          >
            Register for this competition
          </Link>
        </div>
      </Container>
    </>
  );
}
