<?php
/**
 * Import employees from the OLD HRD app (MySQL dump files) into this app's PostgreSQL.
 *
 * It reads the .sql dump files directly — no MySQL server needed.
 * Source tables used: master (employees), karir (career/placement history), dept (departments).
 *
 * Mapping decisions (agreed with user):
 *  - Import ALL employees; is_active derived from latest karir.resign
 *  - email: use master.email if valid, otherwise generate nik<NIK>@graciapharmindo.online
 *  - password: bcrypt of the NIK (employee must change it later)
 *  - departments: created from the old `dept` table; each employee mapped via latest karir record
 *  - role: everyone => "Karyawan"; admins set manually afterwards
 *
 * Usage:
 *   php tools/import_legacy_employees.php --dir=/path/to/dump [--dry-run] [--fresh]
 *
 *   --dir       folder containing master.sql, karir*.sql, dept.sql (default: ./tools/legacy_dump)
 *   --dry-run   parse + transform and print a summary; write NOTHING to Postgres
 *   --fresh     TRUNCATE departments + users (and dependent data) before importing (go-live cutover)
 */

error_reporting(E_ALL & ~E_DEPRECATED);

// ---------- args ----------
$opts = getopt('', ['dir::', 'dry-run', 'fresh']);
$baseDir   = dirname(__DIR__);
$dumpDir   = $opts['dir']    ?? $baseDir . '/tools/legacy_dump';
$dryRun    = isset($opts['dry-run']);
$fresh     = isset($opts['fresh']);
$emailDomain = 'graciapharmindo.online';
$roleNameForAll = 'Karyawan';

// ---------- locate dump files ----------
function findDump(string $dir, string $like): ?string {
    foreach (glob("$dir/*.sql") as $f) {
        if (stripos(basename($f), $like) === 0) return $f;
    }
    return null;
}
$masterFile = findDump($dumpDir, 'master');
$karirFile  = findDump($dumpDir, 'karir');
$deptFile   = findDump($dumpDir, 'dept');

foreach (['master' => $masterFile, 'karir' => $karirFile, 'dept' => $deptFile] as $name => $f) {
    if (!$f) { fwrite(STDERR, "ERROR: cannot find $name*.sql in $dumpDir\n"); exit(1); }
}
echo "Dump dir : $dumpDir\n";
echo "  master : " . basename($masterFile) . "\n";
echo "  karir  : " . basename($karirFile) . "\n";
echo "  dept   : " . basename($deptFile) . "\n\n";

// ---------- tolerant MySQL-dump INSERT parser ----------
/**
 * Returns array of associative rows for the given table found in $file.
 * Handles multiple INSERT statements, NULL, and backslash-escaped string literals.
 */
function parseTable(string $file, string $table): array {
    $sql = file_get_contents($file);
    $rows = [];
    $offset = 0;
    $needle = "INSERT INTO `$table`";
    while (($pos = stripos($sql, $needle, $offset)) !== false) {
        // column list between first "(" after needle and ") VALUES"
        $valKw = stripos($sql, ') VALUES', $pos);
        $colStart = strpos($sql, '(', $pos);
        $colList = substr($sql, $colStart + 1, $valKw - $colStart - 1);
        $cols = array_map(
            fn($c) => trim($c, " `\t\r\n"),
            explode(',', $colList)
        );
        // values blob: from after VALUES up to the statement-terminating ";\n"
        $vStart = $valKw + strlen(') VALUES');
        // find end of this INSERT statement: a ';' that is not inside a string
        $end = findStatementEnd($sql, $vStart);
        $blob = substr($sql, $vStart, $end - $vStart);
        foreach (parseTuples($blob) as $tuple) {
            if (count($tuple) !== count($cols)) continue; // skip malformed
            $rows[] = array_combine($cols, $tuple);
        }
        $offset = $end + 1;
    }
    return $rows;
}

function findStatementEnd(string $s, int $i): int {
    $n = strlen($s);
    $inStr = false;
    for (; $i < $n; $i++) {
        $c = $s[$i];
        if ($inStr) {
            if ($c === '\\') { $i++; continue; }
            if ($c === "'") $inStr = false;
        } else {
            if ($c === "'") $inStr = true;
            elseif ($c === ';') return $i;
        }
    }
    return $n;
}

