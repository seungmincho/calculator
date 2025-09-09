// Service Worker for ToolHub PWA
const CACHE_NAME = 'toolhub-v1.0.0'
const STATIC_CACHE_NAME = 'toolhub-static-v1.0.0'
const DYNAMIC_CACHE_NAME = 'toolhub-dynamic-v1.0.0'

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  // Core calculator pages
  '/lotto-generator',
  '/loan-calculator',
  '/real-estate-calculator',
  '/savings-calculator',
  '/retirement-calculator',
  // Popular utility pages
  '/json-formatter',
  '/uuid-generator',
  '/qr-generator',
  // Offline page
  '/offline'
]

// Files to cache dynamically
const DYNAMIC_FILES = [
  // Other calculator pages will be cached when visited
  '/tax-calculator',
  '/stock-calculator',
  '/exchange-calculator',
  '/bmi-calculator',
  '/calorie-calculator',
  // Development tools
  '/jwt-decoder',
  '/regex-extractor',
  '/sql-formatter'
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('Service Worker: Caching static files')
        return cache.addAll(STATIC_FILES.map(url => {
          // Handle potential cache failures gracefully
          return fetch(url).then(response => {
            if (response.ok) {
              return cache.put(url, response)
            }
          }).catch(error => {
            console.warn(`Failed to cache ${url}:`, error)
          })
        }))
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  )
})

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        // Update cache in background for dynamic content
        if (isDynamicContent(event.request.url)) {
          updateCache(event.request)
        }
        return cachedResponse
      }

      // Network first for new requests
      return fetch(event.request).then((response) => {
        // Don't cache if response is not valid
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        // Clone the response before caching
        const responseClone = response.clone()
        
        // Cache the response
        cacheResponse(event.request, responseClone)

        return response
      }).catch((error) => {
        console.log('Service Worker: Network failed, serving offline page')
        
        // Serve offline page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/offline') || new Response(
            generateOfflinePage(),
            { 
              headers: { 'Content-Type': 'text/html' },
              status: 200
            }
          )
        }
        
        // Return empty response for other requests
        return new Response('', { status: 408 })
      })
    })
  )
})

// Helper function to determine if content is dynamic
function isDynamicContent(url) {
  const dynamicPatterns = [
    '/api/',
    '/lotto-generator', // For lottery data updates
    '/tips/',
    '/exchange-calculator' // For currency rates
  ]
  
  return dynamicPatterns.some(pattern => url.includes(pattern))
}

// Helper function to cache responses
function cacheResponse(request, response) {
  const cacheName = isDynamicContent(request.url) ? DYNAMIC_CACHE_NAME : STATIC_CACHE_NAME
  
  caches.open(cacheName).then((cache) => {
    cache.put(request, response)
  }).catch((error) => {
    console.warn('Failed to cache response:', error)
  })
}

// Helper function to update cache in background
function updateCache(request) {
  fetch(request).then((response) => {
    if (response && response.status === 200) {
      const responseClone = response.clone()
      cacheResponse(request, responseClone)
    }
  }).catch((error) => {
    console.log('Background cache update failed:', error)
  })
}

// Generate offline page HTML
function generateOfflinePage() {
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>오프라인 - 툴허브</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .container {
          text-align: center;
          background: rgba(255,255,255,0.1);
          padding: 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          max-width: 500px;
        }
        h1 { font-size: 2.5em; margin-bottom: 20px; }
        p { font-size: 1.2em; margin-bottom: 30px; opacity: 0.9; }
        .features {
          text-align: left;
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
        }
        .feature {
          display: flex;
          align-items: center;
          margin: 10px 0;
          font-size: 1.1em;
        }
        .feature::before {
          content: "✓";
          margin-right: 10px;
          color: #4ade80;
          font-weight: bold;
        }
        .retry-btn {
          background: #2563eb;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 1.1em;
          cursor: pointer;
          transition: background 0.3s;
        }
        .retry-btn:hover {
          background: #1d4ed8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📱 오프라인 모드</h1>
        <p>인터넷 연결이 없어도 툴허브의 핵심 기능을 사용할 수 있습니다!</p>
        
        <div class="features">
          <div class="feature">연봉 실수령액 계산</div>
          <div class="feature">로또번호 생성 (기본 기능)</div>
          <div class="feature">대출 상환금 계산</div>
          <div class="feature">각종 세금 계산</div>
          <div class="feature">JSON 포맷터</div>
          <div class="feature">UUID 생성기</div>
          <div class="feature">QR코드 생성</div>
        </div>
        
        <button class="retry-btn" onclick="location.reload()">
          🔄 다시 시도
        </button>
        
        <p style="font-size: 0.9em; margin-top: 20px; opacity: 0.7;">
          네트워크가 복구되면 자동으로 최신 데이터로 업데이트됩니다.
        </p>
      </div>
    </body>
    </html>
  `
}

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Update dynamic content when connection is restored
      updateDynamicContent()
    )
  }
})

function updateDynamicContent() {
  const dynamicUrls = [
    '/lotto-generator', // Update lottery data
    '/exchange-calculator' // Update exchange rates if needed
  ]
  
  return Promise.all(
    dynamicUrls.map(url => 
      fetch(url).then(response => {
        if (response.ok) {
          return caches.open(DYNAMIC_CACHE_NAME).then(cache => 
            cache.put(url, response)
          )
        }
      }).catch(error => {
        console.log('Background sync failed for', url, error)
      })
    )
  )
}

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    
    const options = {
      body: data.body || '새로운 기능이나 업데이트가 있습니다.',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-96x96.png',
      tag: 'toolhub-notification',
      renotify: true,
      requireInteraction: false,
      actions: [
        {
          action: 'open',
          title: '열기'
        },
        {
          action: 'close',
          title: '닫기'
        }
      ]
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title || '툴허브', options)
    )
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})