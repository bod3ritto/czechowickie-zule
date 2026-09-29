-- 10 more person categories (colour of the node outline on the map).
-- `add value` is not transactional with later use of the value, so this file
-- only extends the enum; nothing else depends on the new values here.
alter type public.person_category add value if not exists 'swiezak';
alter type public.person_category add value if not exists 'osiedlowy';
alter type public.person_category add value if not exists 'imprezowicz';
alter type public.person_category add value if not exists 'kibic';
alter type public.person_category add value if not exists 'sportowiec';
alter type public.person_category add value if not exists 'dzialkowicz';
alter type public.person_category add value if not exists 'zlota-raczka';
alter type public.person_category add value if not exists 'biznesmen';
alter type public.person_category add value if not exists 'emigrant';
alter type public.person_category add value if not exists 'tajemniczy';
