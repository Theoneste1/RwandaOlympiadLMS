import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/container";
import { SCHOOLS } from "@/data/schools";

export const metadata: Metadata = { title: "Schools" };

export default function SchoolsPage() {
  return (
    <>
      <PageHero
        eyebrow="Schools"
        title="Participating schools"
        description="Sample directory shown below — replace with the Foundation's verified list of registered schools."
      />

      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCHOOLS.map((school) => (
            <div key={school.id} className="rounded-lg border border-border bg-background p-5">
              <p className="font-semibold">{school.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {school.district}, {school.province}
              </p>
              <span className="mt-3 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {school.level}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
