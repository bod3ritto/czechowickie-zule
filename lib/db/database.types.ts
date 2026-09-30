/**
 * Supabase database types for the schema in supabase/migrations.
 * Same shape as `supabase gen types typescript` output, so it can be
 * replaced by the generated file later without touching call sites.
 */
import type {
  CONFIDENCE_VALUES,
  LORE_TYPE_VALUES,
  MEDIA_KIND_VALUES,
  PERSON_CATEGORY_VALUES,
  RELATIONSHIP_TONE_VALUES,
  RELATIONSHIP_TYPE_VALUES,
  SOURCE_TYPE_VALUES,
  STATUS_VALUES,
} from "./enums";

type Status = (typeof STATUS_VALUES)[number];
type ConfidenceLevel = (typeof CONFIDENCE_VALUES)[number];
type SourceType = (typeof SOURCE_TYPE_VALUES)[number];
type PersonCategory = (typeof PERSON_CATEGORY_VALUES)[number];
type RelationshipType = (typeof RELATIONSHIP_TYPE_VALUES)[number];
type RelationshipTone = (typeof RELATIONSHIP_TONE_VALUES)[number];
type LoreType = (typeof LORE_TYPE_VALUES)[number];
type MediaKind = (typeof MEDIA_KIND_VALUES)[number];

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Row + insert/update variants, where columns with defaults are optional. */
type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

type Timestamps = { created_at: string; updated_at: string };
type Publishable = { status: Status; published_at: string | null; archived_at: string | null };
/** Set when the row came from the public submission form (see *_submissions.sql). */
type Submittable = { submitted_at: string | null; submitted_by: string | null };

export type LocationRow = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
} & Timestamps;

export type PersonRow = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string | null;
  nickname: string | null;
  aliases: string[];
  bio: string;
  legend: string | null;
  category: PersonCategory;
  tags: string[];
  birth_date: string | null;
  first_seen: number | null;
  location_id: string | null;
  admin_notes: string | null;
} & Publishable &
  Submittable &
  Timestamps;

export type RelationshipRow = {
  id: string;
  slug: string;
  person_a: string;
  person_b: string;
  type: RelationshipType;
  strength: number;
  since_year: number | null;
  since_date: string | null;
  until_year: number | null;
  until_date: string | null;
  description: string;
  tone: RelationshipTone | null;
  confidence: ConfidenceLevel;
  source_type: SourceType;
  source_note: string | null;
  location_id: string | null;
} & Publishable &
  Submittable &
  Timestamps;

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  year: number | null;
  month: number | null;
  location_id: string | null;
  confidence: ConfidenceLevel;
  source_type: SourceType;
  source_note: string | null;
} & Publishable &
  Submittable &
  Timestamps;

export type LoreRow = {
  id: string;
  title: string | null;
  content: string;
  lore_type: LoreType;
  year: number | null;
  confidence: ConfidenceLevel;
  source_type: SourceType;
  source_note: string | null;
} & Publishable &
  Submittable &
  Timestamps;

export type MediaRow = {
  id: string;
  storage_path: string;
  kind: MediaKind;
  person_id: string | null;
  event_id: string | null;
  lore_id: string | null;
  alt: string | null;
  is_primary: boolean;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type AuditAction = "created" | "updated" | "deleted" | "published" | "unpublished" | "archived" | "imported";

export type AuditLogRow = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  details: Json | null;
  created_at: string;
};

export type ChangeRequestKind = "correction" | "removal";
export type ChangeRequestStatus = "open" | "resolved" | "rejected";

/** A visitor's request to fix or remove something on the map (see *_change_requests.sql). */
export type ChangeRequestRow = {
  id: string;
  kind: ChangeRequestKind;
  person_id: string | null;
  relationship_id: string | null;
  target_label: string;
  message: string;
  contact: string | null;
  submitted_by: string | null;
  status: ChangeRequestStatus;
  resolved_at: string | null;
  created_at: string;
};

export type EventPersonRow = { event_id: string; person_id: string };
export type EventRelationshipRow = { event_id: string; relationship_id: string };
export type LorePersonRow = { lore_id: string; person_id: string };
/** `role` exists once *_moderators.sql is applied; treat a missing value as "admin". */
export type AdminUserRow = { user_id: string; email: string; created_at: string; role?: "admin" | "moderator" };

export interface Database {
  public: {
    Tables: {
      admin_users: Table<AdminUserRow, "user_id" | "email">;
      locations: Table<LocationRow, "name">;
      people: Table<PersonRow, "slug" | "first_name">;
      relationships: Table<RelationshipRow, "slug" | "person_a" | "person_b" | "type">;
      events: Table<EventRow, "title">;
      event_people: Table<EventPersonRow, "event_id" | "person_id">;
      event_relationships: Table<EventRelationshipRow, "event_id" | "relationship_id">;
      lore: Table<LoreRow, "content">;
      lore_people: Table<LorePersonRow, "lore_id" | "person_id">;
      media: Table<MediaRow, "storage_path" | "kind">;
      audit_logs: Table<AuditLogRow, "action" | "entity_type">;
      change_requests: Table<ChangeRequestRow, "kind" | "target_label" | "message">;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      public_dataset: { Args: { include_drafts?: boolean }; Returns: Json };
      admin_import: { Args: { payload: Json; mode?: string }; Returns: Json };
      submit_person: {
        Args: {
          first_name: string;
          nickname?: string | null;
          bio?: string | null;
          category?: PersonCategory;
          related_to?: string | null;
          related_type?: RelationshipType | null;
          related_description?: string | null;
          submitted_by?: string | null;
        };
        Returns: Json;
      };
      submit_change_request: {
        Args: {
          kind: ChangeRequestKind;
          message?: string | null;
          person?: string | null;
          relationship?: string | null;
          contact?: string | null;
          submitted_by?: string | null;
        };
        Returns: Json;
      };
      submit_lore: {
        Args: {
          content: string;
          title?: string | null;
          lore_type?: LoreType;
          year?: number | null;
          person_slugs?: string[];
          submitted_by?: string | null;
        };
        Returns: Json;
      };
      submit_event: {
        Args: {
          title: string;
          description?: string | null;
          year?: number | null;
          person_slugs?: string[];
          submitted_by?: string | null;
        };
        Returns: Json;
      };
      submit_relationship: {
        Args: {
          person_a: string;
          person_b: string;
          type: RelationshipType;
          description?: string | null;
          since_year?: number | null;
          submitted_by?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      content_status: Status;
      confidence_level: ConfidenceLevel;
      source_type: SourceType;
      person_category: PersonCategory;
      relationship_type: RelationshipType;
      relationship_tone: RelationshipTone;
      lore_type: LoreType;
      media_kind: MediaKind;
    };
    CompositeTypes: Record<string, never>;
  };
}
