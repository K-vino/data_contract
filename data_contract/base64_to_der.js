const fs = require('fs');

try {
    const base64Key = fs.readFileSync('private_key_pkcs8.b64', 'utf8').replace(/\s/g, '');
    const derBuffer = Buffer.from(base64Key, 'base64');
    fs.writeFileSync('private_key_pkcs8.der', derBuffer);
    console.log('Successfully converted private_key_pkcs8.b64 to private_key_pkcs8.der');
} catch (error) {
    console.error('Error during conversion:', error);
}