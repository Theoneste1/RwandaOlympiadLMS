import { redirect } from "next/navigation";

// The old profile page showed a demo-only, localStorage-backed identity disconnected from the
// real signed-in account. /account already shows the real Prisma user + real password change.
export default function StudentProfilePage() {
  redirect("/account");
}
