// vote.js
const admin = require('firebase-admin');
const { webcrypto: crypto } = require('crypto'); // Use webcrypto for crypto.subtle
const fs = require('fs').promises; // Use promises for better async handling
const Web3 = require('web3');
const contract = require('@truffle/contract');
const DataStorageArtifact = require('./build/contracts/DataStorage.json');

// **LOAD Firebase Admin SDK credentials from a file**
const serviceAccountPath = './voter-card-scanner-firebase-adminsdk-fbsvc-04a48e53de.json';
const contractAddress = '0xb78C53D1163443b20979bCe1559DC4C8d65F9D85'; // Replace with your deployed contract address
const ganacheUrl = 'http://127.0.0.1:7545'; // Your Ganache URL

let privateKey; // Variable to store the imported private key

async function initializeFirebase() {
    try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://voter-card-scanner-default-rtdb.asia-southeast1.firebasedatabase.app/"
        });
        console.log('[DEBUG] Firebase Admin SDK initialized successfully.');
    } catch (error) {
        console.error('[DEBUG] Error initializing Firebase Admin SDK:', error);
        throw error;
    }
}

// Function to load the PKCS#8 private key from a .b64 file using crypto.subtle
async function loadPrivateKey() {
    try {
        const b64 = await fs.readFile('private_key_pkcs8.b64', 'utf8');
        const der = Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0));
        privateKey = await crypto.subtle.importKey(
            'pkcs8',
            der.buffer,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true, // This should be true for a private key
            ['decrypt']
        );
        console.log('[DEBUG] PKCS#8 Private key loaded and imported using crypto.subtle.');
    } catch (error) {
        console.error('[DEBUG] Error loading or importing private key:', error);
        throw error;
    }
}

// Function to decrypt data using RSA-OAEP with the loaded private key (using crypto.subtle)
async function decryptRSAOAEP(encryptedData) {
    try {
        if (!privateKey) {
            throw new Error('[DEBUG] Private key not loaded.');
        }
        const buffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            privateKey,
            buffer
        );
        const decrypted = new TextDecoder().decode(decryptedBuffer);
        console.log(`[DEBUG] Decrypted hash: ${decrypted}`);
        return decrypted;
    } catch (error) {
        console.error('[DEBUG] Decryption error:', error);
        throw error;
    }
}

async function getCandidateDetails() {
    try {
        const firestore = admin.firestore();
        const candidatesSnapshot = await firestore.collection('candidates').get();
        const candidates = {};
        candidatesSnapshot.forEach(doc => {
            candidates[doc.id] = doc.data();
        });
        console.log('[DEBUG] Fetched candidate details:', candidates);
        return candidates;
    } catch (error) {
        console.error('[DEBUG] Error fetching candidate details:', error);
        return {};
    }
}

