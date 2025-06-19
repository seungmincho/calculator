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
    html = html.replace(/(<li class="markdown-ol-item">[\s\S]*?<\/li>)/g, '<ol class="markdown-ol">$1</ol>');

    // 순서 없는 목록
    html = html.replace(/^[-*+]\s+(.+)$/gm, '<li class="markdown-ul-item">$1</li>');
    html = html.replace(/(<li class="markdown-ul-item">[\s\S]*?<\/li>)/g, '<ul class="markdown-ul">$1</ul>');

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
    const example = '# 마크다운 예제\n\n## 소개\n이것은 **마크다운** 문서의 예제입니다. *이탤릭* 텍스트와 ~~취소선~~ 텍스트도 지원합니다.\n\n## 코드 예제\n```javascript\nfunction greet(name) {\n  console.log("Hello, " + name + "!");\n}\n\ngreet(\'World\');\n```\n\n인라인 코드도 가능합니다: `const x = 42;`\n\n## 목록\n\n### 순서 없는 목록\n- 첫 번째 항목\n- 두 번째 항목\n- 세 번째 항목\n\n### 순서 있는 목록\n1. 첫 번째 단계\n2. 두 번째 단계\n3. 세 번째 단계\n\n## 인용문\n> 이것은 인용문입니다.\n> 여러 줄로 작성할 수 있습니다.\n\n## 테이블\n| 이름 | 나이 | 직업 |\n|------|------|------|\n| 김철수 | 30 | 개발자 |\n| 이영희 | 25 | 디자이너 |\n| 박민수 | 35 | 기획자 |\n\n## 링크와 이미지\n[Google](https://www.google.com)로 이동할 수 있습니다.\n\n---\n\n이상으로 마크다운 예제를 마칩니다.';
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
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'}>
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
        <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">🚀 마크다운 뷰어 마스터 가이드</h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12 max-w-4xl mx-auto break-keep whitespace-pre-line">
          기술 블로거부터 문서 관리자까지! 마크다운의 모든 것을 마스터하는 완전한 가이드입니다. 
          GitHub README부터 기술 문서까지, 프로처럼 작성하고 관리하세요!
        </p>
        
        {/* 핵심 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full mr-3">
                <Edit3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">⚡ 실시간 라이브 편집</h3>
            </div>
            <p className="text-blue-800 dark:text-blue-300 mb-4 leading-relaxed">
              타이핑하는 즉시 HTML로 변환되는 마법 같은 경험! VS Code처럼 부드러운 편집 환경을 제공합니다.
            </p>
            <div className="space-y-3">
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🎯 즉시 변환</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">300ms 디바운싱으로 타이핑 중에도 부드러운 반응</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">🖱️ 똑똑한 도구바</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">버튼 클릭으로 볼드, 이탤릭, 링크 등 마크다운 자동 삽입</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">📱 반응형 디자인</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">모바일부터 데스크톱까지 어디서든 완벽한 편집 경험</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-green-600 p-3 rounded-full mr-3">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-900 dark:text-green-200">🔍 다중 뷰 시스템</h3>
            </div>
            <p className="text-green-800 dark:text-green-300 mb-4 leading-relaxed">
              작업 스타일에 맞는 완벽한 뷰! 노션처럼 다양한 편집 모드로 생산성을 극대화하세요.
            </p>
            <div className="space-y-3">
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">✏️ 편집 전용 모드</h4>
                <p className="text-sm text-green-700 dark:text-green-300">집중력 향상을 위한 순수 마크다운 작성 환경</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">👁️ 미리보기 모드</h4>
                <p className="text-sm text-green-700 dark:text-green-300">완성된 문서의 모습을 크고 선명하게 확인</p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">↔️ 분할 화면</h4>
                <p className="text-sm text-green-700 dark:text-green-300">좌우 분할로 편집과 미리보기를 동시에</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center mb-4">
              <div className="bg-purple-600 p-3 rounded-full mr-3">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-200">📚 풀스택 마크다운</h3>
            </div>
            <p className="text-purple-800 dark:text-purple-300 mb-4 leading-relaxed">
              GitHub, GitLab, Notion까지! 모든 플랫폼에서 완벽하게 동작하는 표준 호환 마크다운을 지원합니다.
            </p>
            <div className="space-y-3">
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">🏗️ 구조적 문서</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">목차 자동 생성과 계층적 헤딩 시스템</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">🎨 리치 컨텐츠</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">표, 링크, 이미지, 코드 블록까지 모든 요소 지원</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">🚀 고급 기능</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">문법 강조, 체크리스트, 인용문까지 완벽 구현</p>
              </div>
            </div>
          </div>
        </div>

        {/* 실습으로 배우는 섹션 */}
        <div className="bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-800 dark:to-purple-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">🎓 실습으로 배우는 마크다운 마스터클래스</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">실제 GitHub README나 기술 블로그에서 볼 수 있는 전문적인 마크다운 패턴들을 익혀보세요!</p>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center">
                <span className="bg-red-100 dark:bg-red-900 p-2 rounded-full mr-2">😓</span>
                이런 마크다운 본 적 있나요?
              </h4>
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded-r-lg">
                <pre className="text-sm text-red-800 dark:text-red-300 overflow-x-auto whitespace-pre-wrap">
{`# project title
this is my project
## install
npm install
## usage
node app.js
## api
GET /users
POST /users
PUT /users/:id
DELETE /users/:id
## contributing
pull requests welcome
## license
MIT`}
                </pre>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-2">✨</span>
                프로처럼 바뀝니다!
              </h4>
              <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4 rounded-r-lg">
                <pre className="text-sm text-green-800 dark:text-green-300 overflow-x-auto whitespace-pre-wrap">
{`# 🚀 Awesome Project

[![npm version](https://badge.fury.io/js/awesome-project.svg)](https://badge.fury.io/js/awesome-project)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 혁신적인 웹 애플리케이션을 위한 모던 프레임워크

## 📦 설치 방법

\`\`\`bash
# npm 사용
npm install awesome-project

# yarn 사용  
yarn add awesome-project
\`\`\`

## 🎯 빠른 시작

\`\`\`javascript
const awesome = require('awesome-project');

awesome.start({
  port: 3000,
  env: 'development'
});
\`\`\`

## 📚 API 레퍼런스

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/users\` | 모든 사용자 조회 |
| POST | \`/api/users\` | 새 사용자 생성 |
| PUT | \`/api/users/:id\` | 사용자 정보 수정 |
| DELETE | \`/api/users/:id\` | 사용자 삭제 |

## 🤝 기여하기

1. 이 저장소를 포크하세요
2. 피처 브랜치를 생성하세요 (\`git checkout -b feature/AmazingFeature\`)
3. 변경사항을 커밋하세요 (\`git commit -m 'Add some AmazingFeature'\`)
4. 브랜치에 푸시하세요 (\`git push origin feature/AmazingFeature\`)
5. Pull Request를 열어주세요

## 📄 라이센스

이 프로젝트는 [MIT 라이센스](LICENSE) 하에 배포됩니다.`}
                </pre>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <h5 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">🔍 무엇이 달라졌나요?</h5>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-purple-800 dark:text-purple-300">
              <ul className="space-y-1">
                <li>✅ 이모지로 섹션별 시각적 구분</li>
                <li>✅ 배지(Badge)로 프로젝트 상태 표시</li>
                <li>✅ 코드 블록에 언어 지정으로 문법 강조</li>
                <li>✅ 표(Table)로 API 문서 정리</li>
              </ul>
              <ul className="space-y-1">
                <li>✅ 인용문(Blockquote)으로 프로젝트 설명</li>
                <li>✅ 단계별 기여 가이드라인</li>
                <li>✅ 링크로 외부 리소스 연결</li>
                <li>✅ 전체적인 가독성과 전문성 10배 향상!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 마크다운 활용 분야별 완벽 가이드 */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">💼 분야별 마크다운 활용 완전정복</h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">개발부터 비즈니스까지! 모든 영역에서 마크다운을 활용하는 전문적인 방법들</p>
          
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">👨‍💻</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">개발자 전용 가이드</h4>
              </div>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📋 README.md 작성법</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">프로젝트 소개, 설치 방법, 사용법을 한눈에 보이게</p>
                  <div className="mt-2 text-xs text-blue-500">
                    💡 배지, 스크린샷, API 문서, 기여 가이드 포함 필수
                  </div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">📖 기술 문서화</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">코드 주석, 아키텍처 설명, 개발 가이드 작성</p>
                  <div className="mt-2 text-xs text-blue-500">
                    💡 목차, 코드 블록, 다이어그램 적극 활용
                  </div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h5 className="font-semibold text-blue-600">🐛 이슈 템플릿</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">GitHub 이슈나 PR 템플릿을 마크다운으로</p>
                  <div className="mt-2 text-xs text-blue-500">
                    💡 체크리스트, 라벨, 링크 템플릿 활용
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">✍️</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">콘텐츠 크리에이터</h4>
              </div>
              <div className="space-y-4">
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">📝 기술 블로그 포스팅</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">velog, 티스토리, Medium 등 플랫폼용 글 작성</p>
                  <div className="mt-2 text-xs text-green-500">
                    💡 헤딩 구조, 코드 예제, 이미지 캡션 최적화
                  </div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">📚 학습 노트 정리</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">강의 내용, 책 요약, 개념 정리를 구조적으로</p>
                  <div className="mt-2 text-xs text-green-500">
                    💡 목차, 인용문, 하이라이트 활용한 정리법
                  </div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <h5 className="font-semibold text-green-600">📖 튜토리얼 제작</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">단계별 가이드와 실습 예제를 명확하게</p>
                  <div className="mt-2 text-xs text-green-500">
                    💡 순서 있는 목록, 스크린샷, 주의사항 표시
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-center mb-4">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl">💼</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">비즈니스 & 기획</h4>
              </div>
              <div className="space-y-4">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">📋 프로젝트 계획서</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">기획 의도, 일정, 리소스 계획을 명확하게</p>
                  <div className="mt-2 text-xs text-purple-500">
                    💡 표, 체크리스트, 간트차트 형태로 정리
                  </div>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">📊 회의록 작성</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">논의 사항, 결정 사항, 액션 아이템 정리</p>
                  <div className="mt-2 text-xs text-purple-500">
                    💡 참석자, 아젠다, 할일 목록 구조화
                  </div>
                </div>
                <div className="border-l-4 border-purple-400 pl-4">
                  <h5 className="font-semibold text-purple-600">📋 요구사항 명세</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300">기능 정의, 사용자 스토리, 수용 기준 문서화</p>
                  <div className="mt-2 text-xs text-purple-500">
                    💡 상세 표, 우선순위, 담당자 명시
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 상세 문법 지원표 */}
        <div className="space-y-8">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">📚 지원하는 마크다운 문법 완전정복</h3>
            
            {/* 기본 문법 섹션 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <h4 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full mr-3">✍️</span>
                기본 텍스트 스타일링 - 글자 하나하나가 살아나는 마법
              </h4>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">텍스트 강조 및 서식</h5>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Bold className="w-4 h-4 text-blue-600 mr-2" />
                        <code className="text-blue-600 font-mono text-sm">**볼드 텍스트**</code>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">결과: <strong>볼드 텍스트</strong></p>
                      <div className="text-xs text-gray-500">
                        ✨ 중요한 키워드나 핵심 내용을 강조할 때 사용
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Italic className="w-4 h-4 text-blue-600 mr-2" />
                        <code className="text-blue-600 font-mono text-sm">*이탤릭 텍스트*</code>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">결과: <em>이탤릭 텍스트</em></p>
                      <div className="text-xs text-gray-500">
                        💫 부가 설명이나 강조하고 싶은 단어에 사용
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-blue-600 font-mono text-sm">~~취소선 텍스트~~</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">결과: <del>취소선 텍스트</del></p>
                      <div className="text-xs text-gray-500">
                        🚫 더 이상 유효하지 않은 정보나 수정된 내용 표시
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-blue-600 font-mono text-sm">`인라인 코드`</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">결과: <code>인라인 코드</code></p>
                      <div className="text-xs text-gray-500">
                        🔧 함수명, 변수명, 짧은 코드 조각에 사용
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">제목과 구조</h5>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-blue-600 font-mono text-sm"># 제목 1 (H1)</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">가장 큰 제목, 문서의 메인 타이틀</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-blue-600 font-mono text-sm">## 제목 2 (H2)</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">주요 섹션 제목</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-blue-600 font-mono text-sm">### 제목 3 (H3)</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">하위 섹션 제목</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-blue-600 font-mono text-sm">#### 제목 4-6</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">세부 항목 제목</p>
                      <div className="text-xs text-purple-600 mt-1">
                        💡 목차가 자동으로 생성되어 문서 내비게이션 가능
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 목록과 체크리스트 섹션 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <h4 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3">📋</span>
                목록과 체크리스트 - 정보를 체계적으로 정리하는 핵심 도구
              </h4>
              <div className="grid lg:grid-cols-3 gap-6">
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">순서 없는 목록</h5>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <pre className="text-sm text-green-600 font-mono mb-2">
{`- 첫 번째 항목
- 두 번째 항목
  - 중첩된 항목
  - 또 다른 중첩 항목
- 세 번째 항목`}
                    </pre>
                    <div className="text-xs text-gray-500">
                      💡 -, *, + 기호 모두 사용 가능, 들여쓰기로 중첩 구조 생성
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">순서 있는 목록</h5>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <pre className="text-sm text-green-600 font-mono mb-2">
{`1. 첫 번째 단계
2. 두 번째 단계
   1. 세부 단계 1
   2. 세부 단계 2
3. 세 번째 단계`}
                    </pre>
                    <div className="text-xs text-gray-500">
                      🔢 숫자는 자동으로 정렬되므로 모두 1로 써도 됨
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">할일 체크리스트</h5>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <pre className="text-sm text-green-600 font-mono mb-2">
{`- [ ] 미완료 작업
- [x] 완료된 작업
- [ ] 진행 중인 작업
  - [x] 하위 완료 작업
  - [ ] 하위 미완료 작업`}
                    </pre>
                    <div className="text-xs text-gray-500">
                      ✅ GitHub에서 실제 체크박스로 렌더링됨
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 링크와 미디어 섹션 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <h4 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-4 flex items-center">
                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full mr-3">🔗</span>
                링크와 미디어 - 세상과 연결하는 마크다운의 힘
              </h4>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">다양한 링크 스타일</h5>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-purple-600 font-mono text-sm">[링크 텍스트](https://example.com)</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">기본 인라인 링크</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-purple-600 font-mono text-sm">[링크 텍스트](https://example.com "툴팁 텍스트")</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">툴팁이 있는 링크</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <pre className="text-purple-600 font-mono text-sm">
{`[참조 링크][1]
[또 다른 참조][reference]

[1]: https://example.com
[reference]: https://github.com`}
                      </pre>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">참조 스타일 링크 (긴 문서에 유용)</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-purple-600 font-mono text-sm">&lt;https://autolink.com&gt;</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">자동 링크</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">이미지와 미디어</h5>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-purple-600 font-mono text-sm">![대체텍스트](image.jpg)</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">기본 이미지 삽입</p>
                      <div className="text-xs text-purple-600 mt-1">
                        🖼️ 자동으로 반응형 크기 조정
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <code className="text-purple-600 font-mono text-sm">![스크린샷](image.jpg "설명 캡션")</code>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">캡션이 있는 이미지</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <pre className="text-purple-600 font-mono text-sm">
{`[![이미지 링크](thumb.jpg)](full-image.jpg)`}
                      </pre>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">클릭 가능한 이미지 링크</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <pre className="text-purple-600 font-mono text-sm">
{`![배지][badge-url]

[badge-url]: https://img.shields.io/badge/status-active-green`}
                      </pre>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">GitHub 배지 스타일</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 코드와 표 섹션 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <h4 className="text-xl font-semibold text-orange-600 dark:text-orange-400 mb-4 flex items-center">
                <span className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full mr-3">💻</span>
                코드와 표 - 개발자를 위한 전문 도구들
              </h4>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">코드 블록의 모든 것</h5>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <h6 className="font-medium text-gray-900 dark:text-white mb-2">기본 코드 블록</h6>
                      <pre className="text-sm text-orange-600 font-mono mb-2">
{`\`\`\`
일반 코드 블록
여러 줄 지원
\`\`\``}
                      </pre>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <h6 className="font-medium text-gray-900 dark:text-white mb-2">언어별 문법 강조</h6>
                      <pre className="text-sm text-orange-600 font-mono mb-2">
{`\`\`\`javascript
function greetUser(name) {
  console.log("Hello, " + name + "!");
  return true;
}
\`\`\``}
                      </pre>
                      <div className="text-xs text-orange-500">
                        🎨 100+ 언어 지원: javascript, python, java, css, html, bash, sql 등
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <h6 className="font-medium text-gray-900 dark:text-white mb-2">인라인 코드</h6>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        일반 텍스트에서 <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">`변수명`</code>이나 
                        <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">`함수()`</code> 같은 코드 조각 강조
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">표(Table) 마스터</h5>
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <h6 className="font-medium text-gray-900 dark:text-white mb-2">기본 표 구조</h6>
                      <pre className="text-sm text-orange-600 font-mono mb-2">
{`| 헤더1 | 헤더2 | 헤더3 |
|-------|-------|-------|
| 데이터1| 데이터2| 데이터3|
| 더많은 | 데이터 | 여기에 |`}
                      </pre>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <h6 className="font-medium text-gray-900 dark:text-white mb-2">정렬 옵션</h6>
                      <pre className="text-sm text-orange-600 font-mono mb-2">
{`| 왼쪽정렬 | 가운데정렬 | 오른쪽정렬 |
|:---------|:---------:|---------:|
| Left     | Center    | Right    |
| 왼쪽     | 가운데    | 오른쪽   |`}
                      </pre>
                      <div className="text-xs text-orange-500">
                        📐 콜론(:) 위치로 정렬 방향 지정
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <h6 className="font-medium text-gray-900 dark:text-white mb-2">고급 표 활용</h6>
                      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <p>• API 문서의 파라미터 정리</p>
                        <p>• 비교표 및 대조표 작성</p>
                        <p>• 일정표 및 계획표</p>
                        <p>• 데이터 요약 및 분석 결과</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 고급 기능 섹션 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h4 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center">
                <span className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full mr-3">🎯</span>
                고급 마크다운 기능 - 프로 수준의 문서 작성
              </h4>
              <div className="grid lg:grid-cols-3 gap-6">
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">인용문과 강조</h5>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <pre className="text-sm text-indigo-600 font-mono mb-2">

                    </pre>
                    <div className="text-xs text-indigo-500">
                      💬 명언, 중요한 주의사항, 참고 내용 강조에 활용
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">구분선과 스페이싱</h5>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <pre className="text-sm text-indigo-600 font-mono mb-2">

                    </pre>
                    <div className="text-xs text-indigo-500">
                      ➖ ---, ***, ___ 모두 사용 가능한 수평선
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">특수 문자와 이스케이프</h5>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <pre className="text-sm text-indigo-600 font-mono mb-2">

                    </pre>
                    <div className="text-xs text-indigo-500">
                      🛡️ 백슬래시(\\)로 마크다운 문법 문자 그대로 표시
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 실무 활용 팁과 베스트 프랙티스 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">💡 실무 활용 팁과 베스트 프랙티스</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
                <span className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-2">✅</span>
                프로처럼 쓰는 마크다운 꿀팁
              </h4>
              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-green-600 mb-2">🎯 목차 활용 전략</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">H1~H6 헤딩을 계층적으로 구성하면 자동 목차 생성</p>
                  <div className="text-xs text-green-500">
                    💡 긴 문서일수록 목차는 필수! 독자의 탐색을 도와줍니다
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-green-600 mb-2">🖼️ 이미지 최적화</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">alt 텍스트로 접근성 향상, 상대 경로로 이식성 확보</p>
                  <div className="text-xs text-green-500">
                    💡 이미지는 적절한 크기로 압축하여 로딩 속도 개선
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-green-600 mb-2">📝 일관성 있는 스타일</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">같은 프로젝트 내에서는 동일한 마크다운 패턴 유지</p>
                  <div className="text-xs text-green-500">
                    💡 팀 내 마크다운 스타일 가이드 문서 작성 추천
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-green-600 mb-2">🔗 스마트 링크 관리</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">긴 URL은 참조 스타일로, 중요한 링크는 굵게 표시</p>
                  <div className="text-xs text-green-500">
                    💡 외부 링크에는 target="_blank" 자동 적용됨
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-4 flex items-center">
                <span className="bg-amber-100 dark:bg-amber-900 p-2 rounded-full mr-2">⚠️</span>
                피해야 할 실수와 주의사항
              </h4>
              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-amber-600 mb-2">🚫 과도한 중첩 구조</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">목록이나 인용문을 너무 깊게 중첩하면 가독성 저하</p>
                  <div className="text-xs text-amber-500">
                    ⚡ 3단계 이상의 중첩은 피하고 섹션을 나누는 것이 좋음
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-amber-600 mb-2">📊 표 남용 금지</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">복잡한 데이터는 표보다 목록이나 섹션으로 분리</p>
                  <div className="text-xs text-amber-500">
                    ⚡ 모바일에서 표는 가로 스크롤이 생길 수 있음
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-amber-600 mb-2">🔤 헤딩 순서 주의</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">H1 다음에 바로 H3를 쓰면 구조가 깨짐</p>
                  <div className="text-xs text-amber-500">
                    ⚡ H1 → H2 → H3 순서로 계층적 구조 유지 필수
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h5 className="font-semibold text-amber-600 mb-2">💾 빈 줄 누락</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">다른 요소 간에는 빈 줄을 넣어야 정상 렌더링</p>
                  <div className="text-xs text-amber-500">
                    ⚡ 특히 목록과 문단, 코드 블록 사이에는 빈 줄 필수
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3 text-center">🎯 이런 분들께 완벽 추천</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                <span className="text-2xl">👨‍💻</span>
              </div>
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">개발자</h4>
              <p className="text-blue-700 dark:text-blue-400">README 작성, 문서화, 기술 블로그, 코드 리뷰</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                <span className="text-2xl">✍️</span>
              </div>
              <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-2">기술 작가</h4>
              <p className="text-purple-700 dark:text-purple-400">튜토리얼, 가이드, 매뉴얼, API 문서</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-3">
                <span className="text-2xl">💼</span>
              </div>
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">프로젝트 매니저</h4>
              <p className="text-green-700 dark:text-green-400">계획서, 회의록, 체크리스트, 요구사항 문서</p>
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