import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/container";
import { CompetitionsBrowser } from "@/components/competitions-browser";
import { COMPETITIONS } from "@/data/competitions";

export const metadata: Metadata = { title: "Competitions" };

export default function CompetitionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Competitions"
        title="National competitions for every grade level"
        description="Browse the Foundation's competition catalog by subject. Registration deadlines and exam dates shown below are placeholders."
      />

      <Container className="py-12">
        <CompetitionsBrowser competitions={COMPETITIONS} />
      </Container>
    </>
  );
}
