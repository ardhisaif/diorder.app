-- Create announcement type enum
CREATE TYPE announcement_type AS ENUM (
    'operational',  -- pengumuman jam operasional
    'holiday',      -- pengumuman libur
    'promotion',    -- pengumuman promosi
    'pre_order',    -- pengumuman pre-order
    'new_feature',  -- pengumuman fitur baru
    'info',         -- informasi umum
    'warning'       -- peringatan
);

-- Create announcements table
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type announcement_type NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_showed BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_announcements_active_showed ON announcements(is_active, is_showed);
CREATE INDEX idx_announcements_dates ON announcements(start_date, end_date);

-- Insert sample data
INSERT INTO announcements (
    title,
    content,
    type,
    start_date,
    end_date,
    is_active,
    is_showed,
    priority
) VALUES 
-- Pengumuman jam operasional
(
    'Jam Operasional',
    'Layanan buka dari jam 10:00 - 17:00',
    'operational',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    true,
    true,
    1
),
-- Pengumuman libur
(
    'Libur Nasional',
    'Hari ini layanan libur',
    'holiday',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    true,
    true,
    2
),
-- Pengumuman promosi
(
    'Diskon Ongkir',
    'Ajak teman desamu untuk pesan patungan maka anda dan teman anda akan mendapatkan diskon ongkir 20%',
    'promotion',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    true,
    true,
    0
),
-- Pengumuman fitur baru
(
    'Fitur Baru',
    'Sekarang anda bisa pesan dari beberapa restoran sekaligus dengan satu ongkir',
    'new_feature',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    true,
    true,
    0
); 