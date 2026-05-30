-- =============================================
-- FIFA World Cup 2026 Sticker Album Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Users table (handled by Supabase Auth, but we add a profiles table)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sticker counts table
-- section: country code (e.g. 'ARG', 'AUS') or 'FWC'
-- sticker_number: 1-20 for countries, 1-19 for FWC
-- count: 0=missing, 1=collected, 2+=collected + doubles
CREATE TABLE stickers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  section TEXT NOT NULL,
  sticker_number INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, section, sticker_number)
);

-- Pending trades table
CREATE TABLE trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  -- JSON arrays of {section, sticker_number} objects
  initiator_gives JSONB NOT NULL,  -- stickers initiator sends to recipient
  recipient_gives JSONB NOT NULL,  -- stickers recipient sends to initiator
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read (needed for trade matching), only owner can update
CREATE POLICY "Profiles are viewable by all authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Stickers: anyone authenticated can read (needed for trade matching), only owner can write
CREATE POLICY "Stickers are viewable by all authenticated users"
  ON stickers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own stickers"
  ON stickers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stickers"
  ON stickers FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stickers"
  ON stickers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trades: participants can read their own trades, initiator creates, both can update status
CREATE POLICY "Users can view their own trades"
  ON trades FOR SELECT TO authenticated
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create trades"
  ON trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Participants can update trade status"
  ON trades FOR UPDATE TO authenticated
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

-- =============================================
-- Auto-create profile on signup
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Helper: update updated_at automatically
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stickers_updated_at
  BEFORE UPDATE ON stickers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
