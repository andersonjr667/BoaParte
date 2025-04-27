// Função para obter hora correta no Brasil
function getBrazilDateTime() {
    return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function getBrazilHour() {
    return new Date().toLocaleString("pt-BR", { 
        timeZone: "America/Sao_Paulo",
        hour: 'numeric',
        hour12: false
    });
}

// Mensagem inicial de boas-vindas
function welcomeMessage(name) {
    const hour = new Date().getHours();
    let greeting;
    
    if (hour >= 5 && hour < 12) {
        greeting = "Bom dia";
    } else if (hour >= 12 && hour < 18) {
        greeting = "Boa tarde";
    } else {
        greeting = "Boa noite";
    }

    return `${greeting}, ${name}! Graça e Paz do Senhor Jesus!\n\n` +
           `Seja muito bem-vindo(a) à Igreja Batista Solidária! A Juventude da Igreja Batista Solidária (JIBS) também celebra a sua chegada e se alegra em recebê-lo(a). É uma honra tê-lo(a) conosco e agradecemos por compartilhar seu contato.\n\n` +
           `Que este momento seja especial em sua vida e que você se sinta acolhido(a) e abençoado(a) por Deus. Estamos aqui para caminhar ao seu lado e auxiliar no que for preciso.\n\n` +
           `Que o Senhor renove sua paz, sua alegria e sua esperança hoje e sempre!\n\n` +
           `Com carinho,\n` +
           `Juventude da Igreja Batista Solidária (JIBS) e Igreja Batista Solidária`;
}

function reminderMessage(name) {
    return `Oi ${name}! Tudo bem?\nQueria dizer que senti sua falta no culto. Você faz muita diferença entre a gente! Espero que esteja tudo bem com você. Se precisar de algo, estou aqui. Que Deus te abençoe! 🙏🏼✨`;
}

function getMessageForWeek(name, week) {
    const messages = {
        1: welcomeMessage(name),
        2: `Olá ${name}! Como foi sua primeira semana conosco?`,
        3: `Olá ${name}! Esperamos vê-lo novamente neste domingo!`,
        4: `Olá ${name}! Que tal fazer parte da nossa família?`
    };
    return messages[week] || welcomeMessage(name);
}

module.exports = {
    welcomeMessage,
    reminderMessage,
    getMessageForWeek
};