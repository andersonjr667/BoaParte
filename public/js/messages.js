// messages.js - Central de mensagens do sistema

// Função para obter data/hora no Brasil
export function getBrazilDateTime() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function getBrazilHour() {
  return new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: 'numeric',
    hour12: false
  });
}

// Programações da semana atualizadas
export const programacoesSemana = `\n📌 *Programações da igreja:*\n• *Terças-feiras:* Culto de Oração às 20h\n• *Quintas-feiras:* Culto do Clamor às 20h\n• *Sábados:* Culto de Jovens e Adolescentes às 19h\n• *Domingos:* \n  - 09h: Escola Bíblica Dominical\n  - 10h: Culto da Manhã \n  - 19h: Culto da Noite\n`;

// Mensagem inicial de boas-vindas
export function welcomeMessage(name) {
  return `Oi, *${name}*! 🙌

Que alegria ter você com a gente na *Igreja Batista Solidária*! 💛  
Esperamos que você se sinta em casa e volte sempre!

✨ *Nossos cultos:*
• *Domingo – 10h e 19h*  
• Terça – 20h *(Culto de Oração)*  
• Quinta – 20h *(Culto do Clamor)*  
• Sábado – 19h *(Culto dos Jovens)*

📍 Endereço: R. Aiuruoca, 125 – São Paulo, Belo Horizonte – MG, 31910-820

📖 "*Alegrei-me quando me disseram: Vamos à casa do Senhor.*"  
*Salmos 122:1*

Com carinho,
*Igreja Batista Solidária* e *JIBS*`;
}

// Mensagem padrão de lembrete para envio em massa
export function bulkReminderMessage(name) {
  return `Olá, ${name}! 👋
Lembrando que você é muito importante para nós na *Igreja Batista Solidária*!
Venha participar dos nossos cultos e atividades. Esperamos por você!
${programacoesSemana}
Se precisar de oração ou apoio, estamos à disposição. Deus abençoe! 🙏`;
}

// Mensagens de acompanhamento atualizadas
export const followUpMessages = [
  // Mensagem 1 (Segunda-feira)
  (name) => `Bom dia, ${name}! ☀️\n\nQue esta segunda-feira seja repleta das bênçãos de Deus! 🌟\nIniciamos mais uma semana com fé e esperança no Senhor.\n\n${programacoesSemana}\nQue Deus abençoe sua semana! 🙏\n\n_\"As misericórdias do Senhor são a causa de não sermos consumidos, porque as suas misericórdias não têm fim; renovam-se cada manhã. Grande é a tua fidelidade.\"_ \n*Lamentações 3:22-23*`,
  // Mensagem 2 (Terça-feira)
  (name) => `Paz do Senhor, ${name}! 🌟\n\nHoje é dia de Culto de Oração! 🙏\nVenha buscar a presença de Deus conosco às 20h.\n\n${programacoesSemana}\nDeus te abençoe! 💖\n\n_\"O Senhor está perto de todos os que o invocam, de todos os que o invocam em verdade.\"_ \n*Salmos 145:18*`,
  // Mensagem 3 (Quarta-feira)
  (name) => `Olá, ${name}! ✝️\n\nQue a paz de Deus esteja em seu coração nesta quarta-feira! 🌟\nContinue firme na caminhada com Cristo.\n\n${programacoesSemana}\nConte conosco em oração! 🙌\n\n_\"Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.\"_ \n*Jeremias 29:11*`,
  // Mensagem 4 (Quinta-feira)
  (name) => `Graça e Paz, ${name}! ☀️\n\nHoje é dia de Culto do Clamor às 20h! 🕊️\nVenha adorar ao Senhor conosco e receber uma palavra de edificação.\n\n${programacoesSemana}\nDeus te abençoe abundantemente! 🙏\n\n_\"Como é bom e agradável viverem unidos os irmãos!\"_ \n*Salmos 133:1*`,
  // Mensagem 5 (Sexta-feira)
  (name) => `Olá, ${name}! 💝\n\nSexta-feira chegou, e estamos aqui para lembrar que você é muito especial para nossa igreja! 🌟\nPrepare-se para o culto dos jovens amanhã às 19h!\n\n${programacoesSemana}\nQue Deus renove suas forças e te abençoe! 🙌\n\n_\"Tudo posso naquele que me fortalece.\"_ \n*Filipenses 4:13*`,
  // Mensagem 6 (Sábado - 2 horas antes do culto)
  (name) => `Olá, ${name}! 🌟\n\nFaltam apenas 2 horas para o Culto dos Jovens, que começa às 19h! 🕊️\nPrepare seu coração para um momento de adoração, comunhão e renovação espiritual.\n\n${programacoesSemana}\nEsperamos você lá! Que Deus prepare seu coração para receber as bênçãos que Ele tem para você hoje. 🙏\n\n_\"Cheguemos perto de Deus com um coração sincero e com plena convicção de fé.\"_ \n*Hebreus 10:22*`,
  // Mensagem 7 (Sábado - Durante o culto, até 21h)
  (name) => `Olá, ${name}! 🌙\n\nEstamos neste momento no Culto dos Jovens, e você está em nossos pensamentos e orações! 🙏\nSe ainda não chegou, venha participar conosco deste momento especial na presença de Deus.\n\n${programacoesSemana}\nQue o Senhor fale ao seu coração e renove suas forças! 💖\n\n_\"Porque onde estiverem dois ou três reunidos em meu nome, ali eu estou no meio deles.\"_ \n*Mateus 18:20*`,
  // Mensagem 8 (Domingo - 2 horas antes do culto da manhã)
  (name) => `Bom dia, ${name}! ☀️\n\nFaltam apenas 2 horas para o Culto das 10h! 🕊️\nPrepare seu coração para adorar ao Senhor e receber a Palavra que Ele tem para você hoje.\n\n${programacoesSemana}\nEsperamos você lá! Que este culto seja uma bênção para sua vida. 🙏\n\n_\"Entrem por suas portas com ações de graças e em seus átrios com louvor; deem-lhe graças e bendigam o seu nome.\"_ \n*Salmos 100:4*`,
  // Mensagem 9 (Domingo - Durante o culto da manhã, até 12h)
  (name) => `Bom dia, ${name}! 🌟\n\nEstamos neste momento no Culto das 10h, e você está em nossos pensamentos e orações! 🙏\nSe ainda não chegou, venha participar conosco deste momento de adoração e comunhão com Deus.\n\n${programacoesSemana}\nQue o Senhor fale ao seu coração e renove suas forças! 💖\n\n_\"Alegrem-se na esperança, sejam pacientes na tribulação, perseverem na oração.\"_ \n*Romanos 12:12*`,
  // Mensagem 10 (Domingo - 2 horas antes do culto da noite)
  (name) => `Boa tarde, ${name}! 🌤️\n\nFaltam apenas 2 horas para o Culto das 19h! 🕊️\nPrepare seu coração para encerrar o dia na presença do Senhor e renovar suas forças para a semana que vem.\n\n${programacoesSemana}\nEsperamos você lá! Que este culto seja uma bênção para sua vida. 🙏\n\n_\"Vinde, adoremos e prostremo-nos; ajoelhemos diante do Senhor, que nos criou.\"_ \n*Salmos 95:6*`,
  // Mensagem 11 (Domingo - Durante o culto da noite, até 21h)
  (name) => `Boa noite, ${name}! 🌙\n\nEstamos neste momento no Culto das 19h, e você está em nossos pensamentos e orações! 🙏\nSe ainda não chegou, venha participar conosco deste momento de adoração e comunhão com Deus.\n\n${programacoesSemana}\nQue o Senhor fale ao seu coração e renove suas forças! 💖\n\n_\"Porque onde estiverem dois ou três reunidos em meu nome, ali eu estou no meio deles.\"_ \n*Mateus 18:20*`
];

