import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/common/layout";
import { PersonForm } from "@/components/admin/forms/person-form";

export const metadata: Metadata = { title: "Nowa osoba" };

export default function NewPersonPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        eyebrow={
          <Link href="/admin/people" className="hover:underline">
            Osoby
          </Link>
        }
        title="Nowa osoba"
        description="Imię i slug są wymagane. Nowa osoba jest domyślnie wersją roboczą — nie pojawi się publicznie, dopóki jej nie opublikujesz."
      />
      <PersonForm />
    </div>
  );
}
