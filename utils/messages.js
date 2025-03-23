(function(global) {
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
    const welcomeMessage = (name) => {
        const hora = parseInt(getBrazilHour());
        const saudacao = hora >= 5 && hora < 12 ? "Bom dia" : 
                         hora >= 12 && hora < 18 ? "Boa tarde" : 
                         "Boa noite";

        return `${saudacao}, ${name}! Graça e Paz do Senhor Jesus!\n\n` +
            "Seja muito bem-vindo(a) à Igreja Batista Solidária! A Juventude da Igreja Batista Solidária (JIBS) também celebra a sua chegada e se alegra em recebê-lo(a). " +
            "É uma honra tê-lo(a) conosco e agradecemos por compartilhar seu contato.\n\n" +
            "Que este momento seja especial em sua vida e que você se sinta acolhido(a) e abençoado(a) por Deus. " +
            "Estamos aqui para caminhar ao seu lado e auxiliar no que for preciso.\n\n" +
            "📌 *Nossas programações:*\n" +
            "• *Terças-feiras:* Culto de Oração às 20h\n" +
            "• *Quintas-feiras:* Culto do Clamor às 20h\n" +
            "• *Sábados:* Culto de Jovens e Adolescentes às 19h\n" +
            "• *Domingos:*\n" +
            "  - 09h: Escola Bíblica Dominical\n" +
            "  - 10h: Culto da Manhã\n" +
            "  - 19h: Culto da Noite\n\n" +
            "Que o Senhor renove sua paz, sua alegria e sua esperança hoje e sempre!\n\n" +
            "Com carinho,\nJuventude da Igreja Batista Solidária (JIBS) e Igreja Batista Solidária";
    };

    // Programações da semana atualizadas
    const programacoesSemana = `
📌 *Programações da igreja:*
• *Terças-feiras:* Culto de Oração às 20h
• *Quintas-feiras:* Culto do Clamor às 20h
• *Sábados:* Culto de Jovens e Adolescentes às 19h
• *Domingos:* 
  - 09h: Escola Bíblica Dominical
  - 10h: Culto da Manhã 
  - 19h: Culto da Noite
`;

    // Mensagens de acompanhamento atualizadas
    const followUpMessages = [
        // Mensagem 1 (Segunda-feira)
        (name) => `Bom dia, ${name}! ☀️\n\n` +
            "Que esta segunda-feira seja repleta das bênçãos de Deus! 🌟\n" +
            "Iniciamos mais uma semana com fé e esperança no Senhor.\n\n" +
            programacoesSemana +
            "\nQue Deus abençoe sua semana! 🙏\n\n" +
            "_\"As misericórdias do Senhor são a causa de não sermos consumidos, porque as suas misericórdias não têm fim; renovam-se cada manhã. Grande é a tua fidelidade.\"_ \n*Lamentações 3:22-23*",

        // Mensagem 2 (Terça-feira)
        (name) => `Paz do Senhor, ${name}! 🌟\n\n` +
            "Hoje é dia de Corrente de Oração! 🙏\n" +
            "Venha buscar a presença de Deus conosco às 20h.\n\n" +
            programacoesSemana +
            "\nDeus te abençoe! 💖\n\n" +
            "_\"O Senhor está perto de todos os que o invocam, de todos os que o invocam em verdade.\"_ \n*Salmos 145:18*",

        // Mensagem 3 (Quarta-feira)
        (name) => `Olá, ${name}! ✝️\n\n` +
            "Que a paz de Deus esteja em seu coração nesta quarta-feira! 🌟\n" +
            "Continue firme na caminhada com Cristo.\n\n" +
            programacoesSemana +
            "\nConte conosco em oração! 🙌\n\n" +
            "_\"Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.\"_ \n*Jeremias 29:11*",

        // Mensagem 4 (Quinta-feira)
        (name) => `Graça e Paz, ${name}! ☀️\n\n` +
            "Hoje é dia de Culto da Família às 20h! 🕊️\n" +
            "Venha adorar ao Senhor conosco e receber uma palavra de edificação.\n\n" +
            programacoesSemana +
            "\nDeus te abençoe abundantemente! 🙏\n\n" +
            "_\"Como é bom e agradável viverem unidos os irmãos!\"_ \n*Salmos 133:1*",

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
        const brazilDate = new Date(getBrazilDateTime());
        const diaSemana = brazilDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
        const hora = brazilDate.getHours();

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

    const serviceReminderMessage = (name) => {
        const date = new Date();
        const brazilTime = date.toLocaleString("pt-BR", { 
            timeZone: "America/Sao_Paulo",
            hour: 'numeric',
            hour12: false 
        });
        
        // Get hour from Brazil time
        const hora = parseInt(brazilTime);
        
        // Determine greeting based on Brazil time
        const saudacao = hora >= 5 && hora < 12 ? "Bom dia" : 
                         hora >= 12 && hora < 18 ? "Boa tarde" : 
                         "Boa noite";

        // Rest of the function remains the same
        const diaSemana = date.getDay();
        
        let culto;
        if (diaSemana === 0) { // Domingo
            if (hora < 10) {
                culto = "Culto da Manhã às 10h";
            } else if (hora < 19) {
                culto = "Culto da Noite às 19h";
            }
        } else if (diaSemana === 2) { // Terça
            culto = "Culto de Oração às 20h";
        } else if (diaSemana === 4) { // Quinta
            culto = "Culto do Clamor às 20h";
        } else if (diaSemana === 6) { // Sábado
            culto = "Culto de Jovens e Adolescentes às 19h";
        }
    
        if (!culto) return null;
    
        return `${saudacao}, ${name}! 🙏\n\n` +
               `Passando para te lembrar do nosso ${culto} de hoje!\n\n` +
               `Estamos te esperando para juntos adorarmos ao Senhor. ✨\n` +
               `Será um momento especial de comunhão e edificação.\n\n` +
               `Local: Igreja Batista Solidária\n` +
               `Endereço: Rua Aiuruoca nº 327 - Bairro São Paulo\n` +
               `Belo Horizonte, Brazil\n` +
               `CEP: 31910-130\n\n` +
               `_"Alegrei-me quando me disseram: Vamos à casa do Senhor!"_\n` +
               `*Salmos 122:1*\n\n` +
               `Te esperamos! 🤗`;
    };

    const bulkReminderMessage = (name) => {
        const date = new Date();
        const brazilTime = date.toLocaleString("pt-BR", { 
            timeZone: "America/Sao_Paulo",
            hour: 'numeric',
            hour12: false 
        });
        
        const hora = parseInt(brazilTime);
        const saudacao = hora >= 5 && hora < 12 ? "Bom dia" : 
                         hora >= 12 && hora < 18 ? "Boa tarde" : 
                         "Boa noite";

        return `${saudacao}, ${name}! 🙏\n\n` +
               `Que Deus abençoe seu dia! ✨\n\n` +
               `Venha participar de nossos cultos:\n\n` +
               `🕊️ *Nossas programações:*\n` +
               `• *Terças-feiras:* Culto de Oração às 20h\n` +
               `• *Quintas-feiras:* Culto do Clamor às 20h\n` +
               `• *Sábados:* Culto de Jovens e Adolescentes às 19h\n` +
               `• *Domingos:*\n` +
               `  - 09h: Escola Bíblica Dominical\n` +
               `  - 10h: Culto da Manhã\n` +
               `  - 19h: Culto da Noite\n\n` +
               `Local: Igreja Batista Solidária\n` +
               `Endereço: Rua Aiuruoca nº 327 - Bairro São Paulo\n` +
               `Belo Horizonte, Brazil\n` +
               `CEP: 31910-130\n\n` +
               `_"Alegrei-me quando me disseram: Vamos à casa do Senhor!"_\n` +
               `*Salmos 122:1*\n\n` +
               `Te esperamos! 🤗`;
    };

    // Exporta as funções para uso em outros arquivos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            welcomeMessage,
            getMessageByDay,
            serviceReminderMessage,
            bulkReminderMessage
        };
    } else {
        global.welcomeMessage = welcomeMessage;
        global.getMessageByDay = getMessageByDay;
        global.serviceReminderMessage = serviceReminderMessage;
        global.bulkReminderMessage = bulkReminderMessage;
    }
})(typeof window !== 'undefined' ? window : global);