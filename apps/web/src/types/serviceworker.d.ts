// Service Worker event types
declare interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void;
}

declare interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response>): void;
}

declare interface Clients {
  matchAll(options?: any): Promise<Client[]>;
}

declare interface Client {
  id: string;
  type: "window" | "worker" | "sharedworker" | "serviceworker" | "banner";
  url: string;
  focused: boolean;
  frameType: "none" | "top-level" | "nested";
  postMessage(message: any, transfer?: any): void;
}

// Declare global ServiceWorker scope
declare const self: ServiceWorkerGlobalScope & typeof globalThis;
declare const clients: Clients;

declare interface ServiceWorkerGlobalScope {
  caches: CacheStorage;
  clients: Clients;
  submitToAPI?: (type: "evidence" | "incident" | "custody", payload: any) => Promise<void>;
  getOfflineQueue?: () => Promise<OfflineItem[]>;
  addToOfflineQueue?: (item: OfflineItem) => Promise<void>;
}

declare interface OfflineItem {
  id: string;
  type: "evidence" | "incident" | "custody";
  payload: any;
  timestamp: number;
}

// Extend Window interface to include ServiceWorker events
declare global {
  interface Window {
    addEventListener(
      type: "install",
      listener: (this: ServiceWorkerGlobalScope, ev: ExtendableEvent) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
      type: "activate",
      listener: (this: ServiceWorkerGlobalScope, ev: ExtendableEvent) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
      type: "fetch",
      listener: (this: ServiceWorkerGlobalScope, ev: FetchEvent) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
      type: "message",
      listener: (this: ServiceWorkerGlobalScope, ev: ExtendableEvent & MessageEvent<any>) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
  }
}