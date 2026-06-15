"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJakartaDate = getJakartaDate;
/**
 * Returns a Date object where the year, month, date, hours, minutes, seconds,
 * and milliseconds represent the local time in Jakarta (WIB / UTC+7).
 */
function getJakartaDate() {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
}
