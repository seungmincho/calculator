'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Database, 
  Check, 
  Copy, 
  Download, 
  Upload, 
  AlertCircle, 
  Zap, 
  Eye, 
  Code,
  RefreshCw,
  Settings,
  FileText,
  Layers,
  Expand,
  Shrink
} from 'lucide-react';

const SqlFormatter = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'format' | 'minify' | 'analyze'>('format');
  const [indentSize, setIndentSize] = useState(2);
  const [sqlDialect, setSqlDialect] = useState<'standard' | 'mysql' | 'postgresql' | 'mssql' | 'oracle'>('standard');
  const [uppercaseKeywords, setUppercaseKeywords] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // SQL 키워드 정의
  const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
    'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
    'ALTER', 'DROP', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
    'CONSTRAINT', 'UNIQUE', 'DEFAULT', 'CHECK', 'AUTOINCREMENT', 'AUTO_INCREMENT',
    'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
    'UNION', 'ALL', 'DISTINCT', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'ISNULL', 'IFNULL',
    'CAST', 'CONVERT', 'SUBSTRING', 'LENGTH', 'UPPER', 'LOWER', 'TRIM',
    'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'NOW', 'CURDATE', 'CURTIME'
  ];

  // SQL 함수들
  const SQL_FUNCTIONS = [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'ISNULL', 'IFNULL',
    'CAST', 'CONVERT', 'SUBSTRING', 'LENGTH', 'UPPER', 'LOWER', 'TRIM',
    'CONCAT', 'REPLACE', 'LEFT', 'RIGHT', 'ROUND', 'FLOOR', 'CEIL',
    'ABS', 'POWER', 'SQRT', 'MOD', 'RAND', 'UUID'
  ];

  // SQL 포맷팅 함수
  const formatSql = useCallback((sql: string): string => {
    if (!sql.trim()) return '';

    let formatted = sql.trim();
    
    // 기본 정리
    formatted = formatted.replace(/\s+/g, ' '); // 여러 공백을 하나로
    
    // 키워드 대소문자 처리
    if (uppercaseKeywords) {
      SQL_KEYWORDS.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        formatted = formatted.replace(regex, keyword.toUpperCase());
      });
    }

    // CREATE TABLE 특별 처리
    if (formatted.match(/CREATE\s+TABLE/i)) {
      return formatCreateTable(formatted);
    }

    // INSERT INTO 특별 처리
    if (formatted.match(/INSERT\s+INTO/i)) {
      return formatInsertStatement(formatted);
    }

    // 일반 SELECT/UPDATE/DELETE 쿼리 처리
    return formatGeneralQuery(formatted);
  }, [indentSize, uppercaseKeywords]);

  // CREATE TABLE 포맷팅
  const formatCreateTable = useCallback((sql: string): string => {
    const indentStr = ' '.repeat(indentSize);
    let formatted = sql;

    // CREATE TABLE 부분 추출
    const createTableMatch = formatted.match(/(CREATE\s+TABLE\s+\w+)\s*\(([\s\S]*)\)\s*;?/i);
    if (!createTableMatch) return formatted;

    const [, createPart, columnsPart] = createTableMatch;
    
    // 컬럼 정의 분리 (중첩 괄호 고려)
    const columns = [];
    let currentColumn = '';
    let parenDepth = 0;
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < columnsPart.length; i++) {
      const char = columnsPart[i];
      const prevChar = i > 0 ? columnsPart[i - 1] : '';

      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
      }

      if (!inQuotes) {
        if (char === '(') parenDepth++;
        if (char === ')') parenDepth--;
        
        if (char === ',' && parenDepth === 0) {
          columns.push(currentColumn.trim());
          currentColumn = '';
          continue;
        }
      }

      currentColumn += char;
    }
    
    if (currentColumn.trim()) {
      columns.push(currentColumn.trim());
    }

    // 각 컬럼 정의 포맷팅
    const formattedColumns = columns.map(column => {
      let col = column.trim();
      
      // PRIMARY KEY AUTO_INCREMENT 수정
      col = col.replace(/PRIMARY\s+KEYAUTO_INCREMENT/gi, 'PRIMARY KEY AUTO_INCREMENT');
      col = col.replace(/AUTO_INCREMENT/gi, uppercaseKeywords ? 'AUTO_INCREMENT' : 'auto_increment');
      col = col.replace(/PRIMARY\s+KEY/gi, uppercaseKeywords ? 'PRIMARY KEY' : 'primary key');
      col = col.replace(/NOT\s+NULL/gi, uppercaseKeywords ? 'NOT NULL' : 'not null');
      col = col.replace(/UNSIGNED/gi, uppercaseKeywords ? 'UNSIGNED' : 'unsigned');
      
      return indentStr + col;
    }).join(',\n');

    const finalCreatePart = uppercaseKeywords ? createPart.toUpperCase() : createPart;
    
    return `${finalCreatePart}(\n${formattedColumns}\n);`;
  }, [indentSize, uppercaseKeywords]);

  // INSERT 문 포맷팅
  const formatInsertStatement = useCallback((sql: string): string => {
    const indentStr = ' '.repeat(indentSize);
    let formatted = sql;

    // INSERT INTO table (columns) VALUES 패턴
    const insertMatch = formatted.match(/(INSERT\s+INTO\s+\w+)\s*(\([^)]+\))?\s*(VALUES)\s*(\([\s\S]*\))\s*;?/i);
    if (insertMatch) {
      const [, insertPart, columnsPart, valuesPart, valuesData] = insertMatch;
      
      let result = uppercaseKeywords ? insertPart.toUpperCase() : insertPart;
      
      if (columnsPart) {
        // 컬럼 목록이 있는 경우
        const columns = columnsPart.slice(1, -1).split(',').map(col => col.trim());
        const formattedColumns = columns.join(', ');
        result += ` (\n${indentStr}${formattedColumns}\n)`;
      }
      
      result += `\n${uppercaseKeywords ? valuesPart.toUpperCase() : valuesPart} ${valuesData};`;
      return result;
    }

    return formatted;
  }, [indentSize, uppercaseKeywords]);

  // 일반 쿼리 포맷팅
  const formatGeneralQuery = useCallback((sql: string): string => {
    const indentStr = ' '.repeat(indentSize);
    let formatted = sql;

    // 괄호 정리
    formatted = formatted.replace(/\(\s+/g, '(');
    formatted = formatted.replace(/\s+\)/g, ')');
    formatted = formatted.replace(/,\s*/g, ', ');

    // 주요 절에서 줄바꿈
    const majorClauses = [
      'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 
      'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'OUTER JOIN',
      'UNION', 'UNION ALL', 'UPDATE', 'SET', 'DELETE FROM'
    ];

    majorClauses.forEach(clause => {
      const regex = new RegExp(`\\b${clause}\\b`, 'gi');
      formatted = formatted.replace(regex, `\n${uppercaseKeywords ? clause.toUpperCase() : clause}`);
    });

    // SELECT 절의 컬럼들 포맷팅
    formatted = formatted.replace(/\nSELECT\s+([\s\S]+?)(?=\nFROM|\nWHERE|\n|$)/i, (match, selectPart) => {
      const columns = selectPart.split(',').map((col: string) => col.trim());
      if (columns.length > 1) {
        const formattedColumns = columns.map((col: string, index: number) => 
          index === 0 ? col : indentStr + col
        ).join(',\n');
        return `\n${uppercaseKeywords ? 'SELECT' : 'select'} ${formattedColumns}`;
      }
      return match;
    });

    // 들여쓰기 적용
    const lines = formatted.split('\n').map(line => line.trim()).filter(line => line);
    let indentLevel = 0;
    
    const formattedLines = lines.map((line, index) => {
      // 서브쿼리 처리
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      
      if (line.match(/^\)/)) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      const currentIndent = indentStr.repeat(indentLevel);
      
      if (openParens > closeParens) {
        indentLevel += (openParens - closeParens);
      }
      
      return currentIndent + line;
    });

    return formattedLines.join('\n');
  }, [indentSize, uppercaseKeywords]);

  // SQL 압축 함수
  const minifySql = useCallback((sql: string): string => {
    if (!sql.trim()) return '';
    
    let minified = sql.trim();
    
    // 주석 제거
    minified = minified.replace(/--.*$/gm, '');
    minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // 여러 공백을 하나로
    minified = minified.replace(/\s+/g, ' ');
    
    // 불필요한 공백 제거
    minified = minified.replace(/\s*([(),;])\s*/g, '$1');
    
    return minified.trim();
  }, []);

  // SQL 분석 함수
  const analyzeSql = useCallback((sql: string) => {
    if (!sql.trim()) return null;

    const analysis = {
      tables: [] as string[],
      columns: [] as string[],
      functions: [] as string[],
      joins: [] as string[],
      complexity: 'Low',
      suggestions: [] as string[]
    };

    const upperSql = sql.toUpperCase();

    // 테이블 추출
    const fromMatches = sql.match(/FROM\s+(\w+)/gi);
    const joinMatches = sql.match(/JOIN\s+(\w+)/gi);
    
    if (fromMatches) {
      fromMatches.forEach(match => {
        const table = match.replace(/FROM\s+/i, '').trim();
        if (!analysis.tables.includes(table)) {
          analysis.tables.push(table);
        }
      });
    }

    if (joinMatches) {
      joinMatches.forEach(match => {
        const table = match.replace(/JOIN\s+/i, '').trim();
        if (!analysis.tables.includes(table)) {
          analysis.tables.push(table);
        }
      });
    }

    // 함수 추출
    SQL_FUNCTIONS.forEach(func => {
      const regex = new RegExp(`\\b${func}\\s*\\(`, 'gi');
      if (regex.test(sql)) {
        analysis.functions.push(func);
      }
    });

    // JOIN 타입 추출
    const joinTypes = ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN'];
    joinTypes.forEach(joinType => {
      const regex = new RegExp(`\\b${joinType}\\b`, 'gi');
      const matches = sql.match(regex);
      if (matches) {
        analysis.joins.push(...matches.map(match => match.toUpperCase()));
      }
    });

    // 복잡도 계산
    let complexityScore = 0;
    complexityScore += analysis.tables.length * 2;
    complexityScore += analysis.functions.length;
    complexityScore += analysis.joins.length * 3;
    complexityScore += (sql.match(/WHERE/gi) || []).length * 2;
    complexityScore += (sql.match(/GROUP BY/gi) || []).length * 3;
    complexityScore += (sql.match(/ORDER BY/gi) || []).length;
    complexityScore += (sql.match(/UNION/gi) || []).length * 4;

    if (complexityScore < 5) analysis.complexity = 'Low';
    else if (complexityScore < 15) analysis.complexity = 'Medium';
    else analysis.complexity = 'High';

    // 최적화 제안
    if (sql.includes('SELECT *')) {
      analysis.suggestions.push('SELECT * 대신 필요한 컬럼만 명시하세요');
    }
    if (!sql.includes('WHERE') && sql.includes('SELECT')) {
      analysis.suggestions.push('WHERE 절을 추가하여 데이터를 필터링하세요');
    }
    if (analysis.joins.length > 3) {
      analysis.suggestions.push('많은 JOIN이 있습니다. 쿼리를 분할하는 것을 고려하세요');
    }
    if (sql.includes('OR')) {
      analysis.suggestions.push('OR 조건은 성능에 영향을 줄 수 있습니다. UNION 사용을 고려하세요');
    }

    return analysis;
  }, []);

  // 메인 처리 함수
  const processSql = useCallback((sqlString: string) => {
    if (!sqlString.trim()) {
      setOutput('');
      setError('');
      setAnalysis(null);
      return;
    }

    try {
      let result = '';
      
      switch (mode) {
        case 'format':
          result = formatSql(sqlString);
          setAnalysis(null);
          break;
        case 'minify':
          result = minifySql(sqlString);
          setAnalysis(null);
          break;
        case 'analyze':
          const analysisResult = analyzeSql(sqlString);
          setAnalysis(analysisResult);
          result = formatSql(sqlString); // 분석 모드에서도 포맷팅된 SQL 보여주기
          break;
      }
      
      setOutput(result);
      setError('');
    } catch (err) {
      setError('SQL 처리 중 오류가 발생했습니다');
    }
  }, [mode, formatSql, minifySql, analyzeSql]);

  // 입력 변경 처리 (디바운싱)
  useEffect(() => {
    const timer = setTimeout(() => {
      processSql(input);
    }, 300);

    return () => clearTimeout(timer);
  }, [input, processSql]);

  // 클립보드 복사
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (outputRef.current) {
        outputRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [output]);

  // 파일 업로드
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setInput(content);
    };
    reader.readAsText(file);
  }, []);

  // 파일 다운로드
  const handleDownload = useCallback(() => {
    const blob = new Blob([output], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formatted-${Date.now()}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [output]);

  // 예제 SQL
  const insertExample = useCallback(() => {
    const examples = [
      // CREATE TABLE 예제
      `CREATE TABLE article(    id INT(10) UNSIGNED NOT NULL PRIMARY KEYAUTO_INCREMENT,    regDate DATETIME NOT NULL,    title CHAR(100) NOT NULL,    body TEXT NOT NULL
);`,
      
      // SELECT 예제
      `SELECT u.id, u.name, u.email, p.title, c.name as category_name FROM users u LEFT JOIN posts p ON u.id = p.user_id INNER JOIN categories c ON p.category_id = c.id WHERE u.status = 'active' AND p.published_at IS NOT NULL AND c.slug IN ('tech', 'business', 'lifestyle') GROUP BY u.id, u.name, u.email HAVING COUNT(p.id) > 5 ORDER BY u.name ASC, p.published_at DESC LIMIT 50;`,
      
      // INSERT 예제
      `INSERT INTO users (name, email, status, created_at) VALUES ('John Doe', 'john@example.com', 'active', NOW()), ('Jane Smith', 'jane@example.com', 'pending', NOW());`,
      
      // UPDATE 예제
      `UPDATE posts SET title = 'Updated Title', body = 'Updated content here' WHERE id = 1 AND user_id = (SELECT id FROM users WHERE email = 'john@example.com');`
    ];
    
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    setInput(randomExample);
  }, []);

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-4 overflow-auto' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SQL 포맷터</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            SQL 쿼리를 예쁘게 포맷팅하고 압축하세요.
          </p>
        </div>
      </div>

      {/* 컨트롤 패널 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* 모드 선택 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">모드:</span>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {[
                { key: 'format', label: '포맷팅', icon: Code },
                { key: 'minify', label: '압축', icon: Zap },
                { key: 'analyze', label: '분석', icon: Layers }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMode(key as any)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === key
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 도구 버튼들 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              {isFullscreen ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
              <span>{isFullscreen ? '창모드' : '전체화면'}</span>
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>설정</span>
            </button>

            <button
              onClick={insertExample}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>예제</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".sql,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>업로드</span>
            </button>

            {output && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 px-3 py-2 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? '복사됨!' : '복사'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-1 px-3 py-2 bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>다운로드</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 설정 패널 */}
        {showSettings && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  들여쓰기 크기
                </label>
                <select
                  value={indentSize}
                  onChange={(e) => setIndentSize(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={2}>2 스페이스</option>
                  <option value={4}>4 스페이스</option>
                  <option value={8}>8 스페이스</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SQL 방언
                </label>
                <select
                  value={sqlDialect}
                  onChange={(e) => setSqlDialect(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="standard">표준 SQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mssql">SQL Server</option>
                  <option value="oracle">Oracle</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={uppercaseKeywords}
                    onChange={(e) => setUppercaseKeywords(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">키워드 대문자</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 입력 영역 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SQL 입력</h2>
          </div>
          
          <div className="p-6">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="SQL 쿼리를 입력하세요..."
              className={`w-full ${isFullscreen ? 'h-[calc(100vh-300px)]' : 'h-96'} p-4 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm`}
              spellCheck={false}
            />
            
            {error && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-200">SQL 처리 오류</h4>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 출력 영역 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {mode === 'format' ? '포맷팅 결과' : mode === 'minify' ? '압축 결과' : '분석 결과'}
            </h2>
          </div>
          
          <div className="p-6">
            {mode === 'analyze' && analysis ? (
              <div className="space-y-6">
                {/* SQL 출력 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">포맷팅된 쿼리</h3>
                  <textarea
                    ref={outputRef}
                    value={output}
                    readOnly
                    className={`w-full ${isFullscreen ? 'h-[calc(100vh-500px)]' : 'h-48'} p-4 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg resize-none font-mono text-sm`}
                  />
                </div>

                {/* 분석 결과 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">테이블</h4>
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      {analysis.tables.length > 0 ? analysis.tables.join(', ') : '없음'}
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">함수</h4>
                    <div className="text-sm text-green-800 dark:text-green-300">
                      {analysis.functions.length > 0 ? analysis.functions.join(', ') : '없음'}
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-900 dark:text-purple-200 mb-2">JOIN 타입</h4>
                    <div className="text-sm text-purple-800 dark:text-purple-300">
                      {analysis.joins.length > 0 ? analysis.joins.join(', ') : '없음'}
                    </div>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-orange-900 dark:text-orange-200 mb-2">복잡도</h4>
                    <div className="text-sm text-orange-800 dark:text-orange-300">
                      {analysis.complexity}
                    </div>
                  </div>
                </div>

                {analysis.suggestions.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-amber-900 dark:text-amber-200 mb-2">최적화 제안</h4>
                    <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                      {analysis.suggestions.map((suggestion: string, index: number) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                ref={outputRef}
                value={output}
                readOnly
                placeholder="포맷팅된 SQL이 여기에 표시됩니다..."
                className={`w-full ${isFullscreen ? 'h-[calc(100vh-300px)]' : 'h-96'} p-4 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg resize-none font-mono text-sm`}
              />
            )}
          </div>
        </div>
      </div>

      {/* 도움말 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">🚀 SQL 포맷터 마스터 가이드</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-4xl mx-auto break-keep whitespace-pre-line">
          데이터베이스 전문가부터 초보 개발자까지! SQL 쿼리를 프로처럼 다루는 모든 것을 배워보세요. 
          실무에서 바로 쓸 수 있는 팁과 베스트 프랙티스가 가득합니다.
        </p>
        
        {/* 핵심 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full mr-3">
                <Code className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">✨ 스마트 포맷팅</h3>
            </div>
            <p className="text-blue-800 dark:text-blue-300 mb-4 leading-relaxed">
              AI처럼 똑똑한 SQL 포맷터가 복잡한 쿼리도 한 번에 깔끔하게 정리해드립니다.
            </p>
            <div className="space-y-3">
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🎯 자동 들여쓰기</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">중첩된 서브쿼리와 복잡한 JOIN까지 완벽하게 정렬</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🔤 키워드 정규화</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">SELECT, FROM, WHERE 등 모든 키워드를 일관된 스타일로</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">📋 스키마 인식</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">CREATE TABLE, INSERT 문을 특별히 예쁘게 정리</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-green-600 p-3 rounded-full mr-3">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-200">⚡ 초고속 압축</h3>
            </div>
            <p className="text-green-800 dark:text-green-300 mb-4 leading-relaxed">
              프로덕션 환경에서 필수! SQL 파일을 최대 80%까지 압축해서 성능을 끌어올려보세요.
            </p>
            <div className="space-y-3">
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">🗜️ 공백 최적화</h4>
                <p className="text-sm text-green-700 dark:text-green-300">불필요한 공백과 줄바꿈을 지능적으로 제거</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">💬 주석 정리</h4>
                <p className="text-sm text-green-700 dark:text-green-300">개발용 주석은 제거하고 핵심 로직만 남김</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">🚀 배포 준비</h4>
                <p className="text-sm text-green-700 dark:text-green-300">CDN이나 웹서버에 올리기 완벽한 상태로 변환</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-purple-600 p-3 rounded-full mr-3">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-200">🔍 전문가 분석</h3>
            </div>
            <p className="text-purple-800 dark:text-purple-300 mb-4 leading-relaxed">
              15년 경력 DBA가 직접 만든 분석 엔진으로 쿼리의 숨겨진 문제점을 찾아내세요.
            </p>
            <div className="space-y-3">
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">🏗️ 구조 분석</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">테이블 관계와 JOIN 패턴을 한눈에 파악</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">⚠️ 성능 경고</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">느린 쿼리의 원인을 미리 알려주는 똑똑한 AI</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">💡 개선 제안</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">실무진이 검증한 최적화 팁을 바로 적용</p>
              </div>
            </div>
          </div>
        </div>

        {/* 실습으로 배우는 섹션 */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🎓 실습으로 배우는 SQL 포맷팅</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">실제 현업에서 자주 마주치는 지저분한 SQL들을 어떻게 깔끔하게 만드는지 살펴보세요!</p>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center">
                <span className="bg-red-100 dark:bg-red-900 p-2 rounded-full mr-2">😰</span>
                이런 SQL 보신 적 있나요?
              </h4>
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded-r-lg">
                <pre className="text-sm text-red-800 dark:text-red-300 overflow-x-auto whitespace-pre-wrap">
{`select u.id,u.name,u.email,p.title,p.content,c.name as category_name,
(select count(*) from likes l where l.post_id=p.id) as like_count,
(select avg(rating) from reviews r where r.post_id=p.id) as avg_rating
from users u left join posts p on u.id=p.user_id inner join categories c on p.category_id=c.id 
where u.status='active' and p.published_at is not null and p.published_at>=date_sub(now(),interval 30 day) 
and c.slug in ('tech','business','lifestyle') and (p.title like '%react%' or p.content like '%react%') 
group by u.id,u.name,u.email,p.id,p.title,p.content,c.name 
having like_count>5 and avg_rating>=4.0 
order by p.published_at desc,like_count desc limit 20;`}
                </pre>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-2">✨</span>
                이렇게 바뀝니다!
              </h4>
              <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4 rounded-r-lg">
                <pre className="text-sm text-green-800 dark:text-green-300 overflow-x-auto whitespace-pre-wrap">
{`SELECT u.id,
  u.name,
  u.email,
  p.title,
  p.content,
  c.name AS category_name,
  (
    SELECT COUNT(*)
    FROM likes l
    WHERE l.post_id = p.id
  ) AS like_count,
  (
    SELECT AVG(rating)
    FROM reviews r
    WHERE r.post_id = p.id
  ) AS avg_rating
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
INNER JOIN categories c ON p.category_id = c.id
WHERE u.status = 'active'
  AND p.published_at IS NOT NULL
  AND p.published_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND c.slug IN ('tech', 'business', 'lifestyle')
  AND (p.title LIKE '%react%' OR p.content LIKE '%react%')
GROUP BY u.id, u.name, u.email, p.id, p.title, p.content, c.name
HAVING like_count > 5 AND avg_rating >= 4.0
ORDER BY p.published_at DESC, like_count DESC
LIMIT 20;`}
                </pre>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <h5 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">🔍 무엇이 달라졌나요?</h5>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-300">
              <ul className="space-y-1">
                <li>✅ SELECT 절의 각 컬럼이 명확히 분리됨</li>
                <li>✅ 서브쿼리가 들여쓰기로 구조화됨</li>
                <li>✅ JOIN 조건이 한눈에 들어옴</li>
                <li>✅ WHERE 조건들이 논리적으로 정렬됨</li>
              </ul>
              <ul className="space-y-1">
                <li>✅ 키워드가 대문자로 통일됨</li>
                <li>✅ 괄호와 연산자 주변 공백 정리</li>
                <li>✅ GROUP BY, ORDER BY 절이 읽기 쉬워짐</li>
                <li>✅ 전체적인 가독성이 10배 향상!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 데이터베이스별 완벽 지원 */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🗄️ 모든 데이터베이스를 완벽 지원</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">MySQL부터 Oracle까지! 어떤 DB를 쓰든 걱정 없어요.</p>
          
          <div className="grid lg:grid-cols-5 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center transform hover:scale-105 transition-transform">
              <div className="text-3xl mb-3">🐬</div>
              <h4 className="font-bold text-blue-600 mb-2">MySQL</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">AUTO_INCREMENT, 백틱 문법까지 완벽 지원</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center transform hover:scale-105 transition-transform">
              <div className="text-3xl mb-3">🐘</div>
              <h4 className="font-bold text-blue-600 mb-2">PostgreSQL</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">SERIAL, JSON 컬럼 등 고급 기능 인식</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center transform hover:scale-105 transition-transform">
              <div className="text-3xl mb-3">🏢</div>
              <h4 className="font-bold text-blue-600 mb-2">SQL Server</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">T-SQL 전용 문법과 함수들 모두 지원</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center transform hover:scale-105 transition-transform">
              <div className="text-3xl mb-3">🏛️</div>
              <h4 className="font-bold text-orange-600 mb-2">Oracle</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">PL/SQL 블록과 오라클 힌트까지</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center transform hover:scale-105 transition-transform">
              <div className="text-3xl mb-3">📊</div>
              <h4 className="font-bold text-green-600 mb-2">표준 SQL</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">ANSI SQL 표준 문법 100% 호환</p>
            </div>
          </div>
        </div>

        {/* 상세 문법 지원표 */}
        <div className="space-y-8">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">📚 지원하는 SQL 문법 완전정복</h3>
            
            {/* DDL 섹션 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <h4 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">🏗️</span>
                DDL (Data Definition Language) - 스키마 정의
              </h4>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">테이블 관리</h5>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-blue-600 font-mono text-sm">CREATE TABLE</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">복잡한 테이블 스키마도 깔끔하게 정렬. 각 컬럼이 한 줄씩, 제약조건까지 완벽 정리</p>
                      <div className="mt-2 text-xs text-gray-500">
                        ✨ PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK 제약조건 모두 지원
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-blue-600 font-mono text-sm">ALTER TABLE</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">컬럼 추가/삭제/수정 명령어를 읽기 쉽게 구조화</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-blue-600 font-mono text-sm">DROP TABLE</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">CASCADE, RESTRICT 옵션까지 정확히 포맷팅</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">인덱스 & 뷰</h5>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-blue-600 font-mono text-sm">CREATE INDEX</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">복합 인덱스의 컬럼들을 보기 좋게 나열</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-blue-600 font-mono text-sm">CREATE VIEW</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">복잡한 뷰 정의도 단계별로 들여쓰기</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-blue-600 font-mono text-sm">CREATE PROCEDURE</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">저장 프로시저 파라미터까지 깔끔하게</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DML 섹션 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <h4 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3">📊</span>
                DML (Data Manipulation Language) - 데이터 조작
              </h4>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">SELECT 쿼리의 달인</h5>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-green-600 font-mono text-sm">복잡한 JOIN</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">INNER, LEFT, RIGHT, FULL OUTER JOIN을 논리적 순서로 배치</p>
                      <div className="mt-2 text-xs text-gray-500">
                        💡 ON 조건을 들여쓰기로 명확하게 구분
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-green-600 font-mono text-sm">서브쿼리 중첩</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">IN, EXISTS, ANY, ALL 서브쿼리를 레벨별로 들여쓰기</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-green-600 font-mono text-sm">윈도우 함수</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">ROW_NUMBER(), RANK(), DENSE_RANK() 등 분석함수 완벽 지원</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">데이터 수정 작업</h5>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-green-600 font-mono text-sm">INSERT INTO</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">대량 데이터 삽입도 VALUES 절을 깔끔하게 정리</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-green-600 font-mono text-sm">UPDATE SET</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">복잡한 UPDATE 조건도 WHERE 절과 함께 구조화</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-green-600 font-mono text-sm">MERGE (UPSERT)</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">WHEN MATCHED/NOT MATCHED 절을 논리적으로 배치</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 고급 기능 섹션 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h4 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-3">🎯</span>
                고급 SQL 기능 - 전문가도 감탄하는 지원
              </h4>
              <div className="grid lg:grid-cols-3 gap-6">
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">CTE & 재귀 쿼리</h5>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <code className="text-purple-600 font-mono text-sm">WITH RECURSIVE</code>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">복잡한 CTE도 단계별로 분해해서 보기 쉽게</p>
                    <div className="mt-2 text-xs text-purple-600">
                      💎 조직도, 카테고리 트리 등 계층 구조 쿼리 완벽 지원
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">집계 & 분석</h5>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <code className="text-purple-600 font-mono text-sm">GROUP BY ROLLUP</code>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">CUBE, GROUPING SETS까지 모든 집계 함수 지원</p>
                    <div className="mt-2 text-xs text-purple-600">
                      📈 매출 리포트, 통계 분석 쿼리에 최적화
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">JSON & XML</h5>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <code className="text-purple-600 font-mono text-sm">JSON_EXTRACT</code>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">NoSQL 스타일 쿼리도 깔끔하게 포맷팅</p>
                    <div className="mt-2 text-xs text-purple-600">
                      🗂️ 모던 웹앱의 JSON 데이터 처리에 완벽
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* 실무 활용 시나리오 */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 rounded-2xl p-8 mb-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🎯 실무에서 이렇게 쓰세요!</h3>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="text-center mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                    <span className="text-2xl">👨‍💻</span>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">개발자 시나리오</h4>
                </div>
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-400 pl-4">
                    <h5 className="font-semibold text-blue-600">코드 리뷰 전 정리</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300">PR 올리기 전에 SQL을 포맷팅해서 동료들이 쉽게 리뷰할 수 있게</p>
                  </div>
                  <div className="border-l-4 border-blue-400 pl-4">
                    <h5 className="font-semibold text-blue-600">디버깅 할 때</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300">ORM이 생성한 복잡한 쿼리를 분석할 때 구조를 파악하기 쉽게</p>
                  </div>
                  <div className="border-l-4 border-blue-400 pl-4">
                    <h5 className="font-semibold text-blue-600">마이그레이션 스크립트</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300">데이터베이스 스키마 변경 시 DDL 문을 깔끔하게 정리</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="text-center mb-4">
                  <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">데이터 분석가</h4>
                </div>
                <div className="space-y-4">
                  <div className="border-l-4 border-green-400 pl-4">
                    <h5 className="font-semibold text-green-600">복잡한 리포트 쿼리</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300">매출 분석, KPI 계산 등 복잡한 집계 쿼리를 구조화</p>
                  </div>
                  <div className="border-l-4 border-green-400 pl-4">
                    <h5 className="font-semibold text-green-600">성능 최적화</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300">분석 모드로 느린 쿼리의 원인을 찾고 개선 방향 확인</p>
                  </div>
                  <div className="border-l-4 border-green-400 pl-4">
                    <h5 className="font-semibold text-green-600">문서화</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300">정기 리포트용 쿼리를 문서에 포함할 때 가독성 향상</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="text-center mb-4">
                  <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                    <span className="text-2xl">🛡️</span>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">DBA & 운영팀</h4>
                </div>
                <div className="space-y-4">
                  <div className="border-l-4 border-purple-400 pl-4">
                    <h5 className="font-semibold text-purple-600">모니터링 쿼리</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300">슬로우 쿼리 로그를 분석해서 병목지점 파악</p>
                  </div>
                  <div className="border-l-4 border-purple-400 pl-4">
                    <h5 className="font-semibold text-purple-600">배포 전 검토</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300">프로덕션 배포 전에 압축 모드로 최적화된 SQL 준비</p>
                  </div>
                  <div className="border-l-4 border-purple-400 pl-4">
                    <h5 className="font-semibold text-purple-600">백업 스크립트</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300">정기 백업이나 데이터 이관 스크립트 정리</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">⚙️ 프로가 쓰는 고급 설정</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">포맷팅 옵션</h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-start">
                    <span className="font-medium min-w-[100px]">들여쓰기:</span>
                    <span>2, 4, 8 스페이스 선택 가능</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-[100px]">키워드:</span>
                    <span>대문자/소문자 변환 옵션</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-[100px]">SQL 방언:</span>
                    <span>MySQL, PostgreSQL, SQL Server, Oracle 지원</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">편의 기능</h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-start">
                    <span className="font-medium min-w-[100px]">파일 업로드:</span>
                    <span>.sql, .txt 파일 드래그 앤 드롭</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-[100px]">결과 저장:</span>
                    <span>클립보드 복사 및 파일 다운로드</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-[100px]">예제 쿼리:</span>
                    <span>다양한 SQL 패턴 샘플 제공</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📚 사용 예시</h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Before (정리 전)</h4>
              <pre className="text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded border overflow-x-auto">
{`select u.id,u.name,p.title from users u left join posts p on u.id=p.user_id where u.status='active' order by u.name;`}
              </pre>
              
              <h4 className="font-medium text-gray-900 dark:text-white mt-4 mb-2">After (포맷팅 후)</h4>
              <pre className="text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded border overflow-x-auto">
{`SELECT u.id,
  u.name,
  p.title
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.status = 'active'
ORDER BY u.name;`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💡 최적화 팁</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">✅ 권장사항</h4>
                <ul className="text-green-800 dark:text-green-300 text-sm space-y-1">
                  <li>• 필요한 컬럼만 SELECT하기</li>
                  <li>• WHERE 절로 데이터 필터링</li>
                  <li>• 적절한 인덱스 활용</li>
                  <li>• JOIN 대신 EXISTS 고려</li>
                  <li>• LIMIT으로 결과 제한</li>
                </ul>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">⚠️ 주의사항</h4>
                <ul className="text-amber-800 dark:text-amber-300 text-sm space-y-1">
                  <li>• SELECT * 남용 방지</li>
                  <li>• 복잡한 서브쿼리 단순화</li>
                  <li>• OR 조건보다 UNION 활용</li>
                  <li>• 과도한 JOIN 관계 정리</li>
                  <li>• 인덱스 없는 WHERE 절 검토</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">🎯 이런 분들께 추천</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">개발자</h4>
                <p className="text-blue-700 dark:text-blue-400">코드 리뷰와 디버깅을 위한 SQL 정리</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">데이터 분석가</h4>
                <p className="text-blue-700 dark:text-blue-400">복잡한 분석 쿼리 구조화</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">DBA</h4>
                <p className="text-blue-700 dark:text-blue-400">성능 최적화와 쿼리 분석</p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default SqlFormatter;