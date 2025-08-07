const mysql = require('mysql2/promise');
const fs = require('fs-extra');
const path = require('path');

class DataManager {
    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: 'boaparte'
        };
        this.isSQL = false; // Começa com JSON e tenta mudar para SQL
    }

    async initialize() {
        try {
            // Tenta conectar ao MySQL
            const connection = await mysql.createConnection(this.dbConfig);
            await connection.end();
            this.isSQL = true;
            console.log('Usando banco de dados MySQL');
        } catch (error) {
            this.isSQL = false;
            console.log('Usando banco de dados JSON');
        }
    }

    async getMembers() {
        try {
            if (this.isSQL) {
                const connection = await mysql.createConnection(this.dbConfig);
                const [rows] = await connection.execute('SELECT * FROM members');
                await connection.end();
                return rows;
            } else {
                return await fs.readJson(path.join(__dirname, 'members.json'));
            }
        } catch (error) {
            console.error('Erro ao buscar membros:', error);
            // Se falhou no SQL, tenta JSON como fallback
            if (this.isSQL) {
                this.isSQL = false;
                return await fs.readJson(path.join(__dirname, 'members.json'));
            }
            throw error;
        }
    }

    async saveMember(member) {
        try {
            if (this.isSQL) {
                const connection = await mysql.createConnection(this.dbConfig);
                const query = `
                    INSERT INTO members SET ?
                    ON DUPLICATE KEY UPDATE ?
                `;
                await connection.execute(query, [member, member]);
                await connection.end();
            } else {
                let members = await fs.readJson(path.join(__dirname, 'members.json'));
                const index = members.findIndex(m => m._id === member._id);
                if (index !== -1) {
                    members[index] = { ...members[index], ...member };
                } else {
                    members.push(member);
                }
                await fs.writeJson(path.join(__dirname, 'members.json'), members, { spaces: 2 });
            }
        } catch (error) {
            console.error('Erro ao salvar membro:', error);
            if (this.isSQL) {
                this.isSQL = false;
                return this.saveMember(member); // Tenta novamente com JSON
            }
            throw error;
        }
    }

    // Métodos similares para contacts, users, logs, etc.
    // ...
}

module.exports = new DataManager();
