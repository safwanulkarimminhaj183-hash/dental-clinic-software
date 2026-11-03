export class HashTable {
  constructor(size = 53) {
    this.buckets = new Array(size).fill(null).map(() => []);
    this.count = 0;
  }

  _hash(key) {
    const str = String(key);
    let h = 5381;

    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    }

    return h % this.buckets.length;
  }

  set(key, value) {
    const strKey = String(key);
    const bucket = this.buckets[this._hash(strKey)];

    const found = bucket.find(([k]) => k === strKey);

    if (found) {
      found[1] = value;
      return this;
    }

    bucket.push([strKey, value]);
    this.count++;

    if (this.count / this.buckets.length > 0.75) {
      this._resize();
    }

    return this;
  }

  get(key) {
    const strKey = String(key);
    const bucket = this.buckets[this._hash(strKey)];
    const found = bucket.find(([k]) => k === strKey);

    return found ? found[1] : undefined;
  }

  has(key) {
    const strKey = String(key);
    const bucket = this.buckets[this._hash(strKey)];

    return bucket.some(([k]) => k === strKey);
  }

  delete(key) {
    const strKey = String(key);
    const bucket = this.buckets[this._hash(strKey)];

    const index = bucket.findIndex(([k]) => k === strKey);

    if (index === -1) {
      return false;
    }

    bucket.splice(index, 1);
    this.count--;

    return true;
  }

  _resize() {
    const oldBuckets = this.buckets;

    this.buckets = new Array(oldBuckets.length * 2 + 1)
      .fill(null)
      .map(() => []);

    this.count = 0;

    for (const bucket of oldBuckets) {
      for (const [key, value] of bucket) {
        this.set(key, value);
      }
    }
  }

  clear() {
    this.buckets.forEach((bucket) => {
      bucket.length = 0;
    });

    this.count = 0;
  }

  get size() {
    return this.count;
  }
}

export default HashTable;