/** Parse "(...),(...),..." into an array of value arrays. */
function parseTuples(string $s): array {
    $rows = [];
    $n = strlen($s);
    $i = 0;
    while ($i < $n) {
        // seek next top-level '('
        while ($i < $n && $s[$i] !== '(') $i++;
        if ($i >= $n) break;
        $i++; // skip '('
        $fields = [];
        $cur = '';
        $inStr = false;
        $wasQuoted = false;
        while ($i < $n) {
            $c = $s[$i];
            if ($inStr) {
                if ($c === '\\') { $cur .= $s[$i + 1] ?? ''; $i += 2; continue; }
                if ($c === "'") {
                    if (($s[$i + 1] ?? '') === "'") { $cur .= "'"; $i += 2; continue; } // '' escape
                    $inStr = false; $i++; continue;
                }
                $cur .= $c; $i++; continue;
            }
            if ($c === "'") { $inStr = true; $wasQuoted = true; $i++; continue; }
            if ($c === ',') { $fields[] = mkVal($cur, $wasQuoted); $cur = ''; $wasQuoted = false; $i++; continue; }
            if ($c === ')') { $fields[] = mkVal($cur, $wasQuoted); $i++; break; }
            $cur .= $c; $i++;
        }
        $rows[] = $fields;
    }
    return $rows;
}

function mkVal(string $raw, bool $quoted) {
    if ($quoted) return $raw;
    $t = trim($raw);
    if ($t === '' ) return null;
    if (strcasecmp($t, 'NULL') === 0) return null;
    return $t;
}

function emptyDate($v): bool {
    return $v === null || $v === '' || $v === '0000-00-00' || $v === '0000-00-00 00:00:00';
}

// ---------- parse sources ----------
$depts   = parseTable($deptFile, 'dept');
$karir   = parseTable($karirFile, 'karir');
$masters = parseTable($masterFile, 'master');
echo "Parsed: dept=" . count($depts) . ", karir=" . count($karir) . ", master=" . count($masters) . "\n\n";

// dept old-id => name
$deptNameById = [];
foreach ($depts as $d) {
    $deptNameById[(int)$d['id_dept']] = trim((string)$d['Departement']);
}

// latest karir per employee (by highest id_karir = most recent), plus earliest join date
$latestKarir = [];   // id_kryw => row
$earliestJoin = [];  // id_kryw => date string
foreach ($karir as $k) {
    $emp = (int)$k['id_kryw'];
    $kid = (int)$k['id_karir'];
    if (!isset($latestKarir[$emp]) || $kid > (int)$latestKarir[$emp]['id_karir']) {
        $latestKarir[$emp] = $k;
    }
    if (!emptyDate($k['tgl_masuk'] ?? null)) {
        if (!isset($earliestJoin[$emp]) || $k['tgl_masuk'] < $earliestJoin[$emp]) {
            $earliestJoin[$emp] = $k['tgl_masuk'];
        }
    }
}

// ---------- transform employees ----------
$usersOut = [];
$usedEmails = [];
$usedEmpIds = [];
$stats = ['active' => 0, 'inactive' => 0, 'email_real' => 0, 'email_generated' => 0, 'no_dept' => 0];

foreach ($masters as $m) {
    $idKryw = (int)$m['id_kryw'];
    $nik = trim((string)($m['nik'] ?? ''));
    $name = trim((string)($m['n_karyawan'] ?? '')) ?: ('Karyawan ' . $idKryw);

    // email
    $rawEmail = strtolower(trim((string)($m['email'] ?? '')));
    if ($rawEmail !== '' && filter_var($rawEmail, FILTER_VALIDATE_EMAIL)) {
        $email = $rawEmail;
        $stats['email_real']++;
    } else {
        $local = $nik !== '' ? "nik$nik" : "emp$idKryw";
        $email = "$local@graciapharmindo.online";
        $stats['email_generated']++;
    }
    // dedupe email
    $base = $email; $c = 1;
    while (isset($usedEmails[$email])) { $email = preg_replace('/@/', "+$idKryw@", $base, 1); $base = $email; if (isset($usedEmails[$email])) { $email = str_replace('@', ".$c@", $base); } $c++; }
    $usedEmails[$email] = true;

    // employee_id (unique)
    $empId = $nik !== '' ? $nik : "EMP$idKryw";
    if (isset($usedEmpIds[$empId])) $empId = "EMP$idKryw";
    $usedEmpIds[$empId] = true;

    // department from latest karir
    $deptOldId = isset($latestKarir[$idKryw]) ? (int)($latestKarir[$idKryw]['departemen'] ?? 0) : 0;
    $deptName = $deptNameById[$deptOldId] ?? null;
    if (!$deptName) $stats['no_dept']++;

    // active?
    $resign = $latestKarir[$idKryw]['resign'] ?? null;
    $isActive = emptyDate($resign);
    $isActive ? $stats['active']++ : $stats['inactive']++;

    // joined date
    $joined = $earliestJoin[$idKryw] ?? (!emptyDate($m['p_spk'] ?? null) ? $m['p_spk'] : null);

    $usersOut[] = [
        'name' => $name,
        'email' => $email,
        'employee_id' => $empId,
        'phone' => trim((string)($m['hp'] ?? '')) ?: null,
        'dept_name' => $deptName,
        'joined_at' => $joined,
        'is_active' => $isActive,
        'password_plain' => $nik !== '' ? $nik : "emp$idKryw",
    ];
}

