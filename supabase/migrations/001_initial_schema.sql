-- MysticForge Database Schema
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Resource type enum
CREATE TYPE resource_type AS ENUM ('skill', 'mcp_prompt', 'cursor_rule', 'prompt');

-- Security severity enum
CREATE TYPE security_severity AS ENUM ('critical', 'high', 'medium', 'low', 'clean');

-- Import status enum
CREATE TYPE import_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- ============================================================
-- PROFILES (extends Supabase Auth)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- IMPORT SOURCES
-- ============================================================
CREATE TABLE import_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  path_filter TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  auto_sync BOOLEAN DEFAULT TRUE,
  sync_interval_hours INTEGER DEFAULT 24,
  last_synced_at TIMESTAMPTZ,
  last_tree_sha TEXT,
  total_imported INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner, repo)
);

-- ============================================================
-- RESOURCES (Main catalog table)
-- ============================================================
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  type resource_type NOT NULL DEFAULT 'skill',
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  
  -- Content
  content TEXT NOT NULL,           -- Full SKILL.md / .mdc / prompt content
  raw_content TEXT,                -- Unprocessed raw file content
  
  -- Source tracking
  source_repo TEXT,                -- owner/repo
  source_path TEXT,                -- path within repo
  source_url TEXT,                 -- GitHub URL
  sha256_hash TEXT,                -- For deduplication
  git_sha TEXT,                    -- Git blob SHA
  
  -- CLI / Install metadata
  cli_source TEXT,                 -- 'agentskill.sh', 'github', 'native'
  cli_package TEXT,                -- e.g. '@owner/repo-name'
  
  -- Additional files (for ZIP packaging)
  scripts JSONB DEFAULT '[]',      -- [{name, content, path}]
  assets JSONB DEFAULT '[]',       -- [{name, content, path}]
  
  -- Compatibility
  compatible_with TEXT[] DEFAULT '{}', -- ['claude', 'cursor', 'gemini', 'codex']
  min_skill_version TEXT,
  
  -- Semantic search
  embedding vector(1024),          -- jina-embeddings-v3 (1024 dims)
  
  -- Security audit (OWASP AST10)
  security_score INTEGER DEFAULT 100 CHECK (security_score >= 0 AND security_score <= 100),
  security_severity security_severity DEFAULT 'clean',
  security_findings JSONB DEFAULT '[]',   -- [{category, severity, message, line}]
  security_scanned_at TIMESTAMPTZ,
  is_quarantined BOOLEAN DEFAULT FALSE,
  quarantine_reason TEXT,
  
  -- Metrics
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  star_count INTEGER DEFAULT 0,
  
  -- Publishing
  is_published BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Versioning
  version TEXT DEFAULT '1.0.0',
  changelog TEXT,
  
  -- Relations
  import_source_id UUID REFERENCES import_sources(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESOURCE VERSIONS (SHA-based version tracking)
-- ============================================================
CREATE TABLE resource_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  git_sha TEXT,
  content TEXT NOT NULL,
  scripts JSONB DEFAULT '[]',
  changelog TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource_id, sha256_hash)
);

-- ============================================================
-- PACKS (Thematic download bundles)
-- ============================================================
CREATE TABLE packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  color TEXT DEFAULT '#00FFC2',
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PACK RESOURCES (many-to-many)
-- ============================================================
CREATE TABLE pack_resources (
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (pack_id, resource_id)
);

-- ============================================================
-- IMPORT LOGS (Audit trail)
-- ============================================================
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES import_sources(id) ON DELETE SET NULL,
  status import_status NOT NULL DEFAULT 'pending',
  triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Results
  files_scanned INTEGER DEFAULT 0,
  files_new INTEGER DEFAULT 0,
  files_updated INTEGER DEFAULT 0,
  files_skipped INTEGER DEFAULT 0,
  files_quarantined INTEGER DEFAULT 0,
  files_failed INTEGER DEFAULT 0,
  
  -- Diff preview (for admin approval)
  diff_preview JSONB DEFAULT '[]',
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  error_message TEXT,
  log_details JSONB DEFAULT '[]',
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- ANALYTICS
-- ============================================================
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  pack_id UUID REFERENCES packs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,        -- 'download', 'view', 'search', 'copy'
  target_platform TEXT,            -- 'claude', 'cursor', 'gemini', 'raw'
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_hash TEXT,
  user_agent TEXT,
  country TEXT,
  search_query TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Resources - full text search
CREATE INDEX idx_resources_fts ON resources 
  USING GIN(to_tsvector('spanish', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(long_description,'')));

CREATE INDEX idx_resources_fts_en ON resources 
  USING GIN(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(long_description,'')));

-- Resources - tags
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);
CREATE INDEX idx_resources_compatible ON resources USING GIN(compatible_with);

