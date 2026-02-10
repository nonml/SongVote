const CACHE_NAME = "evidence-layer-v1";
const STATIC_FILES = ["/", "/index.html", "/styles.css", "/main.tsx", "/App.tsx"];

// Install event - cache static files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_FILES);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Message handling for offline queue
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SYNC_QUEUE") {
    event.waitUntil(syncOfflineQueue());
  }
});

// Queue for offline submissions
const OFFLINE_QUEUE_KEY = "offline_queue_v1";

interface OfflineItem {
  id: string;
  type: "evidence" | "incident" | "custody";
  payload: any;
  timestamp: number;
}

async function syncOfflineQueue() {
  const queue = await getOfflineQueue();
  const successful: string[] = [];
  const failed: string[] = [];

  for (const item of queue) {
    try {
      await submitToAPI(item.type, item.payload);
      successful.push(item.id);
    } catch (e) {
      failed.push(item.id);
    }
  }

  // Remove successful items from queue
  if (successful.length > 0) {
    const remaining = queue.filter((item) => !successful.includes(item.id));
    await caches.open("evidence-layer-v1").then((cache) => cache.put("queue", new Response(JSON.stringify(remaining))));
  }

  // Send success/failure back to main thread
  if (clients.matchAll().length > 0) {
    clients.matchAll().then((all) => {
      all.forEach((client) => {
        client.postMessage({ type: "SYNC_COMPLETE", successful, failed });
      });
    });
  }
}

async function getOfflineQueue(): Promise<OfflineItem[]> {
  const cache = await caches.open("evidence-layer-v1");
  const response = await cache.match("queue");
  if (response) {
    const data = await response.json();
    return data || [];
  }
  return [];
}

async function addToOfflineQueue(item: OfflineItem) {
  const queue = await getOfflineQueue();
  queue.push(item);
  const cache = await caches.open("evidence-layer-v1");
  await cache.put("queue", new Response(JSON.stringify(queue)));
}

async function submitToAPI(type: "evidence" | "incident" | "custody", payload: any): Promise<void> {
  const url = type === "evidence" ? "/api/v1/evidence/upload" : type === "incident" ? "/api/v1/incident/report" : "/api/v1/custody/event";
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
}

// Expose queue functions to window for main thread use
self.submitToAPI = submitToAPI;
self.getOfflineQueue = getOfflineQueue;
self.addToOfflineQueue = addToOfflineQueue;