-- Seed data. Safe to run repeatedly.
-- Entry fees here are TEST values; production deployments should set them from
-- configuration rather than relying on this file.

insert into public.game_rooms
  (key, name, difficulty, entry_fee, currency, uses_virtual_credits, requires_wallet, mints_nft, leaderboard_multiplier, artwork_tier)
values
  ('practice',  'Practice Arena',  'Training',     0,    'credits', true,  false, false, 0,   'standard'),
  ('bronze',    'Bronze Arena',    'Beginner',     0.01, 'RON',     false, true,  true,  1,   'standard'),
  ('silver',    'Silver Arena',    'Intermediate', 0.05, 'RON',     false, true,  true,  2.5, 'enhanced'),
  ('legendary', 'Legendary Arena', 'Expert',       0.1,  'RON',     false, true,  true,  5,   'premium')
on conflict (key) do update
  set name = excluded.name,
      difficulty = excluded.difficulty,
      entry_fee = excluded.entry_fee,
      currency = excluded.currency,
      uses_virtual_credits = excluded.uses_virtual_credits,
      requires_wallet = excluded.requires_wallet,
      mints_nft = excluded.mints_nft,
      leaderboard_multiplier = excluded.leaderboard_multiplier,
      artwork_tier = excluded.artwork_tier;

insert into public.reward_definitions (key, level, name, category, description, probability, rarity_score) values
  ('copper',    1,  'Copper Sigil',         'Forged',    'The first spark of a champion. Struck from arena slag by apprentice smiths.',        0.5,                2),
  ('bronze',    2,  'Bronze Sigil',         'Forged',    'Two clean reads in a row. The alloy remembers every duel it survives.',              0.25,               4),
  ('iron',      3,  'Iron Bulwark',         'Forged',    'A bulwark plate awarded to those who refuse the safe exit early.',                   0.125,              8),
  ('silver',    4,  'Silver Crescent',      'Refined',   'Crescent-cut and cold to the touch. Four rounds without a misread.',                 0.0625,             16),
  ('gold',      5,  'Gold Ascendant',       'Refined',   'The first tier the crowd stands for. Ascendant weight, ascendant risk.',             0.03125,            32),
  ('platinum',  6,  'Platinum Halo',        'Refined',   'A halo forged in vacuum. Six resolved rounds, zero surrendered.',                    0.015625,           64),
  ('obsidian',  7,  'Obsidian Rift',        'Arcane',    'Volcanic glass folded around a rift. Sharp enough to cut a probability.',            0.0078125,          128),
  ('amethyst',  8,  'Amethyst Prism',       'Arcane',    'A prism that splits a single outcome into eight possible futures.',                  0.00390625,         256),
  ('topaz',     9,  'Topaz Flare',          'Arcane',    'Flare-cut and unstable. Nine straight reads, and the arena starts watching.',        0.001953125,        512),
  ('emerald',   10, 'Emerald Verdance',     'Mythic',    'Verdance from the deep arena gardens. One run in a thousand reaches it.',            0.0009765625,       1024),
  ('ruby',      11, 'Ruby Pyre',            'Mythic',    'A pyre stone. Carried by champions who stopped counting their streak.',              0.00048828125,      2048),
  ('sapphire',  12, 'Sapphire Tide',        'Mythic',    'The tide answers only to those who held their nerve twelve times.',                  0.000244140625,     4096),
  ('diamond',   13, 'Diamond Apex',         'Legendary', 'Apex lattice. Compressed from thirteen consecutive resolved wins.',                  0.0001220703125,    8192),
  ('celestial', 14, 'Celestial Orbit',      'Legendary', 'An orbit locked around the arena core. Fourteen wins, no claim taken.',              0.00006103515625,   16384),
  ('eternal',   15, 'Eternal Singularity',  'Eternal',   'The singularity. Fifteen resolved wins. It claims itself, and the run ends in legend.', 0.000030517578125, 32768)
on conflict (key) do update
  set name = excluded.name,
      category = excluded.category,
      description = excluded.description,
      probability = excluded.probability,
      rarity_score = excluded.rarity_score;

insert into public.seasons (id, name, starts_at, ends_at, is_active) values
  ('season-1', 'Season 1 — First Ignition', '2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z', true)
on conflict (id) do update
  set name = excluded.name,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at;
