require: ./hangUp.js
    type = scriptEs6
    name = HangUp

theme: /
    state: NotConnected
        event!: onCallNotConnected
        scriptEs6:
            await Init.initSession();
            Analytics.setCallStatus("");
            await HangUp.handleHangUp();

    state: NotConnectedTechnical
        event!: onCallNotConnectedTechnical
        scriptEs6:
            await Init.initSession();
            const isAAS = await HangUp.AASRecognition(); 
            
            if (isAAS == "predictive") {
                $reactions.transition("/AASPredictive");
            } else if (isAAS == "autoresponder") {
                $reactions.transition("/Autoresponder");
            } else {
                $session.endedOnError = true;
                Analytics.setCallStatus("Ошибка");
                await HangUp.handleHangUp();
            }

    state: Autoresponder
        q!: $autoresponder
        scriptEs6:
            Analytics.setCallStatus("Автоответчик");
            Analytics.saveValue("Автоответчик", "Да");
            HangUp.redialHangUp();
    
    state: AASPredictive
        scriptEs6:
            Analytics.setCallStatus("Отклонено по предиктиву");
            HangUp.noRedialHangUp();

    state: Events_BotHangup
        q!: $regexp</eventBotHangUp>
        event!: botHangup
        scriptEs6:
            if (!(await $session.isInitialized)) {
                Logger.warn("INCORRECT STARTING. HANGUP BEFORE [NOT] CONNECT");
                $reactions.transition("/NotConnectedTechnical");
            } else {
                try {
                    await handleBotHangUp();
                } catch (e) {
                    Logger.info("[Events_BotHangup] No custom handleBotHangUp function");
                }
                await HangUp.handleHangUp();
            }

    state: Events_ClientHangup
        q!: $regexp</eventClientHangUp>
        event!: hangup
        scriptEs6:
            if (!(await $session.isInitialized)) {
                Logger.warn("INCORRECT STARTING. HANGUP BEFORE [NOT] CONNECT");
                $reactions.transition("/NotConnectedTechnical");
                return;
            }
            const isAAS = await HangUp.AASRecognition(); 
            if (isAAS == "predictive") {
                $reactions.transition("/AASPredictive");
            } else if (isAAS == "autoresponder") {
                $reactions.transition("/Autoresponder");
            } else {
                // TODO TEST
                try {
                    await handleClientHangUp();
                } catch (e) {
                    Logger.info("[Events_ClientHangup] No custom handleClientHangUp function");
                }
                await HangUp.handleHangUp();
            }