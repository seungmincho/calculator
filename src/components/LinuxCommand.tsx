'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Terminal, ChevronDown, BookOpen, Zap } from 'lucide-react'

// ── Command data (hardcoded) ─────────────────────────────────────────────────

interface Flag {
  flag: string
  descKo: string
  descEn: string
}

interface Argument {
  id: string
  labelKo: string
  labelEn: string
  placeholder: string
  prefix?: string // e.g. "-name", "-type"
}

interface Example {
  cmd: string
  descKo: string
  descEn: string
}

interface CommandDef {
  name: string
  synopsisKo: string
  synopsisEn: string
  descKo: string
  descEn: string
  category: 'file' | 'text' | 'system'
  flags: Flag[]
  args: Argument[]
  examples: Example[]
}

const COMMANDS: CommandDef[] = [
  // ── File commands ───────────────────────────────────────────────────────────
  {
    name: 'ls',
    synopsisKo: 'ls [옵션] [경로]',
    synopsisEn: 'ls [OPTION] [FILE]',
    descKo: '디렉터리 내용을 나열합니다.',
    descEn: 'List directory contents.',
    category: 'file',
    flags: [
      { flag: '-l', descKo: '상세 목록 (권한, 크기, 날짜)', descEn: 'Long listing format' },
      { flag: '-a', descKo: '숨김 파일 포함 (. 으로 시작하는 파일)', descEn: 'Show hidden files' },
      { flag: '-h', descKo: '사람이 읽기 쉬운 크기 (KB, MB)', descEn: 'Human-readable sizes' },
      { flag: '-R', descKo: '재귀적으로 하위 디렉터리 포함', descEn: 'Recursive listing' },
      { flag: '-t', descKo: '수정 시간 순으로 정렬', descEn: 'Sort by modification time' },
      { flag: '-S', descKo: '파일 크기 순으로 정렬', descEn: 'Sort by file size' },
      { flag: '-r', descKo: '역순 정렬', descEn: 'Reverse sort order' },
      { flag: '--color=auto', descKo: '색상으로 파일 유형 구분', descEn: 'Colorize output' },
    ],
    args: [
      { id: 'path', labelKo: '경로', labelEn: 'Path', placeholder: '/var/log' },
    ],
    examples: [
      { cmd: 'ls -lah', descKo: '숨김 파일 포함 상세 목록 (사람이 읽기 쉬운 크기)', descEn: 'Detailed list with hidden files and human-readable sizes' },
      { cmd: 'ls -lt /var/log', descKo: '/var/log 를 수정 시간 순으로 정렬', descEn: 'List /var/log sorted by modification time' },
      { cmd: 'ls -lSr', descKo: '파일을 크기 역순으로 (작은 파일부터)', descEn: 'List files in reverse size order' },
      { cmd: 'ls -la ~', descKo: '홈 디렉터리의 숨김 파일 포함 상세 목록', descEn: 'List home directory with hidden files' },
    ],
  },
  {
    name: 'cp',
    synopsisKo: 'cp [옵션] 원본 대상',
    synopsisEn: 'cp [OPTION] SOURCE DEST',
    descKo: '파일이나 디렉터리를 복사합니다.',
    descEn: 'Copy files and directories.',
    category: 'file',
    flags: [
      { flag: '-r', descKo: '디렉터리 재귀 복사', descEn: 'Copy directories recursively' },
      { flag: '-p', descKo: '권한, 타임스탬프 보존', descEn: 'Preserve mode, ownership, timestamps' },
      { flag: '-i', descKo: '덮어쓰기 전 확인', descEn: 'Prompt before overwrite' },
      { flag: '-v', descKo: '복사 진행 상황 출력', descEn: 'Verbose output' },
      { flag: '-u', descKo: '더 새로운 파일만 복사', descEn: 'Copy only newer files' },
      { flag: '-a', descKo: '아카이브 모드 (-dpR 과 동일)', descEn: 'Archive mode (same as -dpR)' },
      { flag: '-n', descKo: '기존 파일 덮어쓰지 않음', descEn: 'Do not overwrite existing files' },
    ],
    args: [
      { id: 'src', labelKo: '원본 경로', labelEn: 'Source', placeholder: '/path/to/source' },
      { id: 'dest', labelKo: '대상 경로', labelEn: 'Destination', placeholder: '/path/to/dest' },
    ],
    examples: [
      { cmd: 'cp -rp /var/www /backup/www', descKo: '권한을 보존하며 디렉터리 재귀 복사', descEn: 'Recursively copy directory preserving permissions' },
      { cmd: 'cp -i file.txt /tmp/', descKo: '덮어쓰기 전 확인하며 파일 복사', descEn: 'Copy file with overwrite prompt' },
      { cmd: 'cp -av src/ dest/', descKo: '아카이브 모드로 상세 출력하며 복사', descEn: 'Archive copy with verbose output' },
    ],
  },
  {
    name: 'mv',
    synopsisKo: 'mv [옵션] 원본 대상',
    synopsisEn: 'mv [OPTION] SOURCE DEST',
    descKo: '파일이나 디렉터리를 이동하거나 이름을 변경합니다.',
    descEn: 'Move or rename files and directories.',
    category: 'file',
    flags: [
      { flag: '-i', descKo: '덮어쓰기 전 확인', descEn: 'Prompt before overwrite' },
      { flag: '-v', descKo: '이동 상황 출력', descEn: 'Verbose output' },
      { flag: '-u', descKo: '더 새로운 파일만 이동', descEn: 'Move only newer files' },
      { flag: '-n', descKo: '기존 파일 덮어쓰지 않음', descEn: 'Do not overwrite existing files' },
      { flag: '-b', descKo: '덮어쓸 파일 백업 생성', descEn: 'Make backup of existing files' },
    ],
    args: [
      { id: 'src', labelKo: '원본 경로', labelEn: 'Source', placeholder: 'old-name.txt' },
      { id: 'dest', labelKo: '대상 경로', labelEn: 'Destination', placeholder: 'new-name.txt' },
    ],
    examples: [
      { cmd: 'mv -i file.txt /tmp/', descKo: '확인하며 파일 이동', descEn: 'Move file with overwrite prompt' },
      { cmd: 'mv old.txt new.txt', descKo: '파일 이름 변경', descEn: 'Rename a file' },
      { cmd: 'mv -v *.log /var/log/archive/', descKo: '모든 .log 파일을 아카이브 디렉터리로 이동', descEn: 'Move all .log files to archive directory' },
    ],
  },
  {
    name: 'rm',
    synopsisKo: 'rm [옵션] 파일...',
    synopsisEn: 'rm [OPTION] FILE...',
    descKo: '파일이나 디렉터리를 삭제합니다.',
    descEn: 'Remove files or directories.',
    category: 'file',
    flags: [
      { flag: '-r', descKo: '디렉터리 재귀 삭제', descEn: 'Remove directories recursively' },
      { flag: '-f', descKo: '확인 없이 강제 삭제', descEn: 'Force removal without prompt' },
      { flag: '-i', descKo: '삭제 전 확인', descEn: 'Prompt before removal' },
      { flag: '-v', descKo: '삭제 상황 출력', descEn: 'Verbose output' },
      { flag: '-d', descKo: '빈 디렉터리 삭제', descEn: 'Remove empty directories' },
    ],
    args: [
      { id: 'target', labelKo: '삭제 대상', labelEn: 'Target', placeholder: '/path/to/file' },
    ],
    examples: [
      { cmd: 'rm -rf /tmp/old-data/', descKo: '디렉터리와 내용 모두 강제 삭제', descEn: 'Forcefully remove directory and all contents' },
      { cmd: 'rm -i *.tmp', descKo: '확인하며 .tmp 파일 삭제', descEn: 'Remove .tmp files with confirmation' },
      { cmd: 'rm -v file1.txt file2.txt', descKo: '여러 파일을 상세 출력하며 삭제', descEn: 'Remove multiple files verbosely' },
    ],
  },
  {
    name: 'mkdir',
    synopsisKo: 'mkdir [옵션] 디렉터리...',
    synopsisEn: 'mkdir [OPTION] DIRECTORY...',
    descKo: '디렉터리를 생성합니다.',
    descEn: 'Create directories.',
    category: 'file',
    flags: [
      { flag: '-p', descKo: '필요한 상위 디렉터리도 자동 생성', descEn: 'Create parent directories as needed' },
      { flag: '-v', descKo: '생성 상황 출력', descEn: 'Verbose output' },
      { flag: '-m 755', descKo: '생성 시 권한 모드 지정 (숫자 직접 수정)', descEn: 'Set file mode (octal)' },
    ],
    args: [
      { id: 'dir', labelKo: '디렉터리 경로', labelEn: 'Directory', placeholder: '/var/www/myapp' },
    ],
    examples: [
      { cmd: 'mkdir -p /var/www/myapp/logs', descKo: '중간 디렉터리까지 한 번에 생성', descEn: 'Create directory with all parent directories' },
      { cmd: 'mkdir -m 700 /root/private', descKo: '소유자만 접근 가능한 디렉터리 생성', descEn: 'Create directory accessible only by owner' },
      { cmd: 'mkdir -pv src/{models,views,controllers}', descKo: '여러 하위 디렉터리 동시 생성', descEn: 'Create multiple subdirectories at once' },
    ],
  },
  {
    name: 'chmod',
    synopsisKo: 'chmod [옵션] 모드 파일...',
    synopsisEn: 'chmod [OPTION] MODE FILE...',
    descKo: '파일이나 디렉터리의 권한(퍼미션)을 변경합니다.',
    descEn: 'Change file mode bits.',
    category: 'file',
    flags: [
      { flag: '-R', descKo: '디렉터리 재귀 적용', descEn: 'Apply recursively' },
      { flag: '-v', descKo: '변경 상황 출력', descEn: 'Verbose output' },
      { flag: '-c', descKo: '실제 변경된 파일만 출력', descEn: 'Report only changed files' },
    ],
    args: [
      { id: 'mode', labelKo: '권한 모드', labelEn: 'Mode', placeholder: '755' },
      { id: 'target', labelKo: '대상 파일/디렉터리', labelEn: 'Target', placeholder: '/var/www/myapp' },
    ],
    examples: [
      { cmd: 'chmod 755 script.sh', descKo: '스크립트에 실행 권한 부여 (rwxr-xr-x)', descEn: 'Make script executable (rwxr-xr-x)' },
      { cmd: 'chmod -R 644 /var/www/html/', descKo: '웹 디렉터리의 파일 권한을 rw-r--r-- 으로 일괄 변경', descEn: 'Set all files in web directory to rw-r--r--' },
      { cmd: 'chmod +x deploy.sh', descKo: '모든 사용자에게 실행 권한 추가 (심볼릭)', descEn: 'Add execute permission for all users (symbolic)' },
      { cmd: 'chmod 600 ~/.ssh/id_rsa', descKo: 'SSH 개인키 권한 설정 (소유자만 읽기/쓰기)', descEn: 'Set SSH private key permissions (owner read/write only)' },
    ],
  },
  {
    name: 'chown',
    synopsisKo: 'chown [옵션] 소유자[:그룹] 파일...',
    synopsisEn: 'chown [OPTION] OWNER[:GROUP] FILE...',
    descKo: '파일이나 디렉터리의 소유자와 그룹을 변경합니다.',
    descEn: 'Change file owner and group.',
    category: 'file',
    flags: [
      { flag: '-R', descKo: '재귀적으로 적용', descEn: 'Operate recursively' },
      { flag: '-v', descKo: '변경 상황 출력', descEn: 'Verbose output' },
      { flag: '-c', descKo: '실제 변경된 파일만 출력', descEn: 'Report only changed files' },
      { flag: '--from=현재소유자', descKo: '특정 소유자의 파일만 변경', descEn: 'Change only if current owner matches' },
    ],
    args: [
      { id: 'owner', labelKo: '소유자[:그룹]', labelEn: 'Owner[:Group]', placeholder: 'www-data:www-data' },
      { id: 'target', labelKo: '대상 파일/디렉터리', labelEn: 'Target', placeholder: '/var/www/myapp' },
    ],
    examples: [
      { cmd: 'chown -R www-data:www-data /var/www/', descKo: '웹 서버 디렉터리 소유권 변경', descEn: 'Change web server directory ownership' },
      { cmd: 'chown user:group file.txt', descKo: '파일 소유자와 그룹 동시 변경', descEn: 'Change both owner and group of a file' },
      { cmd: 'chown -Rc deploy /srv/app/', descKo: '앱 디렉터리 소유자 일괄 변경 (변경 내역만 출력)', descEn: 'Change app directory owner, report changes only' },
    ],
  },
  {
    name: 'find',
    synopsisKo: 'find [경로] [조건] [동작]',
    synopsisEn: 'find [PATH] [EXPRESSION]',
    descKo: '파일 시스템에서 파일을 검색합니다.',
    descEn: 'Search for files in a directory hierarchy.',
    category: 'file',
    flags: [
      { flag: '-name "패턴"', descKo: '파일명 패턴으로 검색 (와일드카드 지원)', descEn: 'Search by filename pattern' },
      { flag: '-type f', descKo: '일반 파일만 검색', descEn: 'Find regular files only' },
      { flag: '-type d', descKo: '디렉터리만 검색', descEn: 'Find directories only' },
      { flag: '-mtime -7', descKo: '최근 7일 내 수정된 파일', descEn: 'Modified in last 7 days' },
      { flag: '-size +100M', descKo: '100MB 이상 파일 검색', descEn: 'Files larger than 100MB' },
      { flag: '-perm 644', descKo: '특정 권한의 파일 검색', descEn: 'Find files with specific permissions' },
      { flag: '-exec {} \\;', descKo: '찾은 파일에 명령 실행', descEn: 'Execute command on each found file' },
      { flag: '-maxdepth 2', descKo: '탐색 깊이 제한', descEn: 'Limit search depth' },
    ],
    args: [
      { id: 'path', labelKo: '검색 경로', labelEn: 'Search path', placeholder: '/var/log' },
    ],
    examples: [
      { cmd: 'find / -name "*.log" -type f -mtime -7', descKo: '최근 7일 내 수정된 로그 파일 검색', descEn: 'Find log files modified in last 7 days' },
      { cmd: 'find . -size +100M -type f', descKo: '현재 디렉터리에서 100MB 이상 파일 검색', descEn: 'Find files larger than 100MB in current directory' },
      { cmd: 'find /tmp -name "*.tmp" -exec rm {} \\;', descKo: '.tmp 파일을 찾아서 삭제', descEn: 'Find and delete all .tmp files' },
      { cmd: 'find . -type d -name node_modules', descKo: 'node_modules 디렉터리 검색', descEn: 'Find all node_modules directories' },
    ],
  },
  // ── Text commands ───────────────────────────────────────────────────────────
  {
    name: 'grep',
    synopsisKo: 'grep [옵션] 패턴 [파일...]',
    synopsisEn: 'grep [OPTION] PATTERN [FILE...]',
    descKo: '파일에서 패턴과 일치하는 줄을 검색합니다.',
    descEn: 'Search for PATTERN in each FILE.',
    category: 'text',
    flags: [
      { flag: '-i', descKo: '대소문자 구분 없이 검색', descEn: 'Case-insensitive matching' },
      { flag: '-r', descKo: '디렉터리를 재귀적으로 검색', descEn: 'Recursive search' },
      { flag: '-n', descKo: '줄 번호 함께 출력', descEn: 'Print line numbers' },
      { flag: '-v', descKo: '패턴과 일치하지 않는 줄 출력 (반전)', descEn: 'Invert match' },
      { flag: '-c', descKo: '일치하는 줄 개수만 출력', descEn: 'Print count of matching lines' },
      { flag: '-l', descKo: '패턴이 있는 파일명만 출력', descEn: 'Print only filenames with matches' },
      { flag: '-E', descKo: '확장 정규식 사용 (egrep)', descEn: 'Extended regular expressions' },
      { flag: '-A 3', descKo: '일치하는 줄 이후 3줄 출력 (숫자 수정 가능)', descEn: 'Print N lines after match' },
    ],
    args: [
      { id: 'pattern', labelKo: '검색 패턴', labelEn: 'Pattern', placeholder: 'error|ERROR' },
      { id: 'target', labelKo: '파일/경로', labelEn: 'File/Path', placeholder: '/var/log/syslog' },
    ],
    examples: [
      { cmd: 'grep -rn "TODO" ./src/', descKo: 'src 디렉터리에서 TODO 주석 검색 (줄 번호 포함)', descEn: 'Find TODO comments in src directory with line numbers' },
      { cmd: 'grep -i "error" /var/log/syslog', descKo: '시스템 로그에서 대소문자 무관 error 검색', descEn: 'Case-insensitive search for error in syslog' },
      { cmd: 'grep -E "^[0-9]{4}-[0-9]{2}-[0-9]{2}" log.txt', descKo: '날짜 패턴으로 시작하는 줄 검색', descEn: 'Find lines starting with date pattern' },
      { cmd: 'grep -v "^#" config.conf', descKo: '주석(#) 줄을 제외하고 출력', descEn: 'Show config lines excluding comments' },
    ],
  },
  {
    name: 'sed',
    synopsisKo: 'sed [옵션] \'명령\' [파일]',
    synopsisEn: 'sed [OPTION] SCRIPT [FILE]',
    descKo: '스트림 에디터. 파일 내용을 스크립트에 따라 변환합니다.',
    descEn: 'Stream editor for filtering and transforming text.',
    category: 'text',
    flags: [
      { flag: '-i', descKo: '파일을 직접 수정 (in-place)', descEn: 'Edit file in-place' },
      { flag: '-i.bak', descKo: '수정 전 .bak 백업 파일 생성', descEn: 'Edit in-place with backup (.bak)' },
      { flag: '-n', descKo: '자동 출력 억제 (p 명령과 함께)', descEn: 'Suppress automatic output' },
      { flag: '-e \'명령\'', descKo: '여러 명령 실행 (여러 번 사용)', descEn: 'Add script to commands' },
      { flag: '-r', descKo: '확장 정규식 사용', descEn: 'Use extended regular expressions' },
    ],
    args: [
      { id: 'script', labelKo: 'sed 스크립트', labelEn: 'Script', placeholder: "s/old/new/g" },
      { id: 'target', labelKo: '파일', labelEn: 'File', placeholder: 'file.txt' },
    ],
    examples: [
      { cmd: "sed 's/foo/bar/g' file.txt", descKo: "file.txt 에서 foo를 bar로 전체 치환 (출력)", descEn: 'Replace all foo with bar (stdout)' },
      { cmd: "sed -i.bak 's/localhost/127.0.0.1/g' config.conf", descKo: '백업 후 설정 파일 내 호스트명 치환', descEn: 'Replace hostname in config with backup' },
      { cmd: "sed -n '5,10p' file.txt", descKo: '5~10번째 줄만 출력', descEn: 'Print lines 5 to 10' },
      { cmd: "sed '/^#/d' config.conf", descKo: '주석 줄 삭제 후 출력', descEn: 'Delete comment lines from output' },
    ],
  },
  {
    name: 'awk',
    synopsisKo: 'awk [옵션] \'프로그램\' [파일]',
    synopsisEn: 'awk [OPTION] PROGRAM [FILE]',
    descKo: '패턴 스캔과 텍스트 처리 언어. 컬럼 기반 데이터 처리에 강력합니다.',
    descEn: 'Pattern scanning and text processing language.',
    category: 'text',
    flags: [
      { flag: '-F ","', descKo: '필드 구분자 지정 (쉼표 예시)', descEn: 'Set field separator' },
      { flag: '-v var=값', descKo: '변수 값 할당', descEn: 'Assign variable value' },
      { flag: '-f 파일', descKo: 'awk 스크립트 파일 지정', descEn: 'Read program from file' },
    ],
    args: [
      { id: 'program', labelKo: 'awk 프로그램', labelEn: 'Program', placeholder: "'{print $1, $3}'" },
      { id: 'target', labelKo: '파일', labelEn: 'File', placeholder: 'data.txt' },
    ],
    examples: [
      { cmd: "awk '{print $1}' access.log", descKo: '로그 파일의 첫 번째 컬럼(IP 주소 등)만 출력', descEn: 'Print first column from log file' },
      { cmd: "awk -F',' '{print $2, $4}' data.csv", descKo: 'CSV에서 2, 4번째 컬럼 출력', descEn: 'Print 2nd and 4th columns from CSV' },
      { cmd: "awk 'NR>1 && $3>100 {print $0}' data.txt", descKo: '헤더 제외, 3번째 컬럼이 100 초과인 행 출력', descEn: 'Skip header, print rows where column 3 > 100' },
      { cmd: "awk '{sum+=$1} END {print sum}' numbers.txt", descKo: '첫 번째 컬럼의 합계 계산', descEn: 'Sum values in first column' },
    ],
  },
  {
    name: 'cat',
    synopsisKo: 'cat [옵션] [파일...]',
    synopsisEn: 'cat [OPTION] [FILE]',
    descKo: '파일 내용을 출력하거나 파일을 연결합니다.',
    descEn: 'Concatenate files and print on standard output.',
    category: 'text',
    flags: [
      { flag: '-n', descKo: '줄 번호 표시', descEn: 'Number all output lines' },
      { flag: '-b', descKo: '비어있지 않은 줄에만 번호 표시', descEn: 'Number non-empty output lines' },
      { flag: '-A', descKo: '탭(^I), 줄끝($) 등 특수문자 표시', descEn: 'Show non-printing characters' },
      { flag: '-v', descKo: '제어 문자 표시 (탭/줄끝 제외)', descEn: 'Show non-printing except tabs/EOL' },
      { flag: '-s', descKo: '연속된 빈 줄을 하나로 압축', descEn: 'Squeeze multiple blank lines' },
      { flag: '-T', descKo: '탭 문자를 ^I 로 표시', descEn: 'Show TAB as ^I' },
    ],
    args: [
      { id: 'file', labelKo: '파일', labelEn: 'File', placeholder: '/etc/hosts' },
    ],
    examples: [
      { cmd: 'cat -n /etc/hosts', descKo: '/etc/hosts 줄 번호와 함께 출력', descEn: 'Show /etc/hosts with line numbers' },
      { cmd: 'cat file1.txt file2.txt > combined.txt', descKo: '두 파일을 합쳐서 새 파일로 저장', descEn: 'Concatenate two files into one' },
      { cmd: 'cat > newfile.txt', descKo: '표준 입력으로 새 파일 생성 (Ctrl+D로 종료)', descEn: 'Create new file from stdin (Ctrl+D to end)' },
    ],
  },
  // ── System commands ─────────────────────────────────────────────────────────
  {
    name: 'ps',
    synopsisKo: 'ps [옵션]',
    synopsisEn: 'ps [OPTION]',
    descKo: '현재 실행 중인 프로세스 목록을 출력합니다.',
    descEn: 'Report a snapshot of current processes.',
    category: 'system',
    flags: [
      { flag: 'aux', descKo: '모든 사용자의 전체 프로세스 (BSD 스타일)', descEn: 'All processes for all users (BSD style)' },
      { flag: '-ef', descKo: '전체 프로세스 (System V 스타일)', descEn: 'All processes (System V style)' },
      { flag: '-u 사용자', descKo: '특정 사용자의 프로세스만 출력', descEn: 'Processes for specific user' },
      { flag: '--sort=-%cpu', descKo: 'CPU 사용률 내림차순 정렬', descEn: 'Sort by CPU usage descending' },
      { flag: '--sort=-%mem', descKo: '메모리 사용률 내림차순 정렬', descEn: 'Sort by memory usage descending' },
      { flag: '-p PID', descKo: '특정 PID 프로세스만 출력', descEn: 'Show process with specific PID' },
    ],
    args: [],
    examples: [
      { cmd: 'ps aux | grep nginx', descKo: 'nginx 프로세스 검색', descEn: 'Find nginx processes' },
      { cmd: 'ps aux --sort=-%cpu | head -10', descKo: 'CPU 사용 상위 10개 프로세스', descEn: 'Top 10 processes by CPU usage' },
      { cmd: 'ps -ef | grep zombie', descKo: '좀비 프로세스 검색', descEn: 'Find zombie processes' },
    ],
  },
  {
    name: 'top',
    synopsisKo: 'top [옵션]',
    synopsisEn: 'top [OPTION]',
    descKo: '실시간으로 시스템 리소스와 프로세스를 모니터링합니다.',
    descEn: 'Display Linux processes in real time.',
    category: 'system',
    flags: [
      { flag: '-d 초', descKo: '갱신 주기 설정 (기본 3초)', descEn: 'Set update interval in seconds' },
      { flag: '-u 사용자', descKo: '특정 사용자 프로세스만 표시', descEn: 'Show only user\'s processes' },
      { flag: '-p PID', descKo: '특정 PID 모니터링', descEn: 'Monitor specific PID' },
      { flag: '-b', descKo: '배치 모드 (스크립트 출력용)', descEn: 'Batch mode for non-interactive use' },
      { flag: '-n 횟수', descKo: '지정 횟수만 갱신 후 종료', descEn: 'Exit after N iterations' },
      { flag: '-H', descKo: '스레드 단위로 표시', descEn: 'Show threads instead of processes' },
    ],
    args: [],
    examples: [
      { cmd: 'top -d 1 -u www-data', descKo: '1초 간격으로 www-data 사용자 프로세스 모니터링', descEn: 'Monitor www-data processes with 1s interval' },
      { cmd: 'top -b -n 1 | head -20', descKo: '상위 20개 프로세스 스냅샷 출력', descEn: 'One-time snapshot of top 20 processes' },
      { cmd: 'top -H -p $(pgrep java)', descKo: 'Java 프로세스 스레드 모니터링', descEn: 'Monitor Java process threads' },
    ],
  },
  {
    name: 'df',
    synopsisKo: 'df [옵션] [파일시스템]',
    synopsisEn: 'df [OPTION] [FILE]',
    descKo: '파일 시스템의 디스크 사용량을 출력합니다.',
    descEn: 'Report file system disk space usage.',
    category: 'system',
    flags: [
      { flag: '-h', descKo: '사람이 읽기 쉬운 단위 (KB, MB, GB)', descEn: 'Human-readable sizes' },
      { flag: '-T', descKo: '파일 시스템 타입 표시', descEn: 'Show filesystem type' },
      { flag: '-i', descKo: 'inode 사용량 표시', descEn: 'Show inode information' },
      { flag: '-x tmpfs', descKo: '특정 파일 시스템 제외', descEn: 'Exclude filesystem type' },
      { flag: '--total', descKo: '전체 합계 행 추가', descEn: 'Show grand total' },
      { flag: '-l', descKo: '로컬 파일 시스템만 표시', descEn: 'Show local filesystems only' },
    ],
    args: [
      { id: 'fs', labelKo: '파일시스템/경로', labelEn: 'Filesystem/Path', placeholder: '/' },
    ],
    examples: [
      { cmd: 'df -hT', descKo: '모든 파일 시스템의 디스크 사용량과 타입 출력', descEn: 'Show all filesystems with type and human-readable sizes' },
      { cmd: 'df -h /', descKo: '루트 파일 시스템 사용량만 출력', descEn: 'Show root filesystem usage' },
      { cmd: 'df -i /dev/sda1', descKo: '특정 파티션의 inode 사용량 확인', descEn: 'Check inode usage for specific partition' },
    ],
  },
]

