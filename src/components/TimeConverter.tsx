'use client'

import React, { useState, useEffect } from 'react';
import { Clock, Globe, Copy, Check, Calendar, Timer, ArrowRightLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

const TimeConverter = () => {
  const t = useTranslations('timeConverter');
  const tc = useTranslations('common');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const [sourceTimezone, setSourceTimezone] = useState('Asia/Seoul');
  const [targetTimezone, setTargetTimezone] = useState('UTC');
  const [unixTimestamp, setUnixTimestamp] = useState('');
  const [isCopied, setIsCopied] = useState('');
  const [activeTab, setActiveTab] = useState<'converter' | 'unix' | 'relative'>('converter');
  const [pasteInput, setPasteInput] = useState('');
  const [clipboardSupported, setClipboardSupported] = useState(false);

  // 주요 타임존 목록
  const timezones = [
    { value: 'Asia/Seoul', label: t('timezones.korea'), offset: '+09:00' },
    { value: 'UTC', label: t('timezones.utc'), offset: '+00:00' },
    { value: 'America/New_York', label: t('timezones.newYork'), offset: '-05:00/-04:00' },
    { value: 'America/Los_Angeles', label: t('timezones.losAngeles'), offset: '-08:00/-07:00' },
    { value: 'Europe/London', label: t('timezones.london'), offset: '+00:00/+01:00' },
    { value: 'Europe/Paris', label: t('timezones.paris'), offset: '+01:00/+02:00' },
    { value: 'Asia/Tokyo', label: t('timezones.tokyo'), offset: '+09:00' },
    { value: 'Asia/Shanghai', label: t('timezones.shanghai'), offset: '+08:00' },
    { value: 'Asia/Singapore', label: t('timezones.singapore'), offset: '+08:00' },
    { value: 'Australia/Sydney', label: t('timezones.sydney'), offset: '+11:00/+10:00' },
    { value: 'America/Chicago', label: t('timezones.chicago'), offset: '-06:00/-05:00' },
    { value: 'America/Denver', label: t('timezones.denver'), offset: '-07:00/-06:00' },
  ];

  // 실시간 시계 업데이트 및 클립보드 지원 확인
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // 클립보드 API 지원 확인
    setClipboardSupported(!!(navigator.clipboard && window.isSecureContext));

    return () => clearInterval(timer);
  }, []);

  // 타임존 변환 함수
  const convertTime = (date: Date, fromTz: string, toTz: string) => {
    // 원본 시간을 UTC로 변환한 후 대상 타임존으로 변환
    const utcTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: toTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(utcTime);
  };

  // Unix 타임스탬프 변환
  const convertUnixTimestamp = (timestamp: string) => {
    const ts = parseInt(timestamp);
    if (isNaN(ts)) return null;
    
    const date = new Date(ts * 1000);
    return {
      kst: new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date),
      utc: new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date)
    };
  };

  // 상대 시간 계산
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    const diffInMinutes = Math.round(diffInMs / (1000 * 60));
    const diffInHours = Math.round(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

    if (Math.abs(diffInMinutes) < 60) {
      return diffInMinutes === 0 ? '지금' : 
             diffInMinutes > 0 ? `${diffInMinutes}분 후` : `${Math.abs(diffInMinutes)}분 전`;
    } else if (Math.abs(diffInHours) < 24) {
      return diffInHours > 0 ? `${diffInHours}시간 후` : `${Math.abs(diffInHours)}시간 전`;
    } else {
      return diffInDays > 0 ? `${diffInDays}일 후` : `${Math.abs(diffInDays)}일 전`;
    }
  };

  // 클립보드 복사 (폴백 포함)
  const copyToClipboard = async (text: string, type: string) => {
    try {
      // 모던 브라우저 Clipboard API 시도
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setIsCopied(type);
        setTimeout(() => setIsCopied(''), 2000);
        return;
      }
      
      // 폴백: 전통적인 방법
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setIsCopied(type);
        setTimeout(() => setIsCopied(''), 2000);
      } else {
        throw new Error('복사 실패');
      }
    } catch (err) {
      console.error('복사 실패:', err);
      // 사용자에게 수동 복사 안내
      alert(`복사에 실패했습니다. 다음 텍스트를 수동으로 복사하세요:\n${text}`);
    }
  };

  // 클립보드 붙여넣기 및 자동 파싱
  const handlePaste = async () => {
    try {
      // 모던 브라우저 Clipboard API 시도
      if (navigator.clipboard && window.isSecureContext) {
        const text = await navigator.clipboard.readText();
        setPasteInput(text);
        parseTimeFromText(text);
        return;
      }
      
      // 폴백: 사용자에게 직접 입력 요청
      const text = prompt('클립보드에서 시간 정보를 붙여넣어 주세요:');
      if (text) {
        setPasteInput(text);
        parseTimeFromText(text);
      }
    } catch (err) {
      console.error('붙여넣기 실패:', err);
      // 폴백: 사용자에게 직접 입력 요청
      const text = prompt('클립보드 접근에 실패했습니다. 시간 정보를 직접 입력해 주세요:');
      if (text) {
        setPasteInput(text);
        parseTimeFromText(text);
      }
    }
  };

  // 텍스트에서 시간 정보 자동 파싱
  const parseTimeFromText = (text: string) => {
    // ISO 8601 형식 감지 (2024-01-01T12:00:00Z, 2024-01-01T12:00:00+09:00)
    const isoRegex = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)/;
    const isoMatch = text.match(isoRegex);
    
    if (isoMatch) {
      const parsedDate = new Date(isoMatch[1]);
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDateTime(parsedDate);
        // 타임존 감지
        if (isoMatch[1].includes('Z')) {
          setSourceTimezone('UTC');
        } else if (isoMatch[1].includes('+09:00')) {
          setSourceTimezone('Asia/Seoul');
        }
        return;
      }
    }

    // Unix 타임스탬프 감지 (10자리 또는 13자리)
    const unixRegex = /\b(\d{10}|\d{13})\b/;
    const unixMatch = text.match(unixRegex);
    
    if (unixMatch) {
      const timestamp = unixMatch[1];
      const tsNumber = parseInt(timestamp);
      // 13자리면 밀리초, 10자리면 초
      const date = new Date(timestamp.length === 13 ? tsNumber : tsNumber * 1000);
      if (!isNaN(date.getTime())) {
        setSelectedDateTime(date);
        setUnixTimestamp(timestamp.length === 13 ? Math.floor(tsNumber / 1000).toString() : timestamp);
        setActiveTab('unix');
        return;
      }
    }

    // 일반적인 날짜 형식 감지 (YYYY-MM-DD HH:mm:ss)
    const dateRegex = /(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+(\d{1,2}:\d{2}(?::\d{2})?)/;
    const dateMatch = text.match(dateRegex);
    
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/\//g, '-');
      const timeStr = dateMatch[2];
      const fullDateTime = `${dateStr}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}`;
      const parsedDate = new Date(fullDateTime);
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDateTime(parsedDate);
        return;
      }
    }

    // 미국식 날짜 형식 감지 (MM/DD/YYYY)
    const usDateRegex = /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i;
    const usDateMatch = text.match(usDateRegex);
    
    if (usDateMatch) {
      const parsedDate = new Date(usDateMatch[0]);
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDateTime(parsedDate);
        return;
      }
    }

    // 상대 시간 키워드 감지
    const relativeRegex = /(now|지금|today|오늘|yesterday|어제|tomorrow|내일)/i;
    if (relativeRegex.test(text)) {
      const now = new Date();
      if (/yesterday|어제/i.test(text)) {
        now.setDate(now.getDate() - 1);
      } else if (/tomorrow|내일/i.test(text)) {
        now.setDate(now.getDate() + 1);
      }
      setSelectedDateTime(now);
      setActiveTab('relative');
      return;
    }

    // 타임존 키워드 감지 및 설정
    const timezoneKeywords = {
      'KST|한국|Korea': 'Asia/Seoul',
      'UTC|GMT': 'UTC',
      'EST|EDT|Eastern': 'America/New_York',
      'PST|PDT|Pacific': 'America/Los_Angeles',
      'JST|일본|Japan': 'Asia/Tokyo',
      'CST|China|중국': 'Asia/Shanghai',
      'GMT|London|런던': 'Europe/London',
      'CET|Paris|파리': 'Europe/Paris'
    };

    for (const [keywords, timezone] of Object.entries(timezoneKeywords)) {
      const regex = new RegExp(keywords, 'i');
      if (regex.test(text)) {
        setSourceTimezone(timezone);
        break;
      }
    }
  };

  // 현재 시간을 다양한 타임존으로 표시
  const getCurrentTimeInTimezones = () => {
    return timezones.slice(0, 6).map(tz => ({
      ...tz,
      time: new Intl.DateTimeFormat('ko-KR', {
        timeZone: tz.value,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(currentTime),
      date: new Intl.DateTimeFormat('ko-KR', {
        timeZone: tz.value,
        month: 'short',
        day: 'numeric'
      }).format(currentTime)
    }));
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('description')}
            </p>
          </div>
        </div>

        {/* 실시간 세계시계 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('realTimeWorldClock')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getCurrentTimeInTimezones().map((tz) => (
              <div key={tz.value} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{tz.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{tz.offset}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400">
                      {tz.time}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{tz.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('converter')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'converter'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {t('timezoneConversion')}
          </button>
          <button
            onClick={() => setActiveTab('unix')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'unix'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {t('unixTimestamp')}
          </button>
          <button
            onClick={() => setActiveTab('relative')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'relative'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {t('relativeTime')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 메인 컨버터 */}
          <div className="space-y-6">
            {/* 스마트 붙여넣기 도구 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                🔮 {t('smartPaste')}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                {clipboardSupported 
                  ? t('smartPasteDescriptionSupported')
                  : t('smartPasteDescriptionFallback')
                }
                {!clipboardSupported && (
                  <span className="block mt-1 text-xs text-orange-600 dark:text-orange-400">
                    💡 {t('httpsClipboardTip')}
                  </span>
                )}
              </p>
              
              <div className="flex gap-2 mb-3">
                <button
                  onClick={handlePaste}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
                  title={clipboardSupported ? t('pasteFromClipboard') : t('manualInputMode')}
                >
                  <span>{clipboardSupported ? "📋" : "⌨️"}</span>
                  {clipboardSupported ? t('pasteFromClipboard') : t('manualInput')}
                </button>
                <button
                  onClick={() => setPasteInput('')}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  {tc('clear')}
                </button>
              </div>

              <div className="mb-3">
                <textarea
                  value={pasteInput}
                  onChange={(e) => {
                    setPasteInput(e.target.value);
                    if (e.target.value.trim()) {
                      parseTimeFromText(e.target.value);
                    }
                  }}
                  placeholder={t('pasteTimeInfoPlaceholder')}
                  className="w-full h-20 px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm resize-none"
                />
              </div>

              <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                <div><strong>{t('supportedFormats')}</strong></div>
                <div>• {t('iso8601Format')}</div>
                <div>• {t('unixTimestampFormat')}</div>
                <div>• {t('generalDateFormat')}</div>
                <div>• {t('usDateFormat')}</div>
                <div>• {t('relativeTimeFormat')}</div>
              </div>
            </div>
            {activeTab === 'converter' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  {t('timezoneConversion')}
                </h3>
                
                {/* 날짜/시간 입력 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('convertDateTime')}
                  </label>
                  <input
                    type="datetime-local"
                    value={selectedDateTime.toISOString().slice(0, 16)}
                    onChange={(e) => setSelectedDateTime(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* 원본 타임존 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('sourceTimezone')}
                  </label>
                  <select
                    value={sourceTimezone}
                    onChange={(e) => setSourceTimezone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {timezones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label} ({tz.offset})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 대상 타임존 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('targetTimezone')}
                  </label>
                  <select
                    value={targetTimezone}
                    onChange={(e) => setTargetTimezone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {timezones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label} ({tz.offset})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 변환 결과 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('convertedTime')}
                    </span>
                    <button
                      onClick={() => copyToClipboard(convertTime(selectedDateTime, sourceTimezone, targetTimezone), 'converted')}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {isCopied === 'converted' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400">
                    {convertTime(selectedDateTime, sourceTimezone, targetTimezone)}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'unix' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  {t('unixTimestamp')} {t('timezoneConversion')}
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('unixTimestampSeconds')}
                  </label>
                  <input
                    type="text"
                    value={unixTimestamp}
                    onChange={(e) => setUnixTimestamp(e.target.value)}
                    placeholder="1640995200"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="mb-4">
                  <button
                    onClick={() => setUnixTimestamp(Math.floor(Date.now() / 1000).toString())}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    {t('setCurrentTime')}
                  </button>
                </div>

                {unixTimestamp && convertUnixTimestamp(unixTimestamp) && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('koreanTime')}
                        </span>
                        <button
                          onClick={() => copyToClipboard(convertUnixTimestamp(unixTimestamp)?.kst || '', 'kst')}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {isCopied === 'kst' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {convertUnixTimestamp(unixTimestamp)?.kst}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('utcTime')}
                        </span>
                        <button
                          onClick={() => copyToClipboard(convertUnixTimestamp(unixTimestamp)?.utc || '', 'utc')}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {isCopied === 'utc' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {convertUnixTimestamp(unixTimestamp)?.utc}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'relative' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('relativeTime')} {tc('calculate')}
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('compareDateTime')}
                  </label>
                  <input
                    type="datetime-local"
                    value={selectedDateTime.toISOString().slice(0, 16)}
                    onChange={(e) => setSelectedDateTime(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('timeDifference')}
                    </span>
                    <button
                      onClick={() => copyToClipboard(getRelativeTime(selectedDateTime), 'relative')}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {isCopied === 'relative' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {getRelativeTime(selectedDateTime)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 유용한 정보 및 도구 */}
          <div className="space-y-6">
            {/* 개발자 도구 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🛠️ {t('developerTools')}
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  {/* 현재 Unix 타임스탬프 */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('currentUnixSeconds')}</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs">
                        {Math.floor(Date.now() / 1000)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(Math.floor(Date.now() / 1000).toString(), 'currentUnix')}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {isCopied === 'currentUnix' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  {/* 현재 Unix 타임스탬프 (밀리초) */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('currentUnixMilliseconds')}</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs">
                        {Date.now()}
                      </code>
                      <button
                        onClick={() => copyToClipboard(Date.now().toString(), 'currentUnixMs')}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {isCopied === 'currentUnixMs' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* ISO 8601 (UTC) */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('iso8601UTC')}</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs">
                        {new Date().toISOString()}
                      </code>
                      <button
                        onClick={() => copyToClipboard(new Date().toISOString(), 'isoUtc')}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {isCopied === 'isoUtc' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* ISO 8601 (KST) */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('iso8601KST')}</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs">
                        {new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')}
                      </code>
                      <button
                        onClick={() => copyToClipboard(new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00'), 'isoKst')}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {isCopied === 'isoKst' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* RFC 2822 */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('rfc2822')}</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs">
                        {new Date().toUTCString()}
                      </code>
                      <button
                        onClick={() => copyToClipboard(new Date().toUTCString(), 'rfc2822')}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {isCopied === 'rfc2822' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 계산된 타임스탬프들 */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('commonTimestamps')}</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                      <span className="text-gray-700 dark:text-gray-300">{t('oneHourLater')}</span>
                      <div className="flex items-center gap-1">
                        <code className="font-mono text-blue-600 dark:text-blue-400">
                          {Math.floor((Date.now() + 60 * 60 * 1000) / 1000)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(Math.floor((Date.now() + 60 * 60 * 1000) / 1000).toString(), 'oneHourLater')}
                          className="p-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {isCopied === 'oneHourLater' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                      <span className="text-gray-700 dark:text-gray-300">{t('oneDayLater')}</span>
                      <div className="flex items-center gap-1">
                        <code className="font-mono text-blue-600 dark:text-blue-400">
                          {Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000).toString(), 'oneDayLater')}
                          className="p-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {isCopied === 'oneDayLater' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                      <span className="text-gray-700 dark:text-gray-300">{t('oneWeekLater')}</span>
                      <div className="flex items-center gap-1">
                        <code className="font-mono text-blue-600 dark:text-blue-400">
                          {Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000).toString(), 'oneWeekLater')}
                          className="p-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {isCopied === 'oneWeekLater' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 티케팅 도구 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🎫 {t('ticketingTools')}
              </h3>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">{t('concertTicketing')}</h4>
                  <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                    {t('concertTicketingDesc')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                      <div className="font-medium">{t('interpark')}</div>
                      <div className="text-gray-600 dark:text-gray-400">{t('weekdaysOpen')}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                      <div className="font-medium">{t('yes24')}</div>
                      <div className="text-gray-600 dark:text-gray-400">{t('weekdaysOpen')}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">{t('overseasEvents')}</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                    {t('overseasEventsDesc')}
                  </p>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                      <div className="font-medium">{t('appleEvent')}</div>
                      <div className="text-gray-600 dark:text-gray-400">{t('appleEventTime')}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                      <div className="font-medium">{t('steamGameRelease')}</div>
                      <div className="text-gray-600 dark:text-gray-400">{t('steamReleaseTime')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 유용한 팁 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                💡 {t('timeConversionTips')}
              </h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>{t('daylightSavingTip')}</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>{t('unixTimestampTip')}</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>{t('ticketingPrep')}</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>{t('internationalMeeting')}</div>
                </div>
              </div>
            </div>

            {/* 자주 사용하는 시간대 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🌍 {t('commonTimeConversions')}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('koreaToUSEast')}</div>
                    <div className="text-gray-600 dark:text-gray-400">{t('timeDifferenceNote')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-600 dark:text-blue-400 font-mono">
                      {new Intl.DateTimeFormat('ko-KR', {
                        timeZone: 'America/New_York',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      }).format(currentTime)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('koreaToUK')}</div>
                    <div className="text-gray-600 dark:text-gray-400">{t('timeDifferenceUK')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-600 dark:text-blue-400 font-mono">
                      {new Intl.DateTimeFormat('ko-KR', {
                        timeZone: 'Europe/London',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      }).format(currentTime)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{t('koreaToAustralia')}</div>
                    <div className="text-gray-600 dark:text-gray-400">{t('timeDifferenceAustralia')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-600 dark:text-blue-400 font-mono">
                      {new Intl.DateTimeFormat('ko-KR', {
                        timeZone: 'Australia/Sydney',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      }).format(currentTime)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeConverter;