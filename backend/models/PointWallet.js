/**
 * PointWallet.js (Root Compatibility Re-export)
 * Canonical model lives in features/geoversePoint/models/PointWallet.js
 * Prevents OverwriteModelError: Cannot overwrite model once compiled.
 */

module.exports = require("../features/geoversePoint/models/PointWallet");
