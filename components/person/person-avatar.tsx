import type { Person } from "@/types/domain";
import { PERSON_CATEGORIES } from "@/lib/relationship-types";
import { cn, initials } from "@/lib/format";

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-xl",
} as const;

export function PersonAvatar({
  person,
  size = "md",
  className,
}: {
  person: Pick<Person, "name" | "avatarUrl" | "category">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const color = PERSON_CATEGORIES[person.category].color;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-[#111115] font-semibold tracking-tight",
        SIZES[size],
        className,
      )}
      style={{ borderColor: color, color }}
    >
      {person.avatarUrl ? (
        // Plain <img>: avatars may come from any host once a database is connected.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        initials(person.name)
      )}
    </span>
  );
}
