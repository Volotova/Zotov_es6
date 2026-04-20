import Analytics from "../analytics.js"
import Redial from "../redial/redial.js"
import SendCallStatus from "../../integrations/bpm/sendCallStatus.js"

export default {
    hangUp() {
        Answer.addPause(2); 
        $session.botHangUp = true;
        if ($.testContext || $.request.channelType !== "resterisk") {
            $reactions.answer("(Бот повесил трубку)");
            $reactions.transition("/Events_BotHangup"); // Для прогона тестов в чатвиджете, т.к. там не отрабатывает botHangUp
        } else {
            $dialer.hangUp("(Бот повесил трубку)");
        }
    },

    redialHangUp() {
        Utils.noRedial(false);
        this.hangUp();
    },

    noRedialHangUp() {
        Utils.noRedial(true);
        this.hangUp();
    },
    
    async handleHangUp() {
        if (await $session.handleHangUp) return;

        $session.handleHangUp = true;
        // Logger.endMessage();


        const currentCampaign = (await session()).currentCampaign;
        const campaignManager = (await client()).campaignManager;

        if ($session.endedOnError) {
            Logger.info("[handleHangUp] endedOnError");
            // Если ошибка сессии или недозвона - не считаем попытку
            if (!Utils.isIncoming()) {
                $session.currentCampaign.callAttempt--;
            }
            // Не перезваниваем если ошибка в двух звонках подряд
            if (currentCampaign.getLastCall()?.error) {
                Logger.info("[handleHangUp] endedOnError 2 attempts in a row");
                Utils.noRedial(true);
            }
        }
        
        // Если последняя попытка
        if (await $session.tooLateToRedial || currentCampaign.isLastAttempt()) {
            if (Utils.isIncoming()) {
                // Если звонок входящий, то отменяем запланированные звонки и отправляем попытку
                await currentCampaign.cancelNextCallJob();
            }
            Logger.info("[handleHangUp] Campaign is over");
            currentCampaign.isOver = true;
            // TODO настроить и проверить на вызов без await
            await SendCallStatus.sendCallStatus();
        } else {
            Logger.info("[handleHangUp] Campaign is not over");
            Analytics.setCallbackStatus();
            if (!Utils.isIncoming()) {
                await SendCallStatus.sendCallStatus();
                Redial.setRedial();
            }
        }

        if ($.injector?.features?.metrics) {
            await Analytics.setMetricsResults();
        }

        // Обновляем кампанию в client
        await $session.currentCampaign.addCallRecord();
        campaignManager.updateCampaign($session.currentExternalId, $session.currentCampaign); // Передаем ID на случай параллельных сессий
        Logger.info("[HandleHangUp] Campaign manager at the end of call", await $client.campaignManager);
        
        Analytics.setValuesInJaicp();

        Logger.endMessage();
    },
    
    async AASRecognition() {
        const RKCallId = $dialer.getRKCallID();
        Logger.info("[AASRecognition] RKCallId", RKCallId);
        if (!RKCallId) {
            Logger.warn("[AASRecognition] No RKCallId");
            return;
        }
        
        Analytics.saveValue("X-RK-Call-ID", RKCallId);
        const secret = Utils.getSecret("ROBOT_MIA");
        if (!secret) {
            Logger.warn("[AASRecognition] No secret provided");
            return;
        }
        
        const http = new HttpClient().init(
            {
                headers: {
                    "Content-Type": "application/json"
                },
                method: "get",
                url: secret.url,
                params: {
                    "token": secret.token,
                    "id": RKCallId
                },
                timeout: 10000
            }, "RobotMIA", 1
        ).installMask("token");
        let res;
        try {
            res = (await http.execute())?.data;
        } catch (e) {
            Logger.warn(`[AASRecognition] Error calling RobotMIA ${e}`);
            return false;
        }
        

        if (res?.is_rejected_by_scoring) return "predictive";
        else if (res?.is_autoresponder) return "autoresponder";
        else return false;
    }
}