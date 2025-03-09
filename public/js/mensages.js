// Mensagem inicial de boas-vindas
const welcomeMessage = (name) => {
    const hora = new Date().getHours();
    const saudacao = hora >= 5 && hora < 12 ? "Bom dia" : 
                     hora >= 12 && hora < 18 ? "Boa tarde" : 
                     "Boa noite";

    return `${saudacao}, ${name}! Graça e Paz do Senhor Jesus!\n\n` +
        "Seja muito bem-vindo(a) à Igreja Batista Solidária! A Juventude da Igreja Batista Solidária (JIBS) também celebra a sua chegada e se alegra em recebê-lo(a). " +
        "É uma honra tê-lo(a) conosco e agradecemos por compartilhar seu contato.\n\n" +
        "Que este momento seja especial em sua vida e que você se sinta acolhido(a) e abençoado(a) por Deus. " +
        "Estamos aqui para caminhar ao seu lado e auxiliar no que for preciso.\n\n" +
        "Que o Senhor renove sua paz, sua alegria e sua esperança hoje e sempre!\n\n" +
        "Com carinho,\nJuventude da Igreja Batista Solidária (JIBS) e Igreja Batista Solidária";
};

// Programações da semana
const programacoesSemana = `
📌 *Programações da semana na igreja:*
• *Terça-feira:* Reunião de oração às 20h
• *Quinta-feira:* Culto às 20h
• *Sábado:* Culto dos jovens às 19h
• *Domingo:* Às 09h: Escola Bíblica Dominical. Às 10 e às 19h: Culto.
`;

