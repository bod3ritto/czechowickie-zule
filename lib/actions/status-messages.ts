import type { Status } from "@/lib/db/enums";

export const STATUS_MESSAGE: Record<Status, string> = {
  published: "Zmiany opublikowane.",
  draft: "Przeniesiono do wersji roboczej.",
  archived: "Zarchiwizowano.",
};
