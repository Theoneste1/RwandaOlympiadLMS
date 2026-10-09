import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/container";
import { TECHNICAL_REPORTS } from "@/data/reports";

export const metadata: Metadata = { title: "Technical Reports" };

export default function TechnicalReportsPage() {
  return (
    <>
      <PageHero
        eyebrow="Technical Reports"
        title="Competition statistics & analysis"
        description="Published after each competition season, once available."
      />

      <Container className="py-12">
        <ul className="divide-y divide-border rounded-lg border border-border">
          {TECHNICAL_REPORTS.map((report) => (
            <li key={report.year} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-semibold">{report.title}</p>
                <p className="text-sm text-muted-foreground">{report.year}</p>
              </div>
              {report.fileUrl ? (
                <a
                  href={report.fileUrl}
                  className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  View report
                </a>
              ) : (
                <span className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
                  Coming soon
                </span>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
