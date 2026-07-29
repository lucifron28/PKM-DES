-- Migration for tracking student requirement verification status (e.g. Health Record Update)
DO $$ BEGIN
    CREATE TYPE requirement_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS student_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    requirement_code TEXT NOT NULL,
    status requirement_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, requirement_code)
);

ALTER TABLE student_requirements ENABLE ROW LEVEL SECURITY;
