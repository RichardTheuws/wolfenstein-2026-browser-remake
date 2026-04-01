<?php
/**
 * Wolfenstein 3D Leaderboard API
 *
 * POST /games/wolfenstein-3d/api/scores.php — Submit a score
 * GET  /games/wolfenstein-3d/api/scores.php — Get leaderboard
 *
 * SQLite database stored at ../data/scores.db
 */

declare(strict_types=1);

// --- CORS & Headers ---
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://theuws.com');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Constants ---
define('DB_PATH', __DIR__ . '/../data/scores.db');
define('MAX_SCORES_PER_EPISODE', 100);
define('RATE_LIMIT_SECONDS', 5);
define('MAX_NAME_LENGTH', 20);
define('VALID_DIFFICULTIES', ['baby', 'easy', 'medium', 'hard']);
define('MAX_EPISODE', 7);
define('MAX_FLOOR', 60);

// --- Helpers ---

function jsonResponse(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $status = 400): never
{
    jsonResponse(['error' => $message], $status);
}

function getClientIp(): string
{
    // Check common proxy headers, fall back to REMOTE_ADDR
    foreach (['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $key) {
        if (!empty($_SERVER[$key])) {
            // X-Forwarded-For can contain multiple IPs; take the first
            $ip = explode(',', $_SERVER[$key])[0];
            return trim($ip);
        }
    }
    return '0.0.0.0';
}

function sanitizeName(string $name): string
{
    // Strip HTML tags
    $name = strip_tags($name);
    // Allow only alphanumeric, spaces, dots, dashes, underscores
    $name = preg_replace('/[^a-zA-Z0-9 .\-_]/', '', $name);
    // Collapse multiple spaces
    $name = preg_replace('/\s+/', ' ', $name);
    // Trim and limit length
    $name = trim($name);
    $name = mb_substr($name, 0, MAX_NAME_LENGTH);
    return $name;
}

// --- Database ---

function getDb(): SQLite3
{
    $dbDir = dirname(DB_PATH);
    if (!is_dir($dbDir)) {
        mkdir($dbDir, 0755, true);
    }

    $db = new SQLite3(DB_PATH);
    $db->busyTimeout(5000);
    $db->exec('PRAGMA journal_mode = WAL');
    $db->exec('PRAGMA foreign_keys = ON');

    // Create tables if they don't exist
    $db->exec('
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            score INTEGER NOT NULL,
            episode INTEGER NOT NULL,
            floor INTEGER NOT NULL DEFAULT 0,
            kills INTEGER NOT NULL DEFAULT 0,
            secrets INTEGER NOT NULL DEFAULT 0,
            time_seconds INTEGER NOT NULL DEFAULT 0,
            difficulty TEXT NOT NULL DEFAULT \'medium\',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ');

    $db->exec('
        CREATE TABLE IF NOT EXISTS rate_limits (
            ip TEXT PRIMARY KEY,
            last_submit DATETIME NOT NULL
        )
    ');

    // Index for leaderboard queries
    $db->exec('CREATE INDEX IF NOT EXISTS idx_scores_episode_score ON scores (episode, score DESC)');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_scores_score ON scores (score DESC)');

    return $db;
}

// --- Rate Limiting ---

function checkRateLimit(SQLite3 $db, string $ip): void
{
    $stmt = $db->prepare('SELECT last_submit FROM rate_limits WHERE ip = :ip');
    $stmt->bindValue(':ip', $ip, SQLITE3_TEXT);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);

    if ($row) {
        $lastSubmit = strtotime($row['last_submit']);
        $elapsed = time() - $lastSubmit;
        if ($elapsed < RATE_LIMIT_SECONDS) {
            $wait = RATE_LIMIT_SECONDS - $elapsed;
            jsonError("Rate limited. Try again in {$wait} seconds.", 429);
        }
    }

    // Update or insert rate limit entry
    $stmt = $db->prepare('
        INSERT INTO rate_limits (ip, last_submit) VALUES (:ip, datetime(\'now\'))
        ON CONFLICT(ip) DO UPDATE SET last_submit = datetime(\'now\')
    ');
    $stmt->bindValue(':ip', $ip, SQLITE3_TEXT);
    $stmt->execute();

    // Clean up old rate limit entries (older than 1 hour)
    $db->exec("DELETE FROM rate_limits WHERE last_submit < datetime('now', '-1 hour')");
}

// --- Score Pruning ---

function pruneScores(SQLite3 $db, int $episode): void
{
    // Count scores for this episode
    $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM scores WHERE episode = :episode');
    $stmt->bindValue(':episode', $episode, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);

    if ($row['cnt'] > MAX_SCORES_PER_EPISODE) {
        // Delete the lowest scores beyond the limit
        $excess = $row['cnt'] - MAX_SCORES_PER_EPISODE;
        $stmt = $db->prepare('
            DELETE FROM scores WHERE id IN (
                SELECT id FROM scores WHERE episode = :episode
                ORDER BY score ASC
                LIMIT :excess
            )
        ');
        $stmt->bindValue(':episode', $episode, SQLITE3_INTEGER);
        $stmt->bindValue(':excess', $excess, SQLITE3_INTEGER);
        $stmt->execute();
    }
}

// --- GET: Retrieve Leaderboard ---

function handleGet(SQLite3 $db): never
{
    $episode = isset($_GET['episode']) ? (int) $_GET['episode'] : null;
    $limit = isset($_GET['limit']) ? min(max((int) $_GET['limit'], 1), 100) : 10;

    if ($episode !== null) {
        if ($episode < 1 || $episode > MAX_EPISODE) {
            jsonError('Invalid episode. Must be between 1 and ' . MAX_EPISODE . '.');
        }
        $stmt = $db->prepare('
            SELECT name, score, episode, floor, kills, secrets, time_seconds, difficulty,
                   date(created_at) as date
            FROM scores
            WHERE episode = :episode
            ORDER BY score DESC
            LIMIT :limit
        ');
        $stmt->bindValue(':episode', $episode, SQLITE3_INTEGER);
    } else {
        $stmt = $db->prepare('
            SELECT name, score, episode, floor, kills, secrets, time_seconds, difficulty,
                   date(created_at) as date
            FROM scores
            ORDER BY score DESC
            LIMIT :limit
        ');
    }
    $stmt->bindValue(':limit', $limit, SQLITE3_INTEGER);

    $result = $stmt->execute();
    $scores = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $scores[] = [
            'name' => $row['name'],
            'score' => (int) $row['score'],
            'episode' => (int) $row['episode'],
            'floor' => (int) $row['floor'],
            'kills' => (int) $row['kills'],
            'secrets' => (int) $row['secrets'],
            'time' => (int) $row['time_seconds'],
            'difficulty' => $row['difficulty'],
            'date' => $row['date'],
        ];
    }

    jsonResponse(['scores' => $scores]);
}

// --- POST: Submit Score ---

function handlePost(SQLite3 $db): never
{
    // Read and parse JSON body
    $rawBody = file_get_contents('php://input');
    if (empty($rawBody)) {
        jsonError('Request body is empty.');
    }

    $data = json_decode($rawBody, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonError('Invalid JSON: ' . json_last_error_msg());
    }

    // Validate required fields
    $requiredFields = ['name', 'score', 'episode'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field])) {
            jsonError("Missing required field: {$field}");
        }
    }

    // Sanitize and validate name
    $name = sanitizeName((string) $data['name']);
    if (empty($name)) {
        jsonError('Name is required and must contain valid characters (alphanumeric + spaces).');
    }

    // Validate score
    $score = (int) $data['score'];
    if ($score < 0 || $score > 99999999) {
        jsonError('Invalid score. Must be between 0 and 99,999,999.');
    }

    // Validate episode
    $episode = (int) $data['episode'];
    if ($episode < 1 || $episode > MAX_EPISODE) {
        jsonError('Invalid episode. Must be between 1 and ' . MAX_EPISODE . '.');
    }

    // Validate optional fields
    $floor = isset($data['floor']) ? max(0, min((int) $data['floor'], MAX_FLOOR)) : 0;
    $kills = isset($data['kills']) ? max(0, min((int) $data['kills'], 9999)) : 0;
    $secrets = isset($data['secrets']) ? max(0, min((int) $data['secrets'], 999)) : 0;
    $timeSeconds = isset($data['time']) ? max(0, min((int) $data['time'], 99999)) : 0;

    $difficulty = isset($data['difficulty']) ? strtolower(trim((string) $data['difficulty'])) : 'medium';
    if (!in_array($difficulty, VALID_DIFFICULTIES, true)) {
        jsonError('Invalid difficulty. Must be one of: ' . implode(', ', VALID_DIFFICULTIES) . '.');
    }

    // Rate limit check
    $ip = getClientIp();
    checkRateLimit($db, $ip);

    // Insert score
    $stmt = $db->prepare('
        INSERT INTO scores (name, score, episode, floor, kills, secrets, time_seconds, difficulty)
        VALUES (:name, :score, :episode, :floor, :kills, :secrets, :time_seconds, :difficulty)
    ');
    $stmt->bindValue(':name', $name, SQLITE3_TEXT);
    $stmt->bindValue(':score', $score, SQLITE3_INTEGER);
    $stmt->bindValue(':episode', $episode, SQLITE3_INTEGER);
    $stmt->bindValue(':floor', $floor, SQLITE3_INTEGER);
    $stmt->bindValue(':kills', $kills, SQLITE3_INTEGER);
    $stmt->bindValue(':secrets', $secrets, SQLITE3_INTEGER);
    $stmt->bindValue(':time_seconds', $timeSeconds, SQLITE3_INTEGER);
    $stmt->bindValue(':difficulty', $difficulty, SQLITE3_TEXT);
    $stmt->execute();

    $insertedId = $db->lastInsertRowID();

    // Prune excess scores for this episode
    pruneScores($db, $episode);

    // Check if the score was pruned (i.e., it was too low)
    $stmt = $db->prepare('SELECT id FROM scores WHERE id = :id');
    $stmt->bindValue(':id', $insertedId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $stillExists = $result->fetchArray(SQLITE3_ASSOC);

    if (!$stillExists) {
        jsonResponse([
            'success' => true,
            'rank' => null,
            'message' => 'Score submitted but did not make the top ' . MAX_SCORES_PER_EPISODE . '.',
        ]);
    }

    // Calculate rank (number of scores with higher score + 1)
    $stmt = $db->prepare('
        SELECT COUNT(*) + 1 as rank
        FROM scores
        WHERE episode = :episode AND score > :score
    ');
    $stmt->bindValue(':episode', $episode, SQLITE3_INTEGER);
    $stmt->bindValue(':score', $score, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);
    $rank = (int) $row['rank'];

    jsonResponse([
        'success' => true,
        'rank' => $rank,
    ]);
}

// --- Main ---

try {
    $db = getDb();

    match ($_SERVER['REQUEST_METHOD']) {
        'GET' => handleGet($db),
        'POST' => handlePost($db),
        'OPTIONS' => jsonResponse([], 204),
        default => jsonError('Method not allowed.', 405),
    };
} catch (Throwable $e) {
    // Log the error server-side (if error_log is configured)
    error_log('Wolfenstein 3D Leaderboard API error: ' . $e->getMessage());
    jsonError('Internal server error.', 500);
}
