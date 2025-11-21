// backend/config/mysql.js  (Postgres version)
// Converts entire project DB to Neon/Postgres
// Supports file fallback (filedb.json) same as your original code

const { query: pgQuery } = require("../utils/mysql"); // Postgres wrapper
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "data", "filedb.json");

// ----------------- FILE DB HELPERS -----------------

function readFileDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify({ products: [], users: [], addresses: [] }, null, 2)
      );
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    return { products: [], users: [], addresses: [] };
  }
}

function writeFileDB(obj) {
  fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2));
}

// ----------------- MAIN QUERY HANDLER -----------------

async function query(sql, params) {
  try {
    const rows = await pgQuery(sql, params);
    return rows;
  } catch (e) {
    console.log("Postgres unavailable → using filedb fallback.");
  }

  // FALLBACK → FILE DATABASE
  const db = readFileDB();
  const S = (sql || "").trim().toUpperCase();

  // SELECT product by ID
  if (
    S.startsWith("SELECT") &&
    S.includes("FROM PRODUCTS") &&
    S.includes("WHERE") &&
    S.includes("ID")
  ) {
    const id = params?.[0] || null;
    return db.products.filter((p) => p.id === id);
  }

  // SELECT all with limit/offset/search
  if (S.startsWith("SELECT") && S.includes("FROM PRODUCTS")) {
    let items = [...(db.products || [])];

    if (params && params.length >= 3) {
      const q = params[0];
      if (q && typeof q === "string") {
        const qStr = q.replace(/%/g, "").toLowerCase();
        items = items.filter((p) =>
          (p.title || "").toLowerCase().includes(qStr)
        );
      }

      const limit = Number(params[params.length - 2]) || items.length;
      const offset = Number(params[params.length - 1]) || 0;
      return items.slice(offset, offset + limit);
    }

    return items;
  }

  // INSERT PRODUCT
  if (S.startsWith("INSERT") && S.includes("INTO PRODUCTS")) {
    const v = params || [];
    const prod = {
      id: v[0],
      title: v[1],
      description: v[2],
      price: Number(v[3]) || 0,
      compare_at_price: v[4],
      category: v[5],
      images: (() => {
        try {
          return JSON.parse(v[6] || "[]");
        } catch {
          return [];
        }
      })(),
      sku: v[7],
      stock: Number(v[8]) || 0,
      is_active: v[9] ? 1 : 0,
      attributes: (() => {
        try {
          return JSON.parse(v[10] || "null");
        } catch {
          return null;
        }
      })(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.products.push(prod);
    writeFileDB(db);
    return [prod];
  }

  // UPDATE PRODUCT
  if (S.startsWith("UPDATE") && S.includes("PRODUCTS") && S.includes("WHERE")) {
    const v = params || [];
    const id = v[v.length - 1];
    const prod = db.products.find((p) => p.id === id);
    if (!prod) return [];

    prod.title = v[0] || prod.title;
    prod.description = v[1] || prod.description;
    prod.price = Number(v[2]) || prod.price;
    prod.compare_at_price = v[3] || prod.compare_at_price;
    prod.category = v[4] || prod.category;

    try {
      prod.images = JSON.parse(v[5] || JSON.stringify(prod.images));
    } catch {}

    prod.sku = v[6] || prod.sku;
    prod.stock = Number(v[7]) || prod.stock;
    prod.is_active = v[8] ? 1 : prod.is_active;

    try {
      prod.attributes = JSON.parse(v[9] || JSON.stringify(prod.attributes));
    } catch {}

    prod.updated_at = new Date().toISOString();
    writeFileDB(db);

    return [prod];
  }

  // DELETE PRODUCT
  if (S.startsWith("DELETE") && S.includes("FROM PRODUCTS")) {
    const id = params?.[0];
    db.products = db.products.filter((p) => p.id !== id);
    writeFileDB(db);
    return [];
  }

  return [];
}

// No MySQL transaction - Postgres handle karega
async function withTransaction(work) {
  throw new Error("Transactions require Postgres client. Use pg directly.");
}

module.exports = {
  query,
  withTransaction,
};
