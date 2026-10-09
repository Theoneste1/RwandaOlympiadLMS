import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Rwanda Olympiad Foundation</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Student registration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your student or coach/teacher portal account. Fields marked with * are required.
        </p>

        <div className="mt-6">
          <RegisterForm />
        </div>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Your account is created on the server and secured with a hashed password — this is a real account, not a browser-only demo.
        </p>

        <p className="mt-4 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline">Log in</Link>
        </p>
      </div>
    </Container>
  );
}
