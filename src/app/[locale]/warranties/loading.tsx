import { TableSkeleton } from "@/components/LoadingSkeleton";
import { Skeleton } from "@/components/LoadingSkeleton";
export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-48 mb-6" />
      <TableSkeleton rows={8} />
    </div>
  );
}
