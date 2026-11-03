/**
 * HashTable utility class for O(1) average lookup, insertion, and deletion.
 * Supports chaining collision resolution and direct key-value operations.
 */
export class HashTable {
  constructor(size = 53) {
    this.size = size;
    this.buckets = new Array(size);
    this.map = new Map();
  }

  _hash(key) {
    let total = 0;
    const stringKey = String(key);
    const PRIME = 31;
    for (let i = 0; i < Math.min(stringKey.length, 100); i++) {
      const char = stringKey[i];
      const value = char.charCodeAt(0);
      total = (total * PRIME + value) % this.size;
    }
    return total;
  }

  set(key, value) {
    if (key === undefined || key === null) return;
    this.map.set(String(key), value);
    const index = this._hash(key);
    if (!this.buckets[index]) {
      this.buckets[index] = [];
    }
    const bucket = this.buckets[index];
    const existingIndex = bucket.findIndex(([k]) => String(k) === String(key));
    if (existingIndex !== -1) {
      bucket[existingIndex] = [key, value];
    } else {
      bucket.push([key, value]);
    }
  }

  get(key) {
    if (key === undefined || key === null) return undefined;
    if (this.map.has(String(key))) {
      return this.map.get(String(key));
    }
    const index = this._hash(key);
    const bucket = this.buckets[index];
    if (!bucket) return undefined;
    const found = bucket.find(([k]) => String(k) === String(key));
    return found ? found[1] : undefined;
  }

  has(key) {
    if (key === undefined || key === null) return false;
    return this.map.has(String(key));
  }

  delete(key) {
    if (key === undefined || key === null) return false;
    this.map.delete(String(key));
    const index = this._hash(key);
    const bucket = this.buckets[index];
    if (!bucket) return false;
    const i = bucket.findIndex(([k]) => String(k) === String(key));
    if (i !== -1) {
      bucket.splice(i, 1);
      return true;
    }
    return false;
  }

  clear() {
    this.buckets = new Array(this.size);
    this.map.clear();
  }

  values() {
    return Array.from(this.map.values());
  }

  keys() {
    return Array.from(this.map.keys());
  }
}

export default HashTable;