// Função para obter a mensagem do dia
export function getMessageByDay(name) {
  try {
    if (!name) name = 'irmão(ã)';
    const brazilDate = new Date(getBrazilDateTime());
    const diaSemana = brazilDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const hora = brazilDate.getHours();

    // Mensagens específicas para sábado e domingo
    if (diaSemana === 6) { // Sábado
      if (hora >= 17 && hora < 19) {
        return followUpMessages[5](name);
      } else if (hora >= 19 && hora < 21) {
        return followUpMessages[6](name);
      }
    } else if (diaSemana === 0) { // Domingo
      if (hora >= 8 && hora < 10) {
        return followUpMessages[7](name);
      } else if (hora >= 10 && hora < 12) {
        return followUpMessages[8](name);
      } else if (hora >= 17 && hora < 19) {
        return followUpMessages[9](name);
      } else if (hora >= 19 && hora < 21) {
        return followUpMessages[10](name);
      }
    } else if (diaSemana >= 1 && diaSemana <= 4) { // Segunda a quinta
      return followUpMessages[diaSemana - 1](name);
    }

    // Mensagem genérica melhorada para outros horários
    return `Paz do Senhor, ${name}! 🙌\n\nQue a graça de Deus esteja sobre sua vida hoje e sempre!\n\nLembre-se das nossas programações:\n\n${programacoesSemana}\n\nSe precisar de oração ou apoio espiritual, nossa equipe está à disposição. Que o Senhor te guarde e te abençoe ricamente! ✝️\n\n_\"O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e te conceda graça; o Senhor volte para ti o seu rosto e te dê paz.\"_ \n*Números 6:24-26*`;
  } catch (e) {
    console.error('Erro ao gerar mensagem:', e);
    return `Paz do Senhor, ${name}! Que o amor de Deus encha seu coração hoje e sempre. Estamos orando por você! 🙏`;
  }
}