-- Resources - vector similarity (ivfflat for production scale)
CREATE INDEX idx_resources_embedding ON resources 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Resources - type + category filtering
CREATE INDEX idx_resources_type ON resources(type, is_published, is_quarantined);
CREATE INDEX idx_resources_category ON resources(category, is_published);
CREATE INDEX idx_resources_featured ON resources(is_featured, is_published);
CREATE INDEX idx_resources_downloads ON resources(download_count DESC);

-- SHA deduplication lookup
CREATE INDEX idx_resources_sha ON resources(sha256_hash);
CREATE INDEX idx_resource_versions_sha ON resource_versions(sha256_hash);
CREATE INDEX idx_resource_versions_git_sha ON resource_versions(git_sha);

-- Analytics
CREATE INDEX idx_analytics_resource ON analytics(resource_id, event_type);
CREATE INDEX idx_analytics_created ON analytics(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Profiles are publicly readable" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Resources: published resources are public
CREATE POLICY "Published resources are publicly readable" ON resources 
  FOR SELECT USING (is_published = TRUE AND is_quarantined = FALSE);
CREATE POLICY "Admins can do anything with resources" ON resources 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Packs: public read
CREATE POLICY "Published packs are publicly readable" ON packs 
  FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Admins can manage packs" ON packs 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Pack resources: public read
CREATE POLICY "Pack resources are publicly readable" ON pack_resources FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage pack resources" ON pack_resources 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Import sources: admin only
CREATE POLICY "Admins can manage import sources" ON import_sources 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Import logs: admin only
CREATE POLICY "Admins can view import logs" ON import_logs 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Analytics: insert for everyone, read for admins
CREATE POLICY "Anyone can insert analytics" ON analytics FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins can read analytics" ON analytics 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Resource versions: public read
CREATE POLICY "Resource versions are publicly readable" ON resource_versions FOR SELECT USING (TRUE);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Hybrid search function (vector + FTS with RRF)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding vector(1024),
  match_count INTEGER DEFAULT 20,
  filter_type resource_type DEFAULT NULL,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  display_name TEXT,
  description TEXT,
  type resource_type,
  category TEXT,
  tags TEXT[],
  security_score INTEGER,
  security_severity security_severity,
  download_count INTEGER,
  is_featured BOOLEAN,
  created_at TIMESTAMPTZ,
  rrf_score FLOAT
)
LANGUAGE plpgsql AS $$
DECLARE
  k CONSTANT INTEGER := 60; -- RRF constant
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      r.id,
      ROW_NUMBER() OVER (ORDER BY r.embedding <=> query_embedding) AS rank
    FROM resources r
    WHERE 
      r.is_published = TRUE 
      AND r.is_quarantined = FALSE
      AND (filter_type IS NULL OR r.type = filter_type)
      AND (filter_category IS NULL OR r.category = filter_category)
      AND r.embedding IS NOT NULL
    ORDER BY r.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  fts_results AS (
    SELECT
      r.id,
      ROW_NUMBER() OVER (
        ORDER BY (
          ts_rank(to_tsvector('spanish', coalesce(r.name,'') || ' ' || coalesce(r.description,'')), plainto_tsquery('spanish', query_text)) +
          ts_rank(to_tsvector('english', coalesce(r.name,'') || ' ' || coalesce(r.description,'')), plainto_tsquery('english', query_text))
        ) DESC
      ) AS rank
    FROM resources r
    WHERE 
      r.is_published = TRUE 
      AND r.is_quarantined = FALSE
      AND (filter_type IS NULL OR r.type = filter_type)
      AND (filter_category IS NULL OR r.category = filter_category)
      AND (
        to_tsvector('spanish', coalesce(r.name,'') || ' ' || coalesce(r.description,'')) @@ plainto_tsquery('spanish', query_text)
        OR to_tsvector('english', coalesce(r.name,'') || ' ' || coalesce(r.description,'')) @@ plainto_tsquery('english', query_text)
        OR r.name ILIKE '%' || query_text || '%'
        OR r.description ILIKE '%' || query_text || '%'
      )
    ORDER BY 2
    LIMIT match_count * 2
  ),
  rrf_scores AS (
    SELECT
      COALESCE(v.id, f.id) AS id,
      COALESCE(1.0 / (k + v.rank), 0) + COALESCE(1.0 / (k + f.rank), 0) AS score
    FROM vector_results v
    FULL OUTER JOIN fts_results f ON v.id = f.id
  )
  SELECT
    r.id, r.slug, r.name, r.display_name, r.description,
    r.type, r.category, r.tags,
    r.security_score, r.security_severity,
    r.download_count, r.is_featured, r.created_at,
    s.score AS rrf_score
  FROM rrf_scores s
  JOIN resources r ON r.id = s.id
  ORDER BY s.score DESC
  LIMIT match_count;
END;
$$;

