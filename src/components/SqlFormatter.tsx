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
    const createTableMatch = formatted.match(/(CREATE\s+TABLE\s+\w+)\s*\((.*)\)\s*;?/is);
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
    const insertMatch = formatted.match(/(INSERT\s+INTO\s+\w+)\s*(\([^)]+\))?\s*(VALUES)\s*(\(.*\))\s*;?/is);
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
    formatted = formatted.replace(/\nSELECT\s+(.+?)(?=\nFROM|\nWHERE|\n|$)/is, (match, selectPart) => {
      const columns = selectPart.split(',').map(col => col.trim());
      if (columns.length > 1) {
        const formattedColumns = columns.map((col, index) => 
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
      `CREATE TABLE article(    id INT(10) UNSIGNED NOT NULL PRIMARY KEYAUTO_INCREMENT,    regDate DATETIME NOT NULL,    title CHAR(100) NOT NULL,    \`body\` TEXT NOT NULL
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
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-4 overflow-auto' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'}`}>
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Database className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">SQL 포맷터</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          SQL 쿼리를 예쁘게 포맷팅하고 압축하세요. 쿼리 분석도 받아보세요.
        </p>
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
                      {analysis.suggestions.map((suggestion, index) => (
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
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">💡 사용법</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">포맷팅 모드</h3>
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              SQL을 읽기 쉽게 들여쓰기하고 키워드를 정렬합니다. 개발 및 디버깅에 유용합니다.
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">압축 모드</h3>
            <p className="text-green-800 dark:text-green-300 text-sm">
              SQL에서 불필요한 공백과 주석을 제거하여 파일 크기를 최소화합니다.
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">분석 모드</h3>
            <p className="text-purple-800 dark:text-purple-300 text-sm">
              쿼리 구조를 분석을 제공합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SqlFormatter;