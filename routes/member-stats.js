const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const { auth } = require('../utils/auth');
const fs = require('fs').promises;
const path = require('path');

// Get member statistics
router.get('/', async (req, res) => {
    try {
        const membersPath = path.join(__dirname, '../db/members.json');
        console.log('Reading members from:', membersPath);
        const membersData = await fs.readFile(membersPath, 'utf8');
        const members = JSON.parse(membersData);
        console.log('Total members found:', members.length);

        let stats = {
            totalMen: 0,
            inactiveMen: 0,
            totalWomen: 0,
            inactiveWomen: 0,
            boaParteMembers: 0,
            louvorMembers: 0,
            dancaMembers: 0,
            midiaMembers: 0,
            intersecaoMembers: 0,
            weeklyAbsences: 0,
            averageAge: 0,
            totalAgeSum: 0,
            totalMembers: 0
        };

        // Process each member
        members.forEach(member => {
            // Count by gender
            if (member.gender?.toLowerCase() === 'masculino') {
                stats.totalMen++;
                if (member.status?.toLowerCase() === 'inativo') stats.inactiveMen++;
            } else if (member.gender?.toLowerCase() === 'feminino') {
                stats.totalWomen++;
                if (member.status?.toLowerCase() === 'inativo') stats.inactiveWomen++;
            }
            
            console.log(`Processing member: ${member.name}, Gender: ${member.gender}, Status: ${member.status}`);

            // Calculate age if birthDate exists and is not empty
            if (member.birthDate && member.birthDate.trim() !== '') {
                const birthDate = new Date(member.birthDate);
                if (!isNaN(birthDate.getTime())) {  // Check if it's a valid date
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    stats.totalAgeSum += age;
                    stats.totalMembers++;
                }
            }

            // Count ministry members
            if (member.ministries && typeof member.ministries === 'object') {
                if (member.ministries.boaparte) stats.boaParteMembers++;
                if (member.ministries.louvor) stats.louvorMembers++;
                if (member.ministries.danca) stats.dancaMembers++;
                if (member.ministries.midia) stats.midiaMembers++;
                if (member.ministries.intercessao) stats.intersecaoMembers++;
                console.log(`Member ${member.name} ministries:`, member.ministries);
            }
        });

        // Calculate who is most inactive
        stats.mostInactive = stats.inactiveMen > stats.inactiveWomen ? 'Homens' : 'Mulheres';
        if (stats.inactiveMen === stats.inactiveWomen) stats.mostInactive = 'Igual';

        // Get weekly absences from absentmembers.json
        const absentsPath = path.join(__dirname, '../db/absentmembers.json');
        const absentsData = await fs.readFile(absentsPath, 'utf8');
        const absents = JSON.parse(absentsData);

        // Count absences in the last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        stats.weeklyAbsences = absents.filter(absent => {
            const absentDate = new Date(absent.date);
            return absentDate >= oneWeekAgo;
        }).length;

        // Calculate average age
        stats.averageAge = stats.totalMembers > 0 ? Math.round(stats.totalAgeSum / stats.totalMembers) : 0;
        
        // Remove temporary calculation fields
        delete stats.totalAgeSum;
        delete stats.totalMembers;

        res.json(stats);
    } catch (error) {
        console.error('Error getting member stats:', error);
        if (error.code === 'ENOENT') {
            res.status(500).json({ error: 'Arquivo de membros não encontrado' });
        } else if (error instanceof SyntaxError) {
            res.status(500).json({ error: 'Erro ao processar dados dos membros' });
        } else {
            res.status(500).json({ error: 'Erro ao buscar estatísticas dos membros' });
        }
    }
});

module.exports = router;
