'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  FileJson, 
  Check, 
  Copy, 
  Download, 
  Upload, 
  AlertCircle, 
  Zap, 
  Eye, 
  Code,
  Minimize2,
  Maximize2,
  RefreshCw,
  Settings,
  TreePine,
  Expand,
  Shrink
} from 'lucide-react';

interface JsonNode {
  key: string;
  value: any;
  type: string;
  path: string;
  level: number;
  isExpanded?: boolean;
}

const JsonFormatter = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'format' | 'minify' | 'tree'>('format');
  const [indentSize, setIndentSize] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [treeNodes, setTreeNodes] = useState<JsonNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // JSON 파싱 및 검증 (메모이제이션)
  const parseJson = useCallback((jsonString: string) => {
    if (!jsonString.trim()) {
      setError('');
      setIsValid(false);
      setOutput('');
      setTreeNodes([]);
      return null;
    }

    try {
      const parsed = JSON.parse(jsonString);
      setError('');
      setIsValid(true);
      return parsed;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid JSON';
      setError(errorMessage);
      setIsValid(false);
      setOutput('');
      setTreeNodes([]);
      return null;
    }
  }, []);

  // JSON 트리 노드 생성
  const createTreeNodes = useCallback((obj: any, parentPath = '', level = 0): JsonNode[] => {
    const nodes: JsonNode[] = [];
    
    if (obj === null || obj === undefined) {
      return nodes;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const path = parentPath ? `${parentPath}.${index}` : `${index}`;
        const node: JsonNode = {
          key: `[${index}]`,
          value: item,
          type: Array.isArray(item) ? 'array' : typeof item === 'object' && item !== null ? 'object' : typeof item,
          path,
          level,
          isExpanded: expandedNodes.has(path)
        };
        nodes.push(node);
        
        if ((Array.isArray(item) || (typeof item === 'object' && item !== null)) && expandedNodes.has(path)) {
          nodes.push(...createTreeNodes(item, path, level + 1));
        }
      });
    } else if (typeof obj === 'object') {
      const keys = sortKeys ? Object.keys(obj).sort() : Object.keys(obj);
      keys.forEach(key => {
        const path = parentPath ? `${parentPath}.${key}` : key;
        const value = obj[key];
        const node: JsonNode = {
          key,
          value,
          type: Array.isArray(value) ? 'array' : typeof value === 'object' && value !== null ? 'object' : typeof value,
          path,
          level,
          isExpanded: expandedNodes.has(path)
        };
        nodes.push(node);
        
        if ((Array.isArray(value) || (typeof value === 'object' && value !== null)) && expandedNodes.has(path)) {
          nodes.push(...createTreeNodes(value, path, level + 1));
        }
      });
    }
    
    return nodes;
  }, [expandedNodes, sortKeys]);

  // 메인 처리 함수
  const processJson = useCallback((jsonString: string) => {
    const parsed = parseJson(jsonString);
    
    if (!parsed) return;

    try {
      let result = '';
      
      switch (mode) {
        case 'format':
          result = JSON.stringify(parsed, null, indentSize);
          break;
        case 'minify':
          result = JSON.stringify(parsed);
          break;
        case 'tree':
          const nodes = createTreeNodes(parsed);
          setTreeNodes(nodes);
          return;
      }
      
      setOutput(result);
      
      // 트리 모드가 아닐 때는 트리 노드 초기화
      if (mode !== 'tree') {
        setTreeNodes([]);
      }
    } catch (err) {
      setError('Processing failed');
    }
  }, [mode, indentSize, parseJson, createTreeNodes]);

  // 입력 변경 처리 (디바운싱)
  useEffect(() => {
    const timer = setTimeout(() => {
      processJson(input);
    }, 300);

    return () => clearTimeout(timer);
  }, [input, processJson]);

  // 클립보드 복사
  const handleCopy = useCallback(async () => {
    const textToCopy = mode === 'tree' ? JSON.stringify(parseJson(input), null, indentSize) : output;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // 폴백: textarea를 이용한 복사
      if (outputRef.current) {
        outputRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [mode, output, input, parseJson, indentSize]);

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
    const content = mode === 'tree' ? JSON.stringify(parseJson(input), null, indentSize) : output;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formatted-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [mode, output, input, parseJson, indentSize]);

  // 트리 노드 토글
  const toggleNode = useCallback((path: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  // 모든 노드 확장/축소
  const toggleAllNodes = useCallback((expand: boolean) => {
    if (expand) {
      const allPaths = new Set<string>();
      const collectPaths = (obj: any, parentPath = '') => {
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            const path = parentPath ? `${parentPath}.${index}` : `${index}`;
            if (typeof item === 'object' && item !== null) {
              allPaths.add(path);
              collectPaths(item, path);
            }
          });
        } else if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(key => {
            const path = parentPath ? `${parentPath}.${key}` : key;
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
              allPaths.add(path);
              collectPaths(value, path);
            }
          });
        }
      };
      
      const parsed = parseJson(input);
      if (parsed) {
        collectPaths(parsed);
        setExpandedNodes(allPaths);
      }
    } else {
      setExpandedNodes(new Set());
    }
  }, [input, parseJson]);

  // 트리 노드 렌더링
  const renderTreeNode = useCallback((node: JsonNode) => {
    const isExpandable = node.type === 'object' || node.type === 'array';
    const isExpanded = expandedNodes.has(node.path);
    
    const getValueColor = (type: string) => {
      switch (type) {
        case 'string': return 'text-green-600 dark:text-green-400';
        case 'number': return 'text-blue-600 dark:text-blue-400';
        case 'boolean': return 'text-purple-600 dark:text-purple-400';
        case 'object': return 'text-gray-600 dark:text-gray-400';
        case 'array': return 'text-gray-600 dark:text-gray-400';
        default: return 'text-red-600 dark:text-red-400';
      }
    };

    const getValueDisplay = (value: any, type: string) => {
      if (type === 'object') return isExpanded ? '{...}' : `{${Object.keys(value).length} keys}`;
      if (type === 'array') return isExpanded ? '[...]' : `[${value.length} items]`;
      if (type === 'string') return `"${value}"`;
      if (value === null) return 'null';
      return String(value);
    };

    return (
      <div
        key={node.path}
        className="flex items-center py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
        style={{ paddingLeft: `${node.level * 20 + 8}px` }}
      >
        {isExpandable ? (
          <button
            onClick={() => toggleNode(node.path)}
            className="mr-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            {isExpanded ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
          </button>
        ) : (
          <div className="w-5 mr-2" />
        )}
        
        <span className="font-medium text-gray-800 dark:text-gray-200 mr-2">
          {node.key}:
        </span>
        
        <span className={getValueColor(node.type)}>
          {getValueDisplay(node.value, node.type)}
        </span>
      </div>
    );
  }, [expandedNodes, toggleNode]);

  // 예제 JSON
  // 줄 번호가 있는 텍스트 에디터 컴포넌트
  const CodeEditor = useCallback(({ value, onChange, placeholder, readOnly = false }: {
    value: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    readOnly?: boolean;
  }) => {
    const lines = value.split('\n');
    const maxLineNumber = lines.length;
    const lineNumberWidth = Math.max(2, maxLineNumber.toString().length);
    const lineNumberRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 스크롤 동기화
    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (lineNumberRef.current && showLineNumbers) {
        lineNumberRef.current.scrollTop = e.currentTarget.scrollTop;
      }
    };

    return (
      <div className="relative font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        <div className={`flex ${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-96'}`}>
          {showLineNumbers && (
            <div 
              ref={lineNumberRef}
              className="bg-gray-100 dark:bg-gray-700 px-3 py-4 text-gray-500 dark:text-gray-400 select-none border-r border-gray-300 dark:border-gray-600 overflow-hidden"
              style={{ minWidth: `${lineNumberWidth * 0.8 + 1}rem` }}
            >
              {lines.map((_, index) => (
                <div key={index} className="text-right leading-6 h-6">
                  {index + 1}
                </div>
              ))}
            </div>
          )}
          <textarea
            ref={readOnly ? outputRef : textareaRef}
            value={value}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            onScroll={handleScroll}
            placeholder={placeholder}
            readOnly={readOnly}
            className="flex-1 p-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none border-0 outline-0 leading-6 overflow-auto"
            spellCheck={false}
          />
        </div>
      </div>
    );
  }, [showLineNumbers]);

  const insertExample = useCallback(() => {
    const example = {
      "name": "John Doe",
      "age": 30,
      "isActive": true,
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "zipCode": "10001"
      },
      "hobbies": ["reading", "swimming", "coding"],
      "projects": [
        {
          "name": "Project A",
          "status": "completed",
          "team": ["Alice", "Bob"]
        },
        {
          "name": "Project B",
          "status": "in-progress",
          "team": ["Charlie", "David", "Eve"]
        }
      ]
    };
    setInput(JSON.stringify(example, null, 2));
  }, []);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-4 overflow-auto' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'}`}>
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <FileJson className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">JSON 포맷터</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          JSON 데이터를 검증하고 예쁘게 포맷팅하거나 압축하세요. 실시간 문법 검사와 트리 뷰를 제공합니다.
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
                { key: 'tree', label: '트리뷰', icon: TreePine }
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
              accept=".json,.txt"
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

            {(output || mode === 'tree') && (
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
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value={2}>2 스페이스</option>
                  <option value={4}>4 스페이스</option>
                  <option value={8}>8 스페이스</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={sortKeys}
                    onChange={(e) => setSortKeys(e.target.checked)}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">키 정렬</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showLineNumbers}
                    onChange={(e) => setShowLineNumbers(e.target.checked)}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">줄 번호</span>
                </label>
              </div>

              {mode === 'tree' && treeNodes.length > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleAllNodes(true)}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-sm hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                  >
                    모두 펼치기
                  </button>
                  <button
                    onClick={() => toggleAllNodes(false)}
                    className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-sm hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                  >
                    모두 접기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 입력 영역 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">JSON 입력</h2>
              {error ? (
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">문법 오류</span>
                </div>
              ) : isValid ? (
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">유효한 JSON</span>
                </div>
              ) : null}
            </div>
          </div>
          
          <div className="p-6">
            <CodeEditor
              value={input}
              onChange={setInput}
              placeholder="JSON 데이터를 입력하세요..."
            />
            
            {error && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-200">JSON 문법 오류</h4>
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
              {mode === 'format' ? '포맷팅 결과' : mode === 'minify' ? '압축 결과' : '트리 뷰'}
            </h2>
          </div>
          
          <div className="p-6">
            {mode === 'tree' ? (
              <div className="h-96 overflow-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                {treeNodes.length > 0 ? (
                  <div className="space-y-1">
                    {treeNodes.map(renderTreeNode)}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <TreePine className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>유효한 JSON을 입력하면 트리 구조가 표시됩니다</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <CodeEditor
                value={output}
                readOnly
                placeholder="포맷팅된 JSON이 여기에 표시됩니다..."
              />
            )}
          </div>
        </div>
      </div>

      {/* 도움말 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">💡 사용법</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">포맷팅 모드</h3>
            <p className="text-green-800 dark:text-green-300 text-sm">
              JSON을 읽기 쉽게 들여쓰기하고 정렬합니다. 개발 및 디버깅에 유용합니다.
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">압축 모드</h3>
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              JSON에서 불필요한 공백을 제거하여 파일 크기를 최소화합니다.
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">트리 뷰</h3>
            <p className="text-purple-800 dark:text-purple-300 text-sm">
              JSON 구조를 트리 형태로 시각화하여 복잡한 데이터를 쉽게 탐색할 수 있습니다.
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">실시간 검증</h3>
            <p className="text-amber-800 dark:text-amber-300 text-sm">
              입력과 동시에 JSON 문법을 검사하고 오류 위치를 표시합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JsonFormatter;