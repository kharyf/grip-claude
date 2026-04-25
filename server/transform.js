#!/usr/bin/env node
// transform.js — Local-only script for migrating DynamoDB data to Oracle ATP.
// NOT deployed to the server; run this once on your machine during migration.
//
// Usage:
//   node transform.js dynamodb_export.json > inserts.sql
//
// Then paste inserts.sql into Oracle Database Actions (the ATP web SQL console)
// or run it with SQL*Plus from the wallet directory.
//
// Generate the input file with:
//   aws dynamodb scan --table-name GripahTestUsersTable --output json > test_export.json
//   aws dynamodb scan --table-name GripahLiveUsersTable --output json > live_export.json

'use strict';

const fs = require('fs');

const inputFile = process.argv[2];
if (!inputFile) {
    console.error('Usage: node transform.js <dynamodb-export.json>');
    process.exit(1);
}

const raw = fs.readFileSync(inputFile, 'utf8');
const data = JSON.parse(raw);

if (!data.Items || !Array.isArray(data.Items)) {
    console.error('Input file does not contain a top-level "Items" array (expected aws dynamodb scan --output json format)');
    process.exit(1);
}

// Escape single quotes for SQL string literals
const esc = (s) => (s ?? '').replace(/'/g, "''");

// Format an ISO8601 string for Oracle TO_TIMESTAMP_TZ.
// Apple expiry dates come as "2025-01-15T10:30:00.000Z" (FF3 = 3-digit ms).
// Drop milliseconds if present to use a simpler format that handles both cases.
const toOracleTs = (iso) => {
    if (!iso) return 'NULL';
    // Strip milliseconds: "2025-01-15T10:30:00.000Z" → "2025-01-15T10:30:00Z"
    const normalized = iso.replace(/\.\d+Z$/, 'Z');
    return `TO_TIMESTAMP_TZ('${esc(normalized)}', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
};

let count = 0;
const lines = [];

for (const item of data.Items) {
    const username = esc(item.cognitoUsername?.S ?? '');
    const email    = esc(item.email?.S ?? '');
    const premium  = item.premiumUser?.BOOL ? 1 : 0;
    const status   = esc(item.subscriptionStatus?.S ?? '');
    const until    = toOracleTs(item.premiumUntil?.S);
    const apple    = esc(item.appleOriginalTransactionId?.S ?? '');
    const google   = esc(item.googlePurchaseToken?.S ?? '');

    lines.push(
        `INSERT INTO gripah_users ` +
        `(cognito_username, email, premium_user, subscription_status, premium_until, apple_original_tx_id, google_purchase_token) ` +
        `VALUES ('${username}', '${email}', ${premium}, '${status}', ${until}, '${apple}', '${google}');`
    );
    count++;
}

// Wrap in a transaction
console.log('-- Oracle ATP migration: gripah_users');
console.log(`-- Generated from: ${inputFile}`);
console.log(`-- Row count: ${count}`);
console.log('');
console.log(lines.join('\n'));
console.log('');
console.log('COMMIT;');

process.stderr.write(`Transformed ${count} rows.\n`);
