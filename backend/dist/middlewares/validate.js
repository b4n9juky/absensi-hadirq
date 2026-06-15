"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
function validate(schema, target = 'body') {
    return (req, res, next) => {
        try {
            schema.parse(req[target]);
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                const messages = err.issues.map((issue) => issue.message).join(', ');
                return res.status(400).json({ success: false, error: messages });
            }
            return res.status(400).json({ success: false, error: 'Validasi gagal.' });
        }
    };
}