// ---------- DRY RUN ----------
if ($dryRun) {
    echo "===== DRY RUN (no data written) =====\n";
    echo "Departments to create (" . count(array_filter($deptNameById)) . "):\n";
    foreach ($deptNameById as $id => $nm) echo "  [$id] $nm\n";
    echo "\nEmployees: " . count($usersOut) . "\n";
    echo "  active=$stats[active] inactive=$stats[inactive] | email_real=$stats[email_real] generated=$stats[email_generated] | no_dept=$stats[no_dept]\n\n";
    echo "Sample (first 5):\n";
    foreach (array_slice($usersOut, 0, 5) as $u) {
        printf("  %-22s %-32s emp=%-10s dept=%-20s active=%s join=%s pw=%s\n",
            mb_strimwidth($u['name'], 0, 22), $u['email'], $u['employee_id'],
            $u['dept_name'] ?? '(none)', $u['is_active'] ? 'Y' : 'N', $u['joined_at'] ?? '-', $u['password_plain']);
    }
    echo "\nNothing written. Re-run without --dry-run to import.\n";
    exit(0);
}

// ---------- connect Postgres ----------
$env = [];
foreach (file($baseDir . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (preg_match('/^([A-Z0-9_]+)=(.*)$/', $line, $mm)) $env[$mm[1]] = trim($mm[2], "\"'");
}
$dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', $env['DB_HOST'], $env['DB_PORT'], $env['DB_DATABASE']);
$pdo = new PDO($dsn, $env['DB_USERNAME'], $env['DB_PASSWORD']);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// role id for everyone
$roleId = $pdo->query("SELECT id FROM roles WHERE name = " . $pdo->quote($roleNameForAll))->fetchColumn();
if (!$roleId) { fwrite(STDERR, "ERROR: role '$roleNameForAll' not found in app.\n"); exit(1); }

$pdo->beginTransaction();
try {
    if ($fresh) {
        echo "FRESH: truncating departments + users (+ dependent data)...\n";
        $pdo->exec("TRUNCATE departments, users RESTART IDENTITY CASCADE");
    }

    // departments: create, build name => id map
    $now = date('Y-m-d H:i:s');
    $deptId = [];
    $insDept = $pdo->prepare("INSERT INTO departments(name, created_at, updated_at) VALUES (?, ?, ?) RETURNING id");
    $findDept = $pdo->prepare("SELECT id FROM departments WHERE name = ?");
    foreach (array_unique(array_filter($deptNameById)) as $nm) {
        $findDept->execute([$nm]);
        $existing = $findDept->fetchColumn();
        if ($existing) { $deptId[$nm] = $existing; continue; }
        $insDept->execute([$nm, $now, $now]);
        $deptId[$nm] = $insDept->fetchColumn();
    }
    echo "Departments ready: " . count($deptId) . "\n";

    // users
    $insUser = $pdo->prepare(
        "INSERT INTO users(name,email,password,employee_id,department_id,role_id,phone,joined_at,is_active,created_at,updated_at)
         VALUES (:name,:email,:password,:employee_id,:department_id,:role_id,:phone,:joined_at,:is_active,:c,:u)"
    );
    $count = 0;
    foreach ($usersOut as $u) {
        $insUser->execute([
            ':name' => $u['name'],
            ':email' => $u['email'],
            ':password' => password_hash($u['password_plain'], PASSWORD_BCRYPT, ['cost' => 12]),
            ':employee_id' => $u['employee_id'],
            ':department_id' => $u['dept_name'] ? ($deptId[$u['dept_name']] ?? null) : null,
            ':role_id' => $roleId,
            ':phone' => $u['phone'],
            ':joined_at' => $u['joined_at'],
            ':is_active' => $u['is_active'] ? 'true' : 'false',
            ':c' => $now,
            ':u' => $now,
        ]);
        $count++;
    }
    $pdo->commit();
    echo "Imported users: $count (role=$roleNameForAll, password=NIK)\n";
    echo "DONE.\n";
} catch (Throwable $e) {
    $pdo->rollBack();
    fwrite(STDERR, "ERROR: " . $e->getMessage() . "\n");
    exit(1);
}
