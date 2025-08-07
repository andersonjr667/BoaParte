require('dotenv').config();
const mysql = require('mysql2');

// Criar conexão
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Testar conexão
connection.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:', err);
        return;
    }
    console.log('Conexão com MySQL estabelecida com sucesso!');
    
    // Testar uma query simples
    connection.query('SELECT 1 + 1 AS result', (err, results) => {
        if (err) {
            console.error('Erro ao executar query:', err);
            return;
        }
        console.log('Query executada com sucesso:', results);
        
        // Fechar conexão
        connection.end((err) => {
            if (err) {
                console.error('Erro ao fechar conexão:', err);
                return;
            }
            console.log('Conexão fechada com sucesso!');
        });
    });
});
