import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/container";
import { ContactForm } from "@/components/contact-form";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Get in touch with the Foundation" />

      <Container className="grid gap-12 py-16 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContactForm />
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold">Address</p>
            <p className="text-muted-foreground">{SITE.address}</p>
          </div>
          <div>
            <p className="font-semibold">Email</p>
            <p className="text-muted-foreground">{SITE.email}</p>
          </div>
          <div>
            <p className="font-semibold">Phone</p>
            <p className="text-muted-foreground">{SITE.phone}</p>
          </div>
        </div>
      </Container>
    </>
  );
}