-- FTS-only search (fallback when no embedding)
CREATE OR REPLACE FUNCTION fts_search(
  query_text TEXT,
  match_count INTEGER DEFAULT 20,
  filter_type resource_type DEFAULT NULL,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  display_name TEXT,
  description TEXT,
  type resource_type,
  category TEXT,
  tags TEXT[],
  security_score INTEGER,
  security_severity security_severity,
  download_count INTEGER,
  is_featured BOOLEAN,
  created_at TIMESTAMPTZ,
  rrf_score FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id, r.slug, r.name, r.display_name, r.description,
    r.type, r.category, r.tags,
    r.security_score, r.security_severity,
    r.download_count, r.is_featured, r.created_at,
    (
      ts_rank(to_tsvector('spanish', coalesce(r.name,'') || ' ' || coalesce(r.description,'')), plainto_tsquery('spanish', query_text)) +
      ts_rank(to_tsvector('english', coalesce(r.name,'') || ' ' || coalesce(r.description,'')), plainto_tsquery('english', query_text))
    )::FLOAT AS rrf_score
  FROM resources r
  WHERE 
    r.is_published = TRUE 
    AND r.is_quarantined = FALSE
    AND (filter_type IS NULL OR r.type = filter_type)
    AND (filter_category IS NULL OR r.category = filter_category)
    AND (
      to_tsvector('spanish', coalesce(r.name,'') || ' ' || coalesce(r.description,'')) @@ plainto_tsquery('spanish', query_text)
      OR to_tsvector('english', coalesce(r.name,'') || ' ' || coalesce(r.description,'')) @@ plainto_tsquery('english', query_text)
      OR r.name ILIKE '%' || query_text || '%'
      OR r.description ILIKE '%' || query_text || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(r.tags) tag WHERE tag ILIKE '%' || query_text || '%'
      )
    )
  ORDER BY rrf_score DESC
  LIMIT match_count;
END;
$$;

-- Increment download count
CREATE OR REPLACE FUNCTION increment_download(resource_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE resources SET download_count = download_count + 1 WHERE id = resource_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment view count
CREATE OR REPLACE FUNCTION increment_view(resource_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE resources SET view_count = view_count + 1 WHERE id = resource_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get platform stats
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_resources', (SELECT COUNT(*) FROM resources WHERE is_published AND NOT is_quarantined),
    'total_skills', (SELECT COUNT(*) FROM resources WHERE type = 'skill' AND is_published AND NOT is_quarantined),
    'total_mcp_prompts', (SELECT COUNT(*) FROM resources WHERE type = 'mcp_prompt' AND is_published AND NOT is_quarantined),
    'total_cursor_rules', (SELECT COUNT(*) FROM resources WHERE type = 'cursor_rule' AND is_published AND NOT is_quarantined),
    'total_downloads', (SELECT COALESCE(SUM(download_count), 0) FROM resources),
    'total_packs', (SELECT COUNT(*) FROM packs WHERE is_published),
    'total_import_sources', (SELECT COUNT(*) FROM import_sources WHERE is_active)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_packs_updated_at BEFORE UPDATE ON packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_import_sources_updated_at BEFORE UPDATE ON import_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DEFAULT IMPORT SOURCES
-- ============================================================
INSERT INTO import_sources (name, owner, repo, branch, path_filter) VALUES
  ('Anthropic Official Skills', 'anthropics', 'skills', 'main', ''),
  ('Alireza Claude Skills', 'alirezarezvani', 'claude-skills', 'main', ''),
  ('VoltAgent Awesome Skills', 'VoltAgent', 'awesome-agent-skills', 'main', ''),
  ('MCP Prompts', 'sparesparrow', 'mcp-prompts', 'main', 'prompts'),
  ('MCP Servers', 'modelcontextprotocol', 'servers', 'main', '');

-- ============================================================
-- DEFAULT PACKS
-- ============================================================
INSERT INTO packs (slug, name, description, icon, color, is_featured) VALUES
  ('devops-2026', 'DevOps Completo 2026', 'Todo lo que necesitas para CI/CD, Docker, Kubernetes y automatización de infraestructura en 2026', '⚙️', '#00FFC2', TRUE),
  ('security-audit', 'Auditoría de Seguridad', 'Skills y prompts especializados en análisis de vulnerabilidades, OWASP y hardening de sistemas', '🛡️', '#EF5777', TRUE),
  ('frontend-mastery', 'Frontend Mastery', 'Colección completa de skills para React, Next.js, TypeScript y diseño moderno', '🎨', '#8B5CF6', TRUE),
  ('ai-agent-builder', 'Builder de Agentes IA', 'Todo para construir y orquestar agentes autónomos con MCP, LangGraph y CrewAI', '🤖', '#DFFF00', TRUE),
  ('backend-apis', 'Backend & APIs', 'Habilidades para FastAPI, Node.js, bases de datos y arquitectura de microservicios', '🔧', '#F59E0B', FALSE),
  ('cursor-rules-pro', 'Cursor Rules Pro', 'Las mejores reglas .mdc para máxima productividad en Cursor IDE', '📝', '#EC4899', TRUE);
