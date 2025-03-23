const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\nNew VAPID Keys Generated:\n');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('\nAdd these to your .env file\n');
