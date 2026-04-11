-- ========================================
-- Otomotiv Sektörü Ücretlendirme Simülasyonu
-- Supabase / PostgreSQL Database Schema
-- ========================================

-- 1. Sessions (Oturumlar)
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) NOT NULL UNIQUE, -- 6 haneli oturum kodu
  status TEXT DEFAULT 'registration'
    CHECK (status IN ('registration', 'evaluating', 'results', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Candidates (Adaylar)
CREATE TABLE candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  display_id TEXT, -- Anonim ID: "Aday-001"

  -- Kişisel Bilgiler
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT CHECK (gender IN ('Kadın', 'Erkek', 'Belirtmek İstemiyorum')),

  -- Kurumsal Detaylar
  department TEXT,
  education_school TEXT,
  education_field TEXT,
  experience_total INTEGER DEFAULT 0, -- Toplam deneyim (yıl)
  experience_field INTEGER DEFAULT 0, -- Alan deneyimi (yıl)

  -- Dil Bilgileri (JSONB array)
  -- Format: [{"language": "İngilizce", "level": "C1"}, ...]
  languages JSONB DEFAULT '[]'::jsonb,

  -- Yetkinlikler (max 10)
  competencies TEXT[] DEFAULT '{}',

  -- Kişisel Analiz
  strengths TEXT[] DEFAULT '{}',    -- En güçlü 5 özellik
  weaknesses TEXT[] DEFAULT '{}',   -- Gelişime açık 2 özellik

  -- Maaş Beklentisi
  salary_expectation NUMERIC DEFAULT 0,

  -- Profil tamamlandı mı?
  profile_completed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Matchings (Eşleşmeler)
CREATE TABLE matchings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  offered_salary NUMERIC, -- NULL = henüz değerlendirilmedi
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Her eşleşme benzersiz olmalı
  UNIQUE(session_id, evaluator_id),
  UNIQUE(session_id, candidate_id),
  -- Kimse kendini değerlendiremez
  CHECK (evaluator_id != candidate_id)
);

-- ========================================
-- Indexes
-- ========================================
CREATE INDEX idx_candidates_session ON candidates(session_id);
CREATE INDEX idx_matchings_session ON matchings(session_id);
CREATE INDEX idx_matchings_evaluator ON matchings(evaluator_id);
CREATE INDEX idx_matchings_candidate ON matchings(candidate_id);
CREATE INDEX idx_sessions_code ON sessions(code);

-- ========================================
-- Row Level Security (RLS)
-- ========================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchings ENABLE ROW LEVEL SECURITY;

-- Herkese okuma/yazma izni (sınıf ortamı - basit erişim)
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on candidates" ON candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on matchings" ON matchings FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- Realtime subscriptions aktif et
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE candidates;
ALTER PUBLICATION supabase_realtime ADD TABLE matchings;
