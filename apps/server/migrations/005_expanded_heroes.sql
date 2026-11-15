-- Add permanent upgrade rows for the expanded playable roster.
INSERT OR IGNORE INTO hero_upgrades(user_id,hero_id)
SELECT users.id, added.hero_id FROM users CROSS JOIN (
SELECT 'kadan' AS hero_id
UNION ALL
SELECT 'galatur' AS hero_id
UNION ALL
SELECT 'delain_arman' AS hero_id
UNION ALL
SELECT 'luterra' AS hero_id
UNION ALL
SELECT 'valtan' AS hero_id
UNION ALL
SELECT 'vykas' AS hero_id
UNION ALL
SELECT 'sien' AS hero_id
UNION ALL
SELECT 'arman' AS hero_id
UNION ALL
SELECT 'brelshaza' AS hero_id
UNION ALL
SELECT 'echidna' AS hero_id
UNION ALL
SELECT 'akkan' AS hero_id
UNION ALL
SELECT 'kharmine' AS hero_id
UNION ALL
SELECT 'kamen' AS hero_id
UNION ALL
SELECT 'kakul_saydon' AS hero_id
) AS added;
