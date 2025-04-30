const contract = require('@truffle/contract');
const DataStorageArtifact = require('./build/contracts/DataStorage.json');
const Web3 = require('web3');
const admin = require('firebase-admin');
const contractAddress = '0xb78C53D1163443b20979bCe1559DC4C8d65F9D85';

// Firebase Admin SDK credentials (replace with your provided JSON content)
const serviceAccount = {
  "type": "service_account",
  "project_id": "voter-card-scanner",
  "private_key_id": "04a48e53dea106846b463985610890da4e1a64f8",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCbhlfc4BmDk9wL\nRPJpIPlcHEB7Y/C3PwiphyksvbJAaxexraVRu01nMF3moOpB+wBvldLHXiG0hA72\nxIofPRI3D6NucXc6lUsgBsQm20Du9lvL+RD42gc7XDPiWIuCZ1MNgk1JWESFCGMl\ng6zhGycLXh0E0y9iiLBYbfn5NDFl7SMkJ3scX5M32o0/4c9FDx3MS/DVCWmkNO/t\nP+yuAax+pRdHyMPRQQNqrapV9lvtsdekX2Jb/4EOZOTh60HvQCSZlVsRaVc/XmdW\nRiUlxYHAcdvC0csX0LMpo5XP2Vn/r7790xYBBF2/8ZYZG21PIW+hHZxru0l37S+b\n0XGSZ8DjAgMBAAECggEAEFfqzcxDAh+8pPaG3uNXMQXLBOx4tFkMaPxKKGh63egj\nIknUMKWVOb3McFsCoxJkdlVxRAAxXI3wIKCAv02kp2KeUxHbbK2ZqnDrlgW+ah47\ngVDYJr6KugMzdJrHdlmzUZ0a0BVVhgFeoeeXeERpMvmd5Q7oUNt6ZKCR/00rz8EU\n1KK8/PPrBprFD40pfKH2XVvTNW/r8LBiVu/X4DYtTP3ns6w7sYI8wZYirhyeljO3\ntCV5i7vj0y8WsFINPRKR8zFFTXoSYLLGGnbUcZZr1b8DGGZ6oLHnh2UtsufS2qfF\nF3mjsi8tuNwiJzB3VpvZqF1vu8MARpwsgM8YOjdkGQKBgQDOud8WgPcTBVo06uDP\nIUc6m8UL14+Xsr0/z3B+H2xsIIBHQeWgSFnUkhQLduTKrKJ8e/ZMPRqlihU0FGPK\n8qMezIHya1o8UcyeRWRcV9MLxKieU7pKoj9o19BZofgicKSxOZlLj6Dhp1lK6qA/\npdwHS6LBhXBX/+3Q6RlucgxEDQKBgQDAmD4lzHphjG1AWDE/acuRSfH25aTjR5Tw\n23PPpZcXSXgDhWzO8SvwvTVu/DyykQEo+z2R7l52OMg0j3/l8GQcvqUjx3/aCP8T\nsosRFmY7/WPhFaxMVp7/jn/3q0bj1K3pVE/5zlJtMFpUDbXHNr0ggrbPG93hdlhk\nMzxN3d8srwKBgAedVRhRG8i5k78LP8ihYyxHfJSZFhLyZIIrM+uRYL8C23bEeJ7U\ny2pHDzH06SyF+142erYIMikS0wEeFybslRGXWtoBFkvOf4j86Vt1aLKwRb2/O8dv\n/oHwIR6MFsW9/HMCuiDMY5KsRV+7ELgHdflW0eHq9l5ncO0XCPbGgKkpAoGBAIJG\nuUtCPMo9fi1XOsDlZHD77vOOtXGUGxitqXIdVc3HwanIGCkHlCx9IGbZsokrcvhw\nsl5DOpyHnk2HgAFfEaksAHLqYP5wtXJyhIVjfHY52dUInwroURcXIlK7BfHZDGbX\nxF17BeCcI43V1E9UJKyYHuaLuBPpxLLKwZD+cxc7AoGBALv1BL8zj0IBY94X1CsU\nL4tljg1J5FtrXXaU4VC8mGd9XPofWCzje3i7cslkC+XczYjuNJ3vFJrKj9BMqY4k\nvTeF8z9YzwkKEL2ZES13rfHJW9RO0C4GwhOUNMr/uP6a9f2JluK131qeGbfzAFNh\ny0BxFCBQsifXOg7DYdFJDGSE\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@voter-card-scanner.iam.gserviceaccount.com",
  "client_id": "105035169630885724208",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40voter-card-scanner.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://voter-card-scanner-default-rtdb.asia-southeast1.firebasedatabase.app/" // Your Firebase Realtime Database URL
});

const db = admin.database();
const blockchainVotesRef = db.ref("blockchain_votes");

// Set up a provider pointing to your Ganache instance
const provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
const web3 = new Web3(provider);

const DataStorage = contract(DataStorageArtifact);
DataStorage.setProvider(provider);

async function integrateVotingData() {
  try {
    const instance = await DataStorage.deployed();
    const accounts = await web3.eth.getAccounts();
    const defaultAccount = accounts[0];

    console.log("Listening for new votes in Firebase Realtime Database...");

    blockchainVotesRef.on('child_added', async (snapshot) => {
      const voteData = snapshot.val();
      const voteId = snapshot.key; // The auto-generated key (e.g., -00nEtc5V4iYB6iHBM24)

      console.log("New vote detected:", voteId, voteData);

      const { candidateId, salt, timestamp, voterId } = voteData;

      console.log("Storing vote data on the blockchain...");
      try {
        const storeTx = await instance.storeData(
          candidateId,
          salt,
          timestamp.toString(), // Ensure timestamp is a string
          voterId,
          { from: defaultAccount }
        );
        console.log("Vote data stored. Transaction hash:", storeTx.tx);

        // Remove the processed vote data from Firebase Realtime Database
        console.log("Removing vote data from Firebase:", voteId);
        await blockchainVotesRef.child(voteId).remove();
        console.log("Vote data removed from Firebase.");

      } catch (error) {
        console.error("Error storing data on blockchain:", error);
      }
    });

  } catch (error) {
    console.error("Error connecting to contract or Firebase:", error);
  }
}

integrateVotingData();