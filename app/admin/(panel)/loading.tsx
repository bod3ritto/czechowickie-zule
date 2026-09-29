import { Skeleton } from "@/components/admin/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6" role="status" aria-label="Ładowanie">
      <div className="grid gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-2">
        <Skeleton className="h-9 w-72 max-w-full" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