// Mensagens de acompanhamento para cada dia
const followUpMessages = [
    // Mensagem 1 (Segunda-feira)
    (name) => `Bom dia, ${name}! ☀️\n\n` +
        "Que esta segunda-feira seja cheia da graça e da paz do Senhor! 🌟\n" +
        "Comece a semana com o coração cheio de esperança e confiança em Deus.\n\n" +
        programacoesSemana +
        "\nDeus te abençoe! 🙏\n\n" +
        "_\"As misericórdias do Senhor são a causa de não sermos consumidos, porque as suas misericórdias não têm fim; renovam-se cada manhã. Grande é a tua fidelidade.\"_ \n*Lamentações 3:22-23*",

    // Mensagem 2 (Terça-feira)
    (name) => `Graça e Paz, ${name}! 🌟\n\n` +
        "Hoje é terça-feira, dia de reunião de oração às 20h! 🙏\n" +
        "Venha fortalecer sua fé e compartilhar suas intenções conosco.\n\n" +
        programacoesSemana +
        "\nDeus te abençoe! 💖\n\n" +
        "_\"O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e te conceda graça.\"_ \n*Números 6:24-25*",

    // Mensagem 3 (Quarta-feira)
    (name) => `Paz do Senhor, ${name}! ✝️\n\n` +
        "Que a presença de Deus esteja com você nesta quarta-feira! 🌟\n" +
        "Estamos orando por você e sua família.\n\n" +
        programacoesSemana +
        "\nConte conosco para o que precisar! 🙌\n\n" +
        "_\"Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.\"_ \n*Jeremias 29:11*",

    // Mensagem 4 (Quinta-feira)
    (name) => `Boa tarde, ${name}! ☀️\n\n` +
        "Hoje é quinta-feira, dia de culto às 20h! 🕊️\n" +
        "Venha adorar ao Senhor conosco e renovar suas forças.\n\n" +
        programacoesSemana +
        "\nDeus te abençoe grandemente! 🙏\n\n" +
        "_\"Alegrem-se sempre no Senhor. Novamente direi: alegrem-se!\"_ \n*Filipenses 4:4*",

    // Mensagem 5 (Sexta-feira)
    (name) => `Olá, ${name}! 💝\n\n` +
        "Sexta-feira chegou, e estamos aqui para lembrar que você é muito especial para nossa igreja! 🌟\n" +
        "Prepare-se para o culto dos jovens amanhã às 19h!\n\n" +
        programacoesSemana +
        "\nQue Deus renove suas forças e te abençoe! 🙌\n\n" +
        "_\"Tudo posso naquele que me fortalece.\"_ \n*Filipenses 4:13*",

    // Mensagem 6 (Sábado - 2 horas antes do culto)
    (name) => `Olá, ${name}! 🌟\n\n` +
        "Faltam apenas 2 horas para o Culto dos Jovens, que começa às 19h! 🕊️\n" +
        "Prepare seu coração para um momento de adoração, comunhão e renovação espiritual.\n\n" +
        programacoesSemana +
        "\nEsperamos você lá! Que Deus prepare seu coração para receber as bênçãos que Ele tem para você hoje. 🙏\n\n" +
        "_\"Cheguemos perto de Deus com um coração sincero e com plena convicção de fé.\"_ \n*Hebreus 10:22*",

    // Mensagem 7 (Sábado - Durante o culto, até 21h)
    (name) => `Olá, ${name}! 🌙\n\n` +
        "Estamos neste momento no Culto dos Jovens, e você está em nossos pensamentos e orações! 🙏\n" +
        "Se ainda não chegou, venha participar conosco deste momento especial na presença de Deus.\n\n" +
        programacoesSemana +
        "\nQue o Senhor fale ao seu coração e renove suas forças! 💖\n\n" +
        "_\"Porque onde estiverem dois ou três reunidos em meu nome, ali eu estou no meio deles.\"_ \n*Mateus 18:20*",

    // Mensagem 8 (Domingo - 2 horas antes do culto da manhã)
    (name) => `Bom dia, ${name}! ☀️\n\n` +
        "Faltam apenas 2 horas para o Culto das 10h! 🕊️\n" +
        "Prepare seu coração para adorar ao Senhor e receber a Palavra que Ele tem para você hoje.\n\n" +
        programacoesSemana +
        "\nEsperamos você lá! Que este culto seja uma bênção para sua vida. 🙏\n\n" +
        "_\"Entrem por suas portas com ações de graças e em seus átrios com louvor; deem-lhe graças e bendigam o seu nome.\"_ \n*Salmos 100:4*",

    // Mensagem 9 (Domingo - Durante o culto da manhã, até 12h)
    (name) => `Bom dia, ${name}! 🌟\n\n` +
        "Estamos neste momento no Culto das 10h, e você está em nossos pensamentos e orações! 🙏\n" +
        "Se ainda não chegou, venha participar conosco deste momento de adoração e comunhão com Deus.\n\n" +
        programacoesSemana +
        "\nQue o Senhor fale ao seu coração e renove suas forças! 💖\n\n" +
        "_\"Alegrem-se na esperança, sejam pacientes na tribulação, perseverem na oração.\"_ \n*Romanos 12:12*",

    // Mensagem 10 (Domingo - 2 horas antes do culto da noite)
    (name) => `Boa tarde, ${name}! 🌤️\n\n` +
        "Faltam apenas 2 horas para o Culto das 19h! 🕊️\n" +
        "Prepare seu coração para encerrar o dia na presença do Senhor e renovar suas forças para a semana que vem.\n\n" +
        programacoesSemana +
        "\nEsperamos você lá! Que este culto seja uma bênção para sua vida. 🙏\n\n" +
        "_\"Vinde, adoremos e prostremo-nos; ajoelhemos diante do Senhor, que nos criou.\"_ \n*Salmos 95:6*",

    // Mensagem 11 (Domingo - Durante o culto da noite, até 21h)
    (name) => `Boa noite, ${name}! 🌙\n\n` +
        "Estamos neste momento no Culto das 19h, e você está em nossos pensamentos e orações! 🙏\n" +
        "Se ainda não chegou, venha participar conosco deste momento de adoração e comunhão com Deus.\n\n" +
        programacoesSemana +
        "\nQue o Senhor fale ao seu coração e renove suas forças! 💖\n\n" +
        "_\"Porque onde estiverem dois ou três reunidos em meu nome, ali eu estou no meio deles.\"_ \n*Mateus 18:20*"
];

// Função para obter a mensagem do dia
const getMessageByDay = (name) => {
    const diaSemana = new Date().getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const hora = new Date().getHours();

    // Mensagens específicas para sábado e domingo
    if (diaSemana === 6) { // Sábado
        if (hora >= 17 && hora < 19) { // 2 horas antes do culto
            return followUpMessages[5](name);
        } else if (hora >= 19 && hora < 21) { // Durante o culto
            return followUpMessages[6](name);
        }
    } else if (diaSemana === 0) { // Domingo
        if (hora >= 8 && hora < 10) { // 2 horas antes do culto da manhã
            return followUpMessages[7](name);
        } else if (hora >= 10 && hora < 12) { // Durante o culto da manhã
            return followUpMessages[8](name);
        } else if (hora >= 17 && hora < 19) { // 2 horas antes do culto da noite
            return followUpMessages[9](name);
        } else if (hora >= 19 && hora < 21) { // Durante o culto da noite
            return followUpMessages[10](name);
        }
    } else if (diaSemana >= 1 && diaSemana <= 4) { // Segunda a quinta
        return followUpMessages[diaSemana - 1](name);
    }

    // Mensagem genérica para outros horários
    return `Olá, ${name}! 😊\n\n` +
           "Hoje não há uma mensagem específica, mas lembre-se das nossas programações da semana:\n\n" +
           programacoesSemana +
           "\nDeus te abençoe! 🙏";
};

// Exporta as funções para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        welcomeMessage,
        getMessageByDay
    };
}