const CATEGORY_LABELS: Record<string, { ko: string; en: string; color: string }> = {
  file: { ko: '파일/디렉터리', en: 'File/Directory', color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  text: { ko: '텍스트 처리', en: 'Text Processing', color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  system: { ko: '시스템', en: 'System', color: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LinuxCommand() {
  const t = useTranslations('linuxCommand')
  const [selectedCmd, setSelectedCmd] = useState<string>('ls')
  const [selectedFlags, setSelectedFlags] = useState<Set<string>>(new Set())
  const [args, setArgs] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const cmd = useMemo(() => COMMANDS.find(c => c.name === selectedCmd)!, [selectedCmd])

  // Build the final command string
  const builtCommand = useMemo(() => {
    const parts: string[] = [cmd.name]

    // Flags in definition order
    cmd.flags.forEach(f => {
      if (selectedFlags.has(f.flag)) {
        parts.push(f.flag)
      }
    })

    // Arguments
    cmd.args.forEach(a => {
      const val = args[a.id]?.trim()
      if (val) {
        if (a.prefix) {
          parts.push(a.prefix)
        }
        parts.push(val)
      }
    })

    return parts.join(' ')
  }, [cmd, selectedFlags, args])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      // ignore
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleCommandSelect = useCallback((name: string) => {
    setSelectedCmd(name)
    setSelectedFlags(new Set())
    setArgs({})
    setShowDropdown(false)
  }, [])

  const toggleFlag = useCallback((flag: string) => {
    setSelectedFlags(prev => {
      const next = new Set(prev)
      if (next.has(flag)) next.delete(flag)
      else next.add(flag)
      return next
    })
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Terminal className="w-7 h-7 text-green-600 dark:text-green-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('description')}</p>
      </div>

      {/* Command Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('selectCommand')}</h2>
        <div className="flex flex-wrap gap-2">
          {(['file', 'text', 'system'] as const).map(cat => (
            <div key={cat} className="w-full">
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded mb-2 ${CATEGORY_LABELS[cat].color}`}>
                {CATEGORY_LABELS[cat].ko}
              </span>
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMANDS.filter(c => c.category === cat).map(c => (
                  <button
                    key={c.name}
                    onClick={() => handleCommandSelect(c.name)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-mono font-semibold transition-all ${
                      selectedCmd === c.name
                        ? 'bg-green-600 text-white shadow-lg shadow-green-900/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: flags + args */}
        <div className="lg:col-span-2 space-y-5">
          {/* Quick Reference */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('synopsis')}</h2>
            <code className="block text-green-600 dark:text-green-400 font-mono text-sm bg-gray-800 dark:bg-gray-900 rounded-lg px-3 py-2 break-all">
              {cmd.synopsisKo}
            </code>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">{cmd.descKo}</p>
          </div>

          {/* Flags */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('options')}</h2>
              {selectedFlags.size > 0 && (
                <button
                  onClick={() => setSelectedFlags(new Set())}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  {t('clearAll')}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {cmd.flags.map(f => (
                <label
                  key={f.flag}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selectedFlags.has(f.flag)}
                    onChange={() => toggleFlag(f.flag)}
                    className="mt-0.5 w-4 h-4 rounded accent-green-500 flex-shrink-0"
                  />
                  <div>
                    <span className="font-mono text-sm text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                      {f.flag}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">{f.descKo}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Arguments */}
          {cmd.args.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('arguments')}</h2>
              <div className="space-y-3">
                {cmd.args.map(a => (
                  <div key={a.id}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{a.labelKo}</label>
                    <input
                      type="text"
                      value={args[a.id] ?? ''}
                      onChange={e => setArgs(prev => ({ ...prev, [a.id]: e.target.value }))}
                      placeholder={a.placeholder}
                      className="w-full px-3 py-2 bg-gray-800 dark:bg-gray-900 border border-gray-700 dark:border-gray-600 rounded-lg text-sm text-gray-100 dark:text-gray-200 font-mono placeholder-gray-500 dark:placeholder-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: generated command + examples */}
        <div className="lg:col-span-3 space-y-5">
          {/* Generated command */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-300 dark:border-green-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                {t('generatedCommand')}
              </h2>
              <button
                onClick={() => copyToClipboard(builtCommand, 'main')}
                className="flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                {copiedId === 'main' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === 'main' ? t('copied') : t('copy')}
              </button>
            </div>
            <div className="bg-gray-800 dark:bg-gray-950 rounded-lg px-4 py-3 border border-gray-700">
              <code className="text-green-300 font-mono text-sm break-all">
                <span className="text-gray-500 mr-2 select-none">$</span>
                {builtCommand}
              </code>
            </div>
            {selectedFlags.size === 0 && cmd.args.every(a => !args[a.id]?.trim()) && (
              <p className="text-gray-500 text-xs mt-2">{t('selectOptionsHint')}</p>
            )}
          </div>

          {/* Examples */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {t('examples')}
            </h2>
            <div className="space-y-3">
              {cmd.examples.map((ex, i) => (
                <div key={i} className="bg-gray-800 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <code className="text-green-300 font-mono text-xs break-all flex-1">
                      <span className="text-gray-500 dark:text-gray-600 mr-1.5 select-none">$</span>
                      {ex.cmd}
                    </code>
                    <button
                      onClick={() => copyToClipboard(ex.cmd, `ex-${i}`)}
                      className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1"
                      title={t('copy')}
                    >
                      {copiedId === `ex-${i}` ? <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1.5">{ex.descKo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Man page style reference */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('allOptions')}</h2>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {cmd.flags.map(f => (
                <div key={f.flag} className="py-2 flex items-start gap-3">
                  <code className="font-mono text-xs text-yellow-600 dark:text-yellow-400 w-32 flex-shrink-0 pt-0.5">{f.flag}</code>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">{f.descKo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
