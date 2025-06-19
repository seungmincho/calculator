'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Check, 
  Copy, 
  Download, 
  Upload, 
  Eye, 
  Edit3,
  Settings,
  RefreshCw,
  Maximize2,
  Minimize2,
  Code,
  Type,
  Table,
  Link,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Image
} from 'lucide-react';

const MarkdownViewer = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [showSettings, setShowSettings] = useState(false);
  const [tableOfContents, setTableOfContents] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 마크다운 파싱 함수 (간단한 구현)
  const parseMarkdown = useCallback((markdown: string): string => {
    if (!markdown.trim()) return '';

    let html = markdown;
    const headings: any[] = [];

    // 이스케이프 처리
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 코드 블록 (먼저 처리)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    });

    // 인라인 코드
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // 헤딩 (목차 생성과 함께)
    html = html.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
      const level = hashes.length;
      const id = text.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      headings.push({ level, text, id });
      return `<h${level} id="${id}">${text}</h${level}>`;
    });

    // 볼드
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 이탤릭
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 취소선
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // 링크
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="markdown-link" target="_blank" rel="noopener noreferrer">$1</a>');

    // 이미지
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="markdown-image" />');

    // 인용문
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="markdown-blockquote">$1</blockquote>');

    // 수평선
    html = html.replace(/^[-*_]{3,}$/gm, '<hr class="markdown-hr" />');

    // 순서 있는 목록
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="markdown-ol-item">$2</li>');
    html = html.replace(/(<li class="markdown-ol-item">.*<\/li>)/s, '<ol class="markdown-ol">$1</ol>');

    // 순서 없는 목록
    html = html.replace(/^[-*+]\s+(.+)$/gm, '<li class="markdown-ul-item">$1</li>');
    html = html.replace(/(<li class="markdown-ul-item">.*<\/li>)/s, '<ul class="markdown-ul">$1</ul>');

    // 테이블
    html = html.replace(/\|(.+)\|\n\|[-:| ]+\|\n((\|.+\|\n?)*)/g, (match, header, separator, rows) => {
      const headerCells = header.split('|').map((cell: string) => cell.trim()).filter(Boolean);
      const rowData = rows.trim().split('\n').map((row: string) => 
        row.split('|').map((cell: string) => cell.trim()).filter(Boolean)
      );

      let tableHtml = '<table class="markdown-table"><thead><tr>';
      headerCells.forEach((cell: string) => {
        tableHtml += `<th class="markdown-th">${cell}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      rowData.forEach((row: string[]) => {
        tableHtml += '<tr>';
        row.forEach((cell: string) => {
          tableHtml += `<td class="markdown-td">${cell}</td>`;
        });
        tableHtml += '</tr>';
      });

      tableHtml += '</tbody></table>';
      return tableHtml;
    });

    // 줄바꿈
    html = html.replace(/\n\n/g, '</p><p class="markdown-p">');
    html = html.replace(/\n/g, '<br />');
    
    // 문단 래핑
    if (html && !html.startsWith('<')) {
      html = '<p class="markdown-p">' + html + '</p>';
    }

    setTableOfContents(headings);
    return html;
  }, []);

  // 실시간 미리보기 업데이트
  useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = parseMarkdown(input);
      setOutput(parsed);
    }, 300);

    return () => clearTimeout(timer);
  }, [input, parseMarkdown]);

  // 클립보드 복사
  const handleCopy = useCallback(async (content: string, type: 'markdown' | 'html') => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  }, []);

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
  const handleDownload = useCallback((content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // 마크다운 삽입 도우미
  const insertMarkdown = useCallback((before: string, after: string = '', placeholder: string = '') => {
    if (!inputRef.current) return;

    const textarea = inputRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = before + (selectedText || placeholder) + after;
    
    const newValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    setInput(newValue);
    
    // 커서 위치 설정
    setTimeout(() => {
      const newStart = start + before.length;
      const newEnd = newStart + (selectedText || placeholder).length;
      textarea.setSelectionRange(newStart, newEnd);
      textarea.focus();
    }, 0);
  }, []);

  // 예제 마크다운
  const insertExample = useCallback(() => {
    const example = `# 마크다운 예제

## 소개
이것은 **마크다운** 문서의 예제입니다. *이탤릭* 텍스트와 ~~취소선~~ 텍스트도 지원합니다.

## 코드 예제
\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('World');
\`\`\`

인라인 코드도 가능합니다: \`const x = 42;\`

## 목록

### 순서 없는 목록
- 첫 번째 항목
- 두 번째 항목
- 세 번째 항목

### 순서 있는 목록
1. 첫 번째 단계
2. 두 번째 단계
3. 세 번째 단계

## 인용문
> 이것은 인용문입니다.
> 여러 줄로 작성할 수 있습니다.

## 테이블
| 이름 | 나이 | 직업 |
|------|------|------|
| 김철수 | 30 | 개발자 |
| 이영희 | 25 | 디자이너 |
| 박민수 | 35 | 기획자 |

## 링크와 이미지
[Google](https://www.google.com)로 이동할 수 있습니다.

---

이상으로 마크다운 예제를 마칩니다.`;
    setInput(example);
  }, []);

  // 목차 클릭 핸들러
  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'}`}>
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <FileText className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">마크다운 뷰어</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          마크다운 텍스트를 실시간으로 미리보고 편집하세요. HTML 변환과 다양한 내보내기를 지원합니다.
        </p>
      </div>

      {/* 컨트롤 패널 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* 뷰 모드 선택 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">보기:</span>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {[
                { key: 'edit', label: '편집', icon: Edit3 },
                { key: 'preview', label: '미리보기', icon: Eye },
                { key: 'split', label: '분할', icon: Type }
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
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isFullscreen ? '창모드' : '전체화면'}</span>
            </button>

            <button
              onClick={insertExample}
              className="flex items-center space-x-1 px-3 py-2 bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg text-sm transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>예제</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.markdown"
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

            {input && (
              <>
                <button
                  onClick={() => handleCopy(input, 'markdown')}
                  className="flex items-center space-x-1 px-3 py-2 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? '복사됨!' : 'MD 복사'}</span>
                </button>

                <button
                  onClick={() => handleCopy(output, 'html')}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm transition-colors"
                >
                  <Code className="w-4 h-4" />
                  <span>HTML 복사</span>
                </button>

                <button
                  onClick={() => handleDownload(input, `document-${Date.now()}.md`, 'text/markdown')}
                  className="flex items-center space-x-1 px-3 py-2 bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800 text-orange-700 dark:text-orange-300 rounded-lg text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>MD 다운로드</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 마크다운 도구 모음 */}
        {(mode === 'edit' || mode === 'split') && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => insertMarkdown('**', '**', '볼드 텍스트')}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm transition-colors"
                title="볼드"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('*', '*', '이탤릭 텍스트')}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm transition-colors"
                title="이탤릭"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('`', '`', '코드')}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm transition-colors"
                title="인라인 코드"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('[', '](URL)', '링크 텍스트')}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm transition-colors"
                title="링크"
              >
                <Link className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('![', '](이미지URL)', 'alt 텍스트')}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm transition-colors"
                title="이미지"
              >
                <Image className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('> ', '', '인용문')}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm transition-colors"
                title="인용문"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('- ', '', '목록 항목')}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm transition-colors"
                title="순서 없는 목록"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('1. ', '', '목록 항목')}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm transition-colors"
                title="순서 있는 목록"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('| 헤더1 | 헤더2 |\n|-------|-------|\n| 셀1 | 셀2 |', '')}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm transition-colors"
                title="테이블"
              >
                <Table className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`grid gap-8 ${mode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* 입력 영역 */}
        {(mode === 'edit' || mode === 'split') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">마크다운 편집</h2>
            </div>
            
            <div className="p-6">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="마크다운 텍스트를 입력하세요..."
                className={`w-full ${isFullscreen ? 'h-[calc(100vh-300px)]' : 'h-96'} p-4 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm`}
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* 미리보기 영역 */}
        {(mode === 'preview' || mode === 'split') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">미리보기</h2>
                {tableOfContents.length > 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {tableOfContents.length}개 제목
                  </div>
                )}
              </div>
            </div>
            
            <div className={`p-6 ${isFullscreen ? 'max-h-[calc(100vh-200px)] overflow-auto' : ''}`}>
              {/* 목차 */}
              {tableOfContents.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">목차</h3>
                  <ul className="space-y-1">
                    {tableOfContents.map((heading, index) => (
                      <li key={index}>
                        <button
                          onClick={() => scrollToHeading(heading.id)}
                          className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
                          style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
                        >
                          {heading.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 마크다운 렌더링 */}
              <div
                ref={outputRef}
                className="markdown-content prose prose-gray dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: output }}
              />
              
              {!output && (
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>마크다운을 입력하면 미리보기가 표시됩니다</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 도움말 섹션 */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">💡 마크다운 문법</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">텍스트 강조</h3>
            <div className="text-purple-800 dark:text-purple-300 text-sm space-y-1">
              <p><code>**볼드**</code> → <strong>볼드</strong></p>
              <p><code>*이탤릭*</code> → <em>이탤릭</em></p>
              <p><code>~~취소선~~</code> → <del>취소선</del></p>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">제목</h3>
            <div className="text-blue-800 dark:text-blue-300 text-sm space-y-1">
              <p><code># 제목 1</code></p>
              <p><code>## 제목 2</code></p>
              <p><code>### 제목 3</code></p>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">링크와 이미지</h3>
            <div className="text-green-800 dark:text-green-300 text-sm space-y-1">
              <p><code>[링크](URL)</code></p>
              <p><code>![이미지](URL)</code></p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS 스타일 */}
      <style jsx>{`
        .markdown-content h1, .markdown-content h2, .markdown-content h3, 
        .markdown-content h4, .markdown-content h5, .markdown-content h6 {
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          font-weight: 600;
          line-height: 1.25;
        }
        
        .markdown-content h1 { font-size: 2rem; }
        .markdown-content h2 { font-size: 1.5rem; }
        .markdown-content h3 { font-size: 1.25rem; }
        
        .markdown-content .markdown-p {
          margin-bottom: 1rem;
          line-height: 1.7;
        }
        
        .markdown-content .inline-code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875rem;
        }
        
        .markdown-content pre {
          background-color: #1f2937;
          color: #f9fafb;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        
        .markdown-content .markdown-blockquote {
          border-left: 4px solid #8b5cf6;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
        }
        
        .markdown-content .markdown-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        
        .markdown-content .markdown-th,
        .markdown-content .markdown-td {
          border: 1px solid #d1d5db;
          padding: 0.5rem;
          text-align: left;
        }
        
        .markdown-content .markdown-th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
        
        .markdown-content .markdown-ul,
        .markdown-content .markdown-ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }
        
        .markdown-content .markdown-ul-item,
        .markdown-content .markdown-ol-item {
          margin-bottom: 0.5rem;
        }
        
        .markdown-content .markdown-link {
          color: #8b5cf6;
          text-decoration: underline;
        }
        
        .markdown-content .markdown-link:hover {
          color: #7c3aed;
        }
        
        .markdown-content .markdown-image {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        
        .markdown-content .markdown-hr {
          border: none;
          height: 1px;
          background-color: #d1d5db;
          margin: 2rem 0;
        }
      `}</style>
    </div>
  );
};

export default MarkdownViewer;