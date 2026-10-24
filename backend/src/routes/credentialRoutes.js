const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * @route POST /api/credentials/issue
 * @desc Record a newly issued verifiable credential in the database
 */
router.post("/issue", async (req, res) => {
    try {
        const { credentialId, holderWallet, issuerWallet, credentialType, metadataHash } = req.body;
        
        if (!credentialId || !holderWallet || !issuerWallet || !credentialType || !metadataHash) {
            return res.status(400).json({ success: false, error: "Missing required credential parameters" });
        }

        const query = `
            INSERT INTO credentials (credential_id, holder_wallet, issuer_wallet, credential_type, metadata_hash, status)
            VALUES ($1, $2, $3, $4, $5, 'Active') RETURNING *;
        `;
        const values = [credentialId, holderWallet, issuerWallet, credentialType, metadataHash];
        const result = await db.query(query, values);

        res.status(201).json({ success: true, credential: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/credentials/revoke
 * @desc Update credential record status to Revoked following on-chain action
 */
router.post("/revoke", async (req, res) => {
    try {
        const { credentialId, issuerWallet } = req.body;

        const query = `
            UPDATE credentials 
            SET status = 'Revoked', updated_at = CURRENT_TIMESTAMP
            WHERE credential_id = $1 AND issuer_wallet = $2 RETURNING *;
        `;
        const values = [credentialId, issuerWallet];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(403).json({ success: false, error: "Unauthorized revocation or invalid credential ID/issuer" });
        }

        res.status(200).json({ success: true, revokedCredential: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
