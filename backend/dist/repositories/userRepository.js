"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepo = exports.UserRepository = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class UserRepository {
    async findAll() {
        return index_js_1.db.select().from(schema_js_1.user);
    }
    async findById(id) {
        const results = await index_js_1.db.select().from(schema_js_1.user).where((0, drizzle_orm_1.eq)(schema_js_1.user.id, id)).limit(1);
        return results[0] || null;
    }
    async findByEmail(email) {
        const results = await index_js_1.db.select().from(schema_js_1.user).where((0, drizzle_orm_1.eq)(schema_js_1.user.email, email)).limit(1);
        return results[0] || null;
    }
    async update(id, name, email, role) {
        await index_js_1.db.update(schema_js_1.user)
            .set({ name, email, role, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.user.id, id));
    }
    async delete(id) {
        // Delete sessions, credentials, and user row
        await index_js_1.db.delete(schema_js_1.session).where((0, drizzle_orm_1.eq)(schema_js_1.session.userId, id));
        await index_js_1.db.delete(schema_js_1.account).where((0, drizzle_orm_1.eq)(schema_js_1.account.userId, id));
        await index_js_1.db.delete(schema_js_1.user).where((0, drizzle_orm_1.eq)(schema_js_1.user.id, id));
    }
}
exports.UserRepository = UserRepository;
exports.userRepo = new UserRepository();
