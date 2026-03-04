-- =================================================================
-- SUPABASE SCHEMA FOR PAPERTEK
-- =================================================================
-- Run this in your Supabase SQL Editor to set up the required tables.
-- Supabase Auth handles user creation automatically.
-- Row Level Security (RLS) ensures users can only access their own data.
-- =================================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    feide_id TEXT,
    organization TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lesson progress
CREATE TABLE IF NOT EXISTS progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    curriculum TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    synced_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, curriculum, lesson_id)
);

-- Exercise answer states (per-exercise saved answers)
CREATE TABLE IF NOT EXISTS exercise_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    state JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, key)
);

-- Known vocabulary words
CREATE TABLE IF NOT EXISTS known_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    words TEXT[] DEFAULT '{}',
    last_updated TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Vocabulary test results history
CREATE TABLE IF NOT EXISTS vocab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER,
    total INTEGER,
    mode TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Answer reports (student feedback on exercises)
CREATE TABLE IF NOT EXISTS answer_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_type TEXT,
    exercise_id TEXT,
    lesson_id TEXT,
    reported_answer TEXT,
    expected_answer TEXT,
    comment TEXT,
    reviewed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =================================================================
-- ROW LEVEL SECURITY
-- =================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE known_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_reports ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own data
CREATE POLICY "Users manage own profile" ON user_profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users manage own progress" ON progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own exercise states" ON exercise_states
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own known words" ON known_words
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own vocab results" ON vocab_test_results
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own reports" ON answer_reports
    FOR ALL USING (auth.uid() = user_id);

-- =================================================================
-- INDEXES
-- =================================================================

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_curriculum ON progress(user_id, curriculum);
CREATE INDEX IF NOT EXISTS idx_exercise_states_user ON exercise_states(user_id);
CREATE INDEX IF NOT EXISTS idx_known_words_user ON known_words(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_results_user ON vocab_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_answer_reports_user ON answer_reports(user_id);
