


const express = require('express');
const { DateTime } = require('luxon');
const router = express.Router();
const Member = require('../models/Member');
const { auth, adminOnly } = require('../utils/auth');
const Log = require('../models/Log');
const fs = require('fs');
const path = require('path');

// Buscar chamadas rápidas do dia no arquivo JSON
router.get('/absent-list/json', auth, async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ message: 'Data obrigatória' });
        const absentPath = path.join(__dirname, '../db/absentmembers.json');
        let data = [];
        if (fs.existsSync(absentPath)) {
            data = JSON.parse(fs.readFileSync(absentPath, 'utf8'));
        }
        // Filtra todas as chamadas do dia
        const chamadas = data.filter(entry => entry.date === date);
        res.json({ date, chamadas });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar chamadas do dia', error: error.message });
    }
});

// Get all members
router.get('/', auth, async (req, res) => {
  try {
    const membersPath = path.join(__dirname, '../db/members.json');
    let members = [];
    
    if (fs.existsSync(membersPath)) {
      members = JSON.parse(fs.readFileSync(membersPath, 'utf8'));
    }

    // Sort members by name
    members.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    
    res.json(members);
  } catch (error) {
    console.error('Erro ao carregar membros:', error);
    res.status(500).json({ message: 'Erro ao buscar membros' });
  }
});

// Get absent members
router.get('/absent', auth, async (req, res) => {
  try {
    const daysAbsent = parseInt(req.query.days) || 14;
    const absentMembers = await Member.findAbsentMembers(daysAbsent);
    res.json(absentMembers);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar membros ausentes' });
  }
});

// Create new member
router.post('/', auth, async (req, res) => {
  try {
    const member = new Member({
      ...req.body,
      createdBy: req.userData.userId
    });
    await member.save();

    // Log the action
    await Log.logAction({
      type: 'create',
      action: 'create_member',
      username: req.userData.email,
      description: `Novo membro criado: ${member.name}`,
      details: {
        memberId: member._id,
        name: member.name
      },
      source: 'member'
    });
    
    const populatedMember = await Member.findById(member._id)
      .populate('createdBy', 'name email');

    res.status(201).json(populatedMember);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar membro' });
  }
});

// Update member
router.put('/:id', auth, async (req, res) => {
  try {
    const membersPath = path.join(__dirname, '../db/members.json');
    let members = [];
    
    if (fs.existsSync(membersPath)) {
      members = JSON.parse(fs.readFileSync(membersPath, 'utf8'));
    }

    const memberIndex = members.findIndex(m => m._id === req.params.id);
    
    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Membro não encontrado' });
    }

    // Update member data while preserving _id and timestamps
    const updatedMember = {
      ...members[memberIndex],
      ...req.body,
      _id: req.params.id,
      updatedAt: new Date().toISOString()
    };

    members[memberIndex] = updatedMember;

    // Save back to file
    fs.writeFileSync(membersPath, JSON.stringify(members, null, 2));

    res.json(updatedMember);
  } catch (error) {
    console.error('Erro ao atualizar membro:', error);
    res.status(500).json({ message: 'Erro ao atualizar membro' });
  }
});

// Record attendance for a member
router.post('/:id/attendance', auth, async (req, res) => {
  try {
    const { date, present } = req.body;
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ message: 'Membro não encontrado' });
    }

    await member.recordAttendance(date ? new Date(date) : new Date(), present, req.userData.userId);
    res.json(member);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar presença' });
  }
});

// Get attendance statistics for a member
router.get('/:id/attendance', auth, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ message: 'Membro não encontrado' });
    }

    const { startDate, endDate } = req.query;
    const stats = member.getAttendanceStats(
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});

// Record absence
router.post('/:id/absence', auth, async (req, res) => {
  try {
    const { date, justified, justification } = req.body;
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ message: 'Membro não encontrado' });
    }

    member.absences.push({ date, justified, justification });
    await member.save();

    res.json({ message: 'Ausência registrada com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar ausência' });
  }
});

// Delete member
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.userData.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Membro não encontrado' });
    }

    // Log de exclusão de membro
    await Log.logAction({
      type: 'delete',
      action: 'delete_member',
      username: req.userData.email || req.userData.username,
      description: `Membro removido: ${member.name}`,
      details: {
        memberId: member._id,
        name: member.name
      },
      source: 'member'
    });

    res.json({ message: 'Membro removido com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover membro' });
  }
});

// Get members by status
router.get('/status', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const statusValue = status === 'todos' ? null : status;

    const members = await Member.find()
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    const filteredMembers = members.filter(member => {
      const matchesStatus = !statusValue || 
        (statusValue === 'ativo' && member.isDisciple) ||
        (statusValue === 'visitante' && !member.isDisciple);

      return matchesStatus;
    });

    res.json(filteredMembers);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar membros' });
  }
});