async function processVotes() {
    console.log('[DEBUG] Vote processing module started.');
    try {
        await initializeFirebase();
        const firestore = admin.firestore();
        await loadPrivateKey();
        const snapshot = await firestore.collection('votedetials').get();

        if (snapshot.empty) {
            console.log('[DEBUG] No votes found in Firestore.');
            return;
        }

        console.log(`[DEBUG] Found ${snapshot.size} votes in Firestore. Processing...`);

        const blockchainData = await fetchBlockchainData();
        console.log('[DEBUG] Fetched blockchain data:', blockchainData);

        const candidates = await getCandidateDetails();

        const validVotes = [];
        const errors = [];

        for (const doc of snapshot.docs) {
            const voterIdFirestore = doc.id;
            console.log(`[DEBUG] Processing vote for voterId (Firestore): ${voterIdFirestore}`);

            try {
                const data = doc.data();
                const encryptedHashFirestore = data.encryptedHash;

                if (!encryptedHashFirestore) {
                    console.warn(`[DEBUG] Skipping vote due to missing encryptedHash for voterId: ${voterIdFirestore}`);
                    errors.push({ voterId: voterIdFirestore, error: 'Missing encryptedHash' });
                    continue;
                }

                const decryptedHashFirestore = await decryptRSAOAEP(encryptedHashFirestore);

                const matchingBlockchainRecord = blockchainData.find(record => record.voterId === voterIdFirestore);

                if (matchingBlockchainRecord) {
                    const blockchainGeneratedData = `${matchingBlockchainRecord.voterId}|${matchingBlockchainRecord.candidateId}|${matchingBlockchainRecord.salt}|${matchingBlockchainRecord.timestamp}`;
                    const blockchainHash = await calculateSHA256(blockchainGeneratedData);
                    console.log(`[DEBUG] Calculated blockchain hash for ${voterIdFirestore}: ${blockchainHash}`);

                    if (decryptedHashFirestore === blockchainHash) {
                        console.log(`[DEBUG] Hashes match for voterId: ${voterIdFirestore}. Vote is valid for candidate: ${matchingBlockchainRecord.candidateId}`);
                        validVotes.push({
                            voterId: matchingBlockchainRecord.voterId,
                            candidateId: matchingBlockchainRecord.candidateId,
                            candidateDetails: candidates[matchingBlockchainRecord.candidateId] || {}, // Include candidate details
                            salt: matchingBlockchainRecord.salt,
                            timestamp: matchingBlockchainRecord.timestamp,
                        });
                    } else {
                        console.error(`[DEBUG] Hash mismatch for voterId: ${voterIdFirestore}. Vote NOT registered.`);
                        errors.push({ voterId: voterIdFirestore, error: 'Hash mismatch' });
                    }
                } else {
                    console.warn(`[DEBUG] No matching blockchain record for voterId: ${voterIdFirestore}.`);
                    errors.push({ voterId: voterIdFirestore, error: 'No matching blockchain record' });
                }

            } catch (error) {
                console.error(`[DEBUG] Error processing vote for ${voterIdFirestore}:`, error);
                errors.push({ voterId: voterIdFirestore, error: error.message || 'Unknown error' });
            }
        }

        const results = {
            validVotes: validVotes,
            errors: errors,
            candidates: candidates // Include candidate details in the results
        };

        const resultsFilePath = 'vote_results.json';
        await fs.writeFile(resultsFilePath, JSON.stringify(results, null, 2));
        console.log(`[DEBUG] Vote processing complete. Results written to ${resultsFilePath}`);
        console.log('[DEBUG] Final results:', results);

    } catch (error) {
        console.error("[DEBUG] Error during vote processing:", error);
    } finally {
        admin.app().delete().catch(error => console.error('[DEBUG] Error disconnecting Firebase:', error));
        console.log('[DEBUG] Firebase connection closed.');
    }
}

// Function to calculate SHA256 hash (using webcrypto)
async function calculateSHA256(data) {
    const msgBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(`[DEBUG] Calculated SHA-256 hash for "${data}": ${hexHash}`);
    return hexHash;
}

async function fetchBlockchainData() {
    try {
        const provider = new Web3.providers.HttpProvider(ganacheUrl);
        const web3 = new Web3(provider);

        const dataStorageABI = DataStorageArtifact.abi; // Get the ABI from the artifact
        const instance = new web3.eth.Contract(dataStorageABI, contractAddress);
        console.log('[DEBUG] DataStorage contract instance obtained (Web3.eth.Contract).');

        const blockchainVotes = [];
        let index = 0;

        console.log('[DEBUG] Fetching all votes from the blockchain...');

        while (true) {
            try {
                console.log(`[DEBUG] Attempting to read vote at index: ${index}`);
                const result = await instance.methods.readData(index).call(); // Note the syntax
                console.log(`[DEBUG] Read Result at index ${index}:`, result);
                const vote = {
                    candidateId: result[0],
                    salt: result[1],
                    timestamp: result[2],
                    voterId: result[3]
                };
                blockchainVotes.push(vote);
                console.log(`[DEBUG] Blockchain Vote ${index}:`, vote);
                index++;
            } catch (error) {
                console.error(`[DEBUG] Error reading vote at index ${index}:`, error);
                console.log('[DEBUG] Finished fetching blockchain data.');
                break;
            }
        }
        console.log('[DEBUG] Blockchain data fetched successfully:', blockchainVotes);
        return blockchainVotes;
    } catch (error) {
        console.error('[DEBUG] Error fetching blockchain data:', error);
        return [];
    }
}

processVotes();
console.log('[DEBUG] Vote processing script execution completed.');