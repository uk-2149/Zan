"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
var client_js_1 = require("./generated/prisma/client.js");
var adapter_pg_1 = require("@prisma/adapter-pg");
var pg_1 = require("pg");
var globalForPrisma = globalThis;
var connectionString = "".concat(process.env.DATABASE_URL);
var pool = (_a = globalForPrisma.pool) !== null && _a !== void 0 ? _a : new pg_1.default.Pool({ connectionString: connectionString });
var adapter = new adapter_pg_1.PrismaPg(pool);
exports.prisma = globalForPrisma.prisma || new client_js_1.PrismaClient({
    adapter: adapter,
    log: ["query", "error"],
});
;
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = exports.prisma;
    globalForPrisma.pool = pool;
}
