import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader, Section } from "@/components/admin/common/layout";
import { LoreForm } from "@/components/admin/forms/lore-form";

export const metadata: Metadata = { title: "Nowe lore" };

export default function NewLorePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        eyebrow={
          <Link href="/admin/lore" className="hover:underline">
            Lore
          </Link>
        }
        title="Nowe lore"
      />
      <Section>
        <LoreForm />
      </Section>
    </div>
  );
}