// Salvar lista de ausentes do dia (agora no MongoDB)
router.post('/absent-list', auth, async (req, res) => {
    try {
        const { date, absents } = req.body;
        if (!date || !Array.isArray(absents)) {
            return res.status(400).json({ message: 'Dados inválidos' });
        }
        const AbsentMember = require('../models/AbsentMember');
        // Garante data local (meia-noite)
        // Usa data e hora de Brasília (UTC-3)
        let localDate;
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            localDate = DateTime.fromISO(date, { zone: 'America/Sao_Paulo' }).startOf('day').toJSDate();
        } else {
            localDate = DateTime.fromJSDate(new Date(date), { zone: 'America/Sao_Paulo' }).startOf('day').toJSDate();
        }
        // Remove todos os registros do mesmo dia (ignorando horário)
        await AbsentMember.deleteMany({
            $expr: {
                $and: [
                    { $eq: [{ $year: "$date" }, localDate.getFullYear()] },
                    { $eq: [{ $month: "$date" }, localDate.getMonth() + 1] },
                    { $eq: [{ $dayOfMonth: "$date" }, localDate.getDate()] }
                ]
            }
        });
        // Salva cada ausente
        const toInsert = absents.map(absent => ({
            memberId: absent.memberId || null,
            date: localDate,
            reason: absent.reason || 'Chamada rápida',
            justified: false,
            justification: '',
            recordedBy: req.userData.userId
        }));
        await AbsentMember.insertMany(toInsert);
        res.json({ message: 'Chamada salva no banco de dados!' });
    } catch (error) {
        console.error('[DEBUG] Erro ao salvar chamada no banco:', error);
        res.status(500).json({ message: 'Erro ao salvar chamada' });
    }
});

// Buscar ausentes do dia (MongoDB)
router.get('/absent-list', auth, async (req, res) => {
    try {
        const { date } = req.query;
        const AbsentMember = require('../models/AbsentMember');
        // Usa data e hora de Brasília (UTC-3)
        let localDate;
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            localDate = DateTime.fromISO(date, { zone: 'America/Sao_Paulo' }).startOf('day').toJSDate();
        } else {
            localDate = DateTime.fromJSDate(new Date(date), { zone: 'America/Sao_Paulo' }).startOf('day').toJSDate();
        }
        // Busca todos os registros do mesmo dia (ignorando horário)
        const absents = await AbsentMember.find({
            $expr: {
                $and: [
                    { $eq: [{ $year: "$date" }, localDate.getFullYear()] },
                    { $eq: [{ $month: "$date" }, localDate.getMonth() + 1] },
                    { $eq: [{ $dayOfMonth: "$date" }, localDate.getDate()] }
                ]
            }
        }).populate('memberId');
        res.json({ date, absents });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar chamada' });
    }
});

// Rota para buscar ausentes agrupados por membro e datas de falta
router.get('/absent-list/history', auth, async (req, res) => {
    try {
        const absentPath = path.join(__dirname, '../db/absentmembers.json');
        let data = [];
        if (fs.existsSync(absentPath)) {
            data = JSON.parse(fs.readFileSync(absentPath, 'utf8'));
        }
        // Agrupa por membro
        const memberAbsences = {};
        data.forEach(entry => {
            const dateTime = `${entry.date} ${entry.time || ''}`.trim();
            (entry.absents || []).forEach(absent => {
                const key = absent.name + (absent.phone ? '|' + absent.phone : '');
                if (!memberAbsences[key]) {
                    memberAbsences[key] = { name: absent.name, phone: absent.phone || '', absences: [] };
                }
                memberAbsences[key].absences.push(dateTime);
            });
        });
        // Ordena datas decrescente
        Object.values(memberAbsences).forEach(m => m.absences.sort((a,b) => b.localeCompare(a)));
        res.json(Object.values(memberAbsences));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar histórico de ausências' });
    }
});

// Salvar chamada rápida (JSON) - permite múltiplas por dia/hora
router.post('/absent-list/json', auth, async (req, res) => {
    try {
        const { date, time, absents } = req.body;
        if (!date || !time || !Array.isArray(absents)) {
            return res.status(400).json({ message: 'Dados inválidos' });
        }
        const absentPath = path.join(__dirname, '../db/absentmembers.json');
        let data = [];
        if (fs.existsSync(absentPath)) {
            data = JSON.parse(fs.readFileSync(absentPath, 'utf8'));
        }
        // Não permite duplicidade de chamada no mesmo dia/hora
        const exists = data.some(entry => entry.date === date && entry.time === time);
        if (exists) {
            return res.status(409).json({ message: 'Já existe chamada para este dia e horário.' });
        }
        data.push({ date, time, absents });
        fs.writeFileSync(absentPath, JSON.stringify(data, null, 2));
        res.json({ message: 'Chamada salva com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar chamada', error: error.message });
    }
});

module.exports = router;
