// CORS 우회를 위한 프록시 유틸리티 (필요시 사용)

export const fetchWithCorsProxy = async (url: string, options?: RequestInit) => {
  // 브라우저에서 CORS 문제가 발생할 경우 대체 방법들
  const proxyUrls = [
    // 직접 호출 시도
    url,
    // 공개 CORS 프록시 서비스 (프로덕션에서는 자체 서버 권장)
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  for (const proxyUrl of proxyUrls) {
    try {
      const response = await fetch(proxyUrl, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (response.ok) {
        return response;
      }
    } catch (error) {
      console.warn(`Failed to fetch via ${proxyUrl}:`, error);
      // 다음 프록시로 계속 시도
    }
  }

  throw new Error('All proxy attempts failed');
};