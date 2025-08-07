require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function initializeDb() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Check for existing admin
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('Admin user created successfully');
            console.log('Username: admin');
            console.log('Password: admin123');
        } else {
            console.log('Admin user already exists');
        }

        await mongoose.disconnect();
        console.log('Database initialization complete');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

initializeDb();
