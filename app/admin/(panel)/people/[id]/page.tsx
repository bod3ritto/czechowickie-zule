import type { Metadata } from "next";
import { getPersonDetail } from "@/lib/queries/admin";
import { PersonEditor } from "@/components/admin/person/person-editor";

export async function generateMetadata({ params }: PageProps<"/admin/people/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { person } = await getPersonDetail(id);
  return { title: person.first_name };
}

export default async function PersonPage({ params }: PageProps<"/admin/people/[id]">) {
  const { id } = await params;
  const detail = await getPersonDetail(id);
  // key: a fresh editor (and form state) per person
  return (
    <div className="mx-auto max-w-6xl">
      <PersonEditor key={detail.person.id} {...detail} />
    </div>
  );
}
