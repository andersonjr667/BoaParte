const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const { auth } = require('../utils/auth');
const path = require('path');
const fs = require('fs');

// Export members to Excel
router.get('/members', auth, async (req, res) => {
    try {
        // Read members from JSON file
        const membersPath = path.join(__dirname, '../db/members.json');
        const members = JSON.parse(fs.readFileSync(membersPath, 'utf8'));

        // Format phone number function
        const formatPhoneNumber = (phone) => {
            // Remove any non-digit characters and ensure it starts with 55
            const digits = phone.replace(/\D/g, '');
            const normalizedPhone = digits.startsWith('55') ? digits : `55${digits}`;
            
            if (normalizedPhone.length >= 12) { // Including country code
                return `+${normalizedPhone.slice(0, 2)} (${normalizedPhone.slice(2, 4)}) ${normalizedPhone.slice(4)}`;
            }
            return phone; // Return original if can't format
        };

        // Format date function
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            try {
                const date = new Date(dateStr);
                return date.toLocaleDateString('pt-BR');
            } catch (e) {
                return dateStr;
            }
        };

        // Map data for the spreadsheet
        const data = members.map(m => {
            // Get active ministries
            const formatMinistry = (ministry) => {
                // Lista de nomes especiais que precisam ser separados
                const specialNames = {
                    'boaparte': 'Boa Parte',
                };

                // Se for um nome especial, retorna o formato correto
                if (specialNames[ministry]) {
                    return specialNames[ministry];
                }

                // Para outros nomes, apenas capitaliza a primeira letra
                return ministry
                    .split(/(?=[A-Z])/)  // Divide onde encontrar letra maiúscula
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
            };

            const activeMinistries = m.ministries ? 
                Object.entries(m.ministries)
                    .filter(([_, ativo]) => ativo)
                    .map(([min]) => formatMinistry(min))
                    .join(', ') : 
                'Nenhum';

            return {
                ID: m._id || '',
                Nome: m.name || '',
                Telefone: formatPhoneNumber(m.phone || ''),
                'Data de Cadastro': formatDate(m.createdAt),
                'Data de Aniversário': formatDate(m.birthDate),
                Sexo: m.gender || '',
                Status: m.status || '',
                Ministérios: activeMinistries
            };
        });

        // Create a new workbook and add the worksheet
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(data);

        // Get the range of the data
        const range = xlsx.utils.decode_range(worksheet['!ref']);
        
        // Create styles
        const headerStyle = { font: { bold: true }, alignment: { horizontal: 'center' } };
        
        // Apply styles and format cells
        for (let col = range.s.c; col <= range.e.c; col++) {
            const headerCell = xlsx.utils.encode_cell({ r: 0, c: col });
            
            // Apply header style
            worksheet[headerCell].s = headerStyle;

            // Get the header name
            const headerName = worksheet[headerCell].v;

            // Process each column's data
            if (['Nome', 'Sexo', 'Status', 'Ministérios'].includes(headerName)) {
                for (let row = 1; row <= range.e.r; row++) {
                    const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
                    const cell = worksheet[cellAddress];
                    
                    if (cell && cell.v) {
                        // Convert to uppercase first letter of each word
                        const words = cell.v.toLowerCase().split(' ');
                        const properCase = words.map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ');
                        
                        worksheet[cellAddress].v = properCase;
                    }
                }
            }
        }

        // Set specific column widths
        worksheet['!cols'] = [
            { wch: 25 },  // ID
            { wch: 30 },  // Nome
            { wch: 20 },  // Telefone
            { wch: 15 },  // Data de Cadastro
            { wch: 15 },  // Data de Aniversário
            { wch: 12 },  // Sexo
            { wch: 12 },  // Status
            { wch: 40 }   // Ministérios
        ];

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Membros');

        // Set response headers for Excel file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=membros.xlsx');

        // Write directly to response
        const buffer = xlsx.write(workbook, { type: 'buffer' });
        res.send(buffer);

    } catch (error) {
        console.error('Error exporting members:', error);
        res.status(500).json({ error: 'Erro ao exportar membros' });
    }
});

module.exports = router;
