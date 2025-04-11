const CACHE_NAME = 'notes-app-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png'
];

// Установка Service Worker и кэширование статических ресурсов
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Кэширование ресурсов');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Активация Service Worker и удаление старых кэшей
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Удаление старого кэша:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Перехват запросов и обслуживание из кэша
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Если ресурс найден в кэше, возвращаем его
                if (response) {
                    return response;
                }
                
                // Клонируем запрос
                const fetchRequest = event.request.clone();
                
                // Делаем сетевой запрос
                return fetch(fetchRequest)
                    .then(response => {
                        // Проверяем, что ответ корректный
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Клонируем ответ
                        const responseToCache = response.clone();
                        
                        // Добавляем ответ в кэш
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Если сеть недоступна, пытаемся вернуть страницу офлайн
                        if (event.request.url.indexOf('.html') > -1) {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Синхронизация данных при восстановлении соединения
self.addEventListener('sync', event => {
    if (event.tag === 'sync-notes') {
        // В реальном приложении здесь можно синхронизировать данные с сервером
        console.log('Синхронизация данных...');
    }
});