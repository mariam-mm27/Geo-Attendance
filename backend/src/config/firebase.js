import admin from "firebase-admin";
import fs from "fs";

let db, auth, adminInstance;

const createMockFirestore = () => {
  const collections = {};
  
  // Mock Query class that supports chaining
  class MockQuery {
    constructor(collectionName, filters = []) {
      this.collectionName = collectionName;
      this.filters = filters;
    }
    
    where(field, op, value) {
      const newFilters = [...this.filters, { field, op, value }];
      return new MockQuery(this.collectionName, newFilters);
    }
    
    orderBy(field) {
      return new MockQuery(this.collectionName, this.filters);
    }
    
    limit(n) {
      return new MockQuery(this.collectionName, this.filters);
    }
    
    async get() {
      let docs = (collections[this.collectionName] || []).slice();
      
      for (const filter of this.filters) {
        const { field, op, value } = filter;
        if (op === '==') {
          docs = docs.filter(d => {
            const fieldValue = d.data[field];
            if (fieldValue instanceof Date && value && value.toDate) {
              return fieldValue.getTime() === value.toDate().getTime();
            }
            return fieldValue === value;
          });
        } else if (op === 'array-contains') {
          docs = docs.filter(d => Array.isArray(d.data[field]) && d.data[field].includes(value));
        } else if (op === '>=') {
          docs = docs.filter(d => {
            const fieldValue = d.data[field];
            if (fieldValue instanceof Date && value instanceof Date) {
              return fieldValue >= value;
            }
            return fieldValue >= value;
          });
        } else if (op === '<=') {
          docs = docs.filter(d => d.data[field] <= value);
        } else if (op === '>') {
          docs = docs.filter(d => d.data[field] > value);
        } else if (op === '<') {
          docs = docs.filter(d => d.data[field] < value);
        }
      }
      
      return { 
        empty: docs.length === 0, 
        docs: docs.map(d => ({
          id: d.id,
          data: () => d.data,
          exists: true
        })),
        size: docs.length
      };
    }
  }
  
  const collection = (name) => {
    if (!collections[name]) collections[name] = [];
    
    return {
      doc: (id) => ({
        id: id,
        get: async () => {
          const item = collections[name].find(d => d.id === id);
          return { 
            exists: !!item, 
            data: () => item ? item.data : {},
            id: id || 'mock-id'
          };
        },
        set: async (data, options) => {
          const existingIndex = collections[name].findIndex(d => d.id === id);
          const newData = typeof data === 'function' ? {} : { ...data };
          if (existingIndex >= 0) {
            collections[name][existingIndex].data = { ...collections[name][existingIndex].data, ...newData };
          } else {
            collections[name].push({ id, data: newData });
          }
          return { id };
        },
        update: async (data) => {
          const existingIndex = collections[name].findIndex(d => d.id === id);
          if (existingIndex >= 0) {
            const updateData = { ...data };
            delete updateData.serverTimestamp;
            collections[name][existingIndex].data = { ...collections[name][existingIndex].data, ...updateData };
          }
          return { id };
        },
        delete: async () => {
          collections[name] = collections[name].filter(d => d.id !== id);
        }
      }),
      where: (field, op, value) => new MockQuery(name, [{ field, op, value }]),
      add: async (data) => {
        const id = 'mock-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        collections[name].push({ id, data: { ...data } });
        return { id, ...data };
      },
      get: async () => {
        const all = collections[name] || [];
        return { 
          empty: all.length === 0, 
          docs: all.map(d => ({
            id: d.id,
            data: () => d.data,
            exists: true
          })),
          size: all.length
        };
      }
    };
  };
  
  return { collection };
};

try {
  const serviceAccount = JSON.parse(
    fs.readFileSync("serviceAccount.json", "utf8")
  );
  
  // initialize firebase
  adminInstance = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
  db = admin.firestore();
  auth = admin.auth();
  
  console.log("Firebase initialized successfully");
} catch (error) {
  console.warn("Firebase initialization failed:", error.message);
  console.warn("Running in mock mode - some features may be limited");
  
  db = createMockFirestore();
  auth = null;
  adminInstance = admin;
}

export { db, auth, admin, adminInstance };