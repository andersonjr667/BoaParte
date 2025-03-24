// Client-side messages utility
function welcomeMessage(name) {
    const date = new Date();
    const hora = date.getHours();
    
    const saudacao = hora >= 5 && hora < 12 ? "Bom dia" :
                    hora >= 12 && hora < 18 ? "Boa tarde" :
                    "Boa noite";

    return `${saudacao}, ${name}! Graça e Paz do Senhor Jesus!\n\n` +
           "Seja muito bem-vindo(a) à Igreja Batista Solidária! A Juventude da Igreja Batista Solidária (JIBS) também celebra a sua chegada e se alegra em recebê-lo(a). É uma honra tê-lo(a) conosco e agradecemos por compartilhar seu contato.\n\n" +
           "Que este momento seja especial em sua vida e que você se sinta acolhido(a) e abençoado(a) por Deus. Estamos aqui para caminhar ao seu lado e auxiliar no que for preciso.\n\n" +
           "Que o Senhor renove sua paz, sua alegria e sua esperança hoje e sempre!\n\n" +
           "Com carinho,\n" +
           "Juventude da Igreja Batista Solidária (JIBS) e Igreja Batista Solidária";
}

// Export for browser environment
window.welcomeMessage = welcomeMessage;
