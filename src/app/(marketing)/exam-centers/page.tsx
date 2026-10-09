import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/container";
import { ExamCentersList } from "@/components/exam-centers-list";

export const metadata: Metadata = { title: "Exam Centers" };

export default function ExamCentersPage() {
  return (
    <>
      <PageHero
        eyebrow="Exam Centers"
        title="Find an exam center near you"
        description="Sample exam center listings shown below — confirm your assigned center after registering for a competition."
      />

      <Container className="py-12">
        <ExamCentersList />
      </Container>
    </>
  );
}
