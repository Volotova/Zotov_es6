require: ./redial.js
    type = scriptEs6
    name = Redial

theme: /Redial

    state: CallBackLater
        q!: * $callback *
        scriptEs6:
            const lastCall = (await session()).currentCampaign.isLastAttempt();
            if ((lastCall || await $session.tooLateToRedial) && Utils.counter() > 1) {
                Answer.say("DontCallBack");
                Analytics.setCallStatus("Нет времени");
                Analytics.saveValue("Удобно ли говорить (2я попытка)", "Нет");
                Analytics.saveValue("Удобно ли говорить (2я попытка) Текст", $parseTree.text);
                HangUp.noRedialHangUp();
            } else if (Utils.counter() <= 1) {
                Answer.say("DoYouHaveTime");
            } else {
                Answer.say("CallBackSpecial");
                Analytics.setCallStatus("Нет времени");
                HangUp.redialHangUp();
            }

        state: SpeakNow
            q: * ($yes/$agree) *
            q: $speakNow
            scriptEs6:
                Analytics.saveValue("Удобно ли говорить (2я попытка)", "Да");
                Analytics.saveValue("Удобно ли говорить (2я попытка) Текст", $parseTree.text);
                Utils.retrievalTransition();

        state: DontCallBack
            q: * $disagree *
            q: * (не/ни) до [$AnyWord] (этого/чего/всего/того) *
            q: * (не [очень] удобно/неудобно) *
            q: * {(никогда/$noNeed)} * $weight<1.1>
            q: $noCallsRedial $weight<1.1>
            q: * ($mat/$obscenity) * $weight<+0.1> || fromState = "/Redial/CallBackLater"
            scriptEs6:
                Answer.say("DontCallBack");
                Analytics.setCallStatus("Клиент просит больше не звонить");
                Analytics.saveValue("Удобно ли говорить (2я попытка)", "Нет");
                Analytics.saveValue("Удобно ли говорить (2я попытка) Текст", $parseTree.text);
                HangUp.noRedialHangUp();

        state: JustCallBack
            event: speechNotRecognized
            event: noMatch
            scriptEs6:
                Answer.say("CallBackSpecial");
                Analytics.setCallStatus("Нет времени");
                HangUp.redialHangUp();
