CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    questions_generated INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_questions (
    exam_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    PRIMARY KEY (exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_materials_upload_date ON materials(upload_date);
CREATE INDEX IF NOT EXISTS idx_questions_material_id ON questions(material_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
