CREATE DATABASE IF NOT EXISTS avatar_dance_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE avatar_dance_db;

INSERT INTO users (id, email, password_hash, nickname, avatar_id, points, is_admin, status)
VALUES
  (1, 'demo@kpopdance.local', 'dev-only-password-hash', 'DemoDancer', 'avatar_001', 1000, 0, 'active')
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  avatar_id = VALUES(avatar_id),
  points = VALUES(points);

INSERT INTO dance_references
  (id, title, artist_name, difficulty, duration_seconds, thumbnail_url, reference_json_path, preview_video_url)
VALUES
  (1, 'Neon Step Beginner', 'My Avatar Dance Master', 'easy', 16, '/mock/thumbs/neon-step.jpg', '/storage/dance_reference/neon-step.json', NULL),
  (2, 'Retro Groove Easy', 'My Avatar Dance Master', 'easy', 16, '/mock/thumbs/retro-groove.jpg', '/storage/dance_reference/retro-groove.json', NULL),
  (3, 'Idol Intro Basic', 'My Avatar Dance Master', 'easy', 16, '/mock/thumbs/idol-intro.jpg', '/storage/dance_reference/idol-intro.json', NULL)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  artist_name = VALUES(artist_name),
  difficulty = VALUES(difficulty),
  duration_seconds = VALUES(duration_seconds),
  thumbnail_url = VALUES(thumbnail_url),
  reference_json_path = VALUES(reference_json_path),
  preview_video_url = VALUES(preview_video_url);

