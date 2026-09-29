-- New relationship type: "Triumwirat" — two people from the same legendary trio.
-- Relationships are pairs, so a trio is three "triumwirat" relationships.
alter type public.relationship_type add value if not exists 'triumwirat';
