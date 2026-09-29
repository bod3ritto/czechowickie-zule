/**
 * Public Supabase settings. The anon key is safe in the browser by design
 * (RLS protects the data); no service-role key is used by the app at all.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Without Supabase the public site falls back to data/*.ts and the admin shows setup instructions. */
export function isSupabaseConfigured(): boolean {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
}

export const MEDIA_BUCKET = "media";

export function mediaPublicUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
