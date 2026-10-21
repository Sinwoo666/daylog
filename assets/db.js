/* ============================================================
   日迹 DayLog — 本地存储
   数据只保存在这台设备的浏览器里（IndexedDB），不经过服务器。
   ============================================================ */
'use strict';

const DB_NAME = 'daylog';
const DB_VERSION = 1;
const STORE = 'kv';
const STATE_KEY = 'state';
const LS_KEY = 'daylog-state';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('写入被中断'));
  });
}

/** 读取整份状态；IndexedDB 失败时回退 localStorage */
async function loadState() {
  try {
    const value = await idbGet(STATE_KEY);
    if (value) return value;
  } catch (err) {
    console.warn('IndexedDB 读取失败，尝试 localStorage', err);
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('localStorage 读取失败', err);
  }
  return null;
}

/** 保存整份状态；IndexedDB 失败时回退 localStorage */
async function saveState(state) {
  try {
    await idbSet(STATE_KEY, state);
    return true;
  } catch (err) {
    console.warn('IndexedDB 写入失败，尝试 localStorage', err);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      return true;
    } catch (err2) {
      console.error('本地存储写入失败', err2);
      return false;
    }
  }
}

/** 请求持久存储，降低被系统清理的概率（不能替代备份） */
async function requestPersist() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

async function storageInfo() {
  const info = { usage: 0, quota: 0, persisted: false };
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      info.usage = est.usage || 0;
      info.quota = est.quota || 0;
    }
    if (navigator.storage && navigator.storage.persisted) {
      info.persisted = await navigator.storage.persisted();
    }
  } catch { /* ignore */ }
  return info;
}

function fmtBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