export function serviceReminderMessage(name) {
  const now = new Date();
  // Horário de Brasília
  const brazilNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const diaSemana = brazilNow.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const hora = brazilNow.getHours();
  const min = brazilNow.getMinutes();
  const dia = brazilNow.getDate();
  const mes = brazilNow.getMonth();
  const ano = brazilNow.getFullYear();

  // Funções auxiliares para datas especiais
  function isFirstSunday() {
    // Primeiro domingo do mês
    const first = new Date(ano, mes, 1);
    const offset = (7 - first.getDay()) % 7;
    return dia === 1 + offset;
  }
  function isPenultimateSunday() {
    // Penúltimo domingo do mês
    let last = new Date(ano, mes + 1, 0); // último dia do mês
    let sundays = [];
    for (let d = 1; d <= last.getDate(); d++) {
      let dt = new Date(ano, mes, d);
      if (dt.getDay() === 0) sundays.push(d);
    }
    return dia === sundays[sundays.length - 2];
  }
  function isLastSunday() {
    let last = new Date(ano, mes + 1, 0);
    let sundays = [];
    for (let d = 1; d <= last.getDate(); d++) {
      let dt = new Date(ano, mes, d);
      if (dt.getDay() === 0) sundays.push(d);
    }
    return dia === sundays[sundays.length - 1];
  }

  let evento = '';
  // Segunda (1) e terça (2) até 18h: lembrar do culto de oração terça 20h
  if (
    (diaSemana === 1) ||
    (diaSemana === 2 && hora < 18)
  ) {
    evento = 'Lembrete: Amanhã (terça-feira) às 20h teremos o Culto de Oração! Venha buscar a presença de Deus conosco.';
  }
  // Terça das 18h até quinta 18h: lembrar do culto do clamor quinta 20h
  else if (
    (diaSemana === 2 && hora >= 18) ||
    (diaSemana === 3) ||
    (diaSemana === 4 && hora < 18)
  ) {
    evento = 'Lembrete: Quinta-feira às 20h teremos o Culto do Clamor! Participe desse momento especial de oração.';
  }
  // Quinta das 18h até sábado 17h: lembrar do culto dos jovens sábado 19h
  else if (
    (diaSemana === 4 && hora >= 18) ||
    (diaSemana === 5) ||
    (diaSemana === 6 && hora < 17)
  ) {
    evento = 'Lembrete: Sábado às 19h teremos o Culto dos Jovens! Todos são bem-vindos para adorar conosco.';
  }
  // Sábado das 18h até domingo 7h: lembrar da EBD domingo 9h (exceto 1º domingo)
  else if (
    (diaSemana === 6 && hora >= 17) ||
    (diaSemana === 0 && hora < 7)
  ) {
    if (isFirstSunday()) {
      evento = 'Lembrete: Amanhã é o nosso Café da Manhã especial na igreja! Venha confraternizar conosco a partir das 9h.';
    } else {
      evento = 'Lembrete: Amanhã (domingo) às 9h teremos a Escola Bíblica Dominical! Venha aprender mais da Palavra de Deus.';
    }
  }
  // Domingo das 8h até 17h: lembrar do culto da noite
  else if (diaSemana === 0 && hora >= 8 && hora < 17) {
    if (isPenultimateSunday()) {
      evento = 'Lembrete: Hoje à noite o Culto será dirigido pelos Jovens! Venha prestigiar e adorar conosco às 19h.';
    } else if (isLastSunday()) {
      evento = 'Lembrete: Hoje à noite teremos o Culto de Célula às 19h! Participe desse momento especial de comunhão.';
    } else {
      evento = 'Lembrete: Hoje à noite teremos o Culto das 19h! Venha celebrar conosco.';
    }
  }
  // Fora desses horários, mensagem padrão
  else {
    evento = 'Que a graça e a paz do Senhor estejam com você! Fique atento às nossas programações semanais.';
  }

  return `Paz do Senhor, ${name}! 🙌\n\n${evento}\n\nSua presença é muito importante para nós. Venha adorar ao Senhor conosco e receber a palavra que Ele preparou para seu coração.\n\n📍 *Endereço:* R. Aiuruoca, 125 - São Paulo, Belo Horizonte - MG, 31910-820\n\nQue Deus te abençoe e nos encontremos na Casa do Senhor! ✝️`;
}

// Mensagem de ausência melhorada
export function absent(name) {
  return `Paz do Senhor, ${name}! 💖\n\nNotamos que faz algum tempo que não nos vemos nos cultos. Sentimos muito sua falta!\n\nQueremos lembrar que você é parte importante da nossa família espiritual e estamos aqui para te apoiar no que for necessário.\n\nNossos horários de culto:\n${programacoesSemana}\n\n📍 *Endereço:* R. Aiuruoca, 125 - São Paulo, Belo Horizonte - MG, 31910-820\n\nSe estiver passando por alguma dificuldade ou precisar de oração, por favor nos avise. Estamos orando por você e sua família!\n\n_\"Portanto, confessem os seus pecados uns aos outros e orem uns pelos outros para serem curados. A oração de um justo é poderosa e eficaz.\"_ \n*Tiago 5:16*`;
}

// Mensagem pronta personalizada para GR Sacerdotes
export function grSacerdotesMessage(name) {
    return `Ei, ${name}! 👋 Só passando aqui pra te lembrar que hoje teremos o nosso GR às 19h30 lá na casa do Pr. Thiago.\n\nVai ser um tempo importante com Deus, e sua presença faz muita diferença! Não some não, hein! Tô te esperando lá. 🙏🔥`;
}
