# Brokê na App Store: guia e situação

Este guia diz o que já está pronto, o que falta e a ordem dos passos. A publicação em si exige um Mac e uma conta Apple paga, então não dá para fazer só daqui.

## O que já está pronto no projeto
- Ícone 1024×1024 (sem transparência) e tela de abertura roxa com a nova logo: `mobile/resources/icon.png` e `splash.png`.
- Casca nativa (Capacitor) configurada: `mobile/capacitor.config.json` aponta para o site em produção.
- Textos de permissão (câmera, fotos, localização): `mobile/Info.plist.trechos.txt`.
- Exclusão de conta dentro do app (exigência 5.1.1(v)): cliente é apagado na hora; lojista e entregador viram pedido para o admin (SQL 23).
- Botão "Entrar com Apple" pronto (exigência 4.8): aparece quando `NEXT_PUBLIC_APPLE_LOGIN=1` e o Apple estiver configurado no Supabase.
- Política de Privacidade e Termos publicados em `/privacidade` e `/termos`.

## O que falta (por você ou por mim, nesta ordem)
1. **Conta Apple Developer Program**: US$ 99 por ano, em developer.apple.com/programs. Leva de horas a dias para aprovar (pessoa física precisa de documento; empresa precisa de CNPJ e número D-U-N-S).
2. **Um Mac com Xcode** (ou um serviço de Mac na nuvem, como Codemagic ou MacinCloud).
3. **Entrar com Apple**: criar o "Services ID" e a chave no portal da Apple, preencher no Supabase (Authentication > Providers > Apple) e colocar `NEXT_PUBLIC_APPLE_LOGIN=1` na Vercel. Sem isso a Apple recusa o app, porque ele só tem login com Google.
4. **Avisos no celular (push)**: no site, o aviso usa Web Push, que **não funciona dentro do app nativo do iPhone**. Para o app é preciso push nativo (APNs): ativar Push Notifications na conta Apple, criar a chave APNs e trocar o envio do servidor para APNs/FCM. É um trabalho à parte e importante, porque o entregador depende do aviso de corrida.
5. **Conta de teste para a Apple revisar**: eles precisam entrar no app. O login só com Google pode travar a revisão. Use as contas de teste (entregador e lojista) e informe e-mail e senha nas "Notas para revisão". Se a Apple não conseguir entrar com Google, uma opção é criar um login por e-mail e senha só para revisão.
6. **Gerar o app** (no Mac): `cd mobile`, `npm install`, `npm run ios:add`, `npm run assets`, `npm run sync`, `npm run abrir`. No Xcode: escolher o time (sua conta), o Bundle ID (troque `br.com.broke.app` pelo definitivo antes de criar o app, porque não muda depois), colar os textos do `Info.plist.trechos.txt` e arquivar (Product > Archive).
7. **App Store Connect**: criar o app, subir o build pelo Xcode, preencher descrição, categoria (Comida e bebida), capturas de tela (iPhone 6,9" e 6,5"), URL de suporte, URL da política de privacidade e o questionário de privacidade (dados coletados: nome, e-mail, telefone, localização, fotos, documentos, compras).

## Riscos de recusa (seja realista)
- **Diretriz 4.2 (funcionalidade mínima)**: a Apple recusa app que é só um site dentro de uma moldura. O que ajuda: push nativo, câmera, localização e o fluxo de entrega. Sem o push nativo (item 4), a chance de recusa é alta.
- **Localização**: usamos só "ao usar o app". Não peça "sempre" sem necessidade, a Apple pergunta o motivo.
- **Pagamentos**: Pix e cartão para comida e entrega são permitidos, sem compra dentro do app da Apple.
- **Documentos e selfie**: a Apple lê a política de privacidade. Ela já cita consentimento, área privada e exclusão.
- Se o app tiver só o lado do cliente, o lojista e o entregador podem entrar pelo site. Dá para publicar dois apps (cliente e parceiros), o que costuma facilitar a revisão.

## Caminho mais rápido: Android primeiro
O Google Play aceita o site instalável (PWA) como app via "Trusted Web Activity", custa US$ 25 uma única vez e o push do site continua funcionando. É o jeito mais rápido de ter o Brokê numa loja de apps enquanto o iPhone é preparado.
