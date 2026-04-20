import LLM from "../llm/utils.js"

export default {
    setRedial(_startDateTime) {
        if (!Utils.isResterisk()) return;
        if (!$.session.setRedial) {
            const campaign = $session.currentCampaign;
            const dialSchedule = campaign.dialSchedule;
            Logger.info("[setRedial] dialSchedule", dialSchedule);
            let startDateTime;
            if (_startDateTime) {
                startDateTime = new Date(_startDateTime);
                Logger.info("[setRedial] Using provided startDateTime", startDateTime);
            } else {
                const retryIntervals = campaign.retryIntervals;
                const defaultRedialTime = retryIntervals?.retryIntervalInMinutes || retryIntervals?.campaignRetryIntervalInMinutes || 60;
                const now = new Date();
                startDateTime = new Date(now.getTime() + (defaultRedialTime * 60000));
                Logger.info(`Calculated redial time: ${startDateTime} (in ${defaultRedialTime} minutes)`);
            }
            const redialObj = {
                startDateTime: startDateTime,
                allowedTime: dialSchedule?.allowedTime
            }
            Logger.info(`Setting redial: ${JSON.stringify(redialObj)}`);
            $dialer.redial(redialObj);
            $.session.setRedial = true;
            Logger.info("Redial scheduled successfully");
        }
    },
    
    async detectRecallRequest() {
        const now = new Date();
        const weekdays = [
            "воскресенье",
            "понедельник",
            "вторник", 
            "среда",
            "четверг",
            "пятница",
            "суббота"
        ];
        
        // Корректируем текущее время с учетом таймзоны абонента (для LLM)
        const timezoneInt = await $session.currentCampaign?.timezoneInt || 3;
        const abonentNow = new Date(now.getTime() + (timezoneInt || 0) * 60 * 60 * 1000);
        const currentWeekday = weekdays[abonentNow.getDay()];
        const nowStr = abonentNow.toISOString(); // Передаем LLM время абонента
        
        const promptContext = {
            currentWeekday: currentWeekday,
            nowStr: nowStr,
            chatHistory: await Utils.getFullChatHistory(10, true)
        };
        
        const prompt = LLM.renderTemplate($CommonPrompts.GetRedialTime, promptContext);
        
        const validateResult = (r) => {
            if (typeof r !== "object" || r === null) return false;
            if (typeof r.callRequested !== "boolean") return false;

            // Проверяем корректность даты, если есть
            if (r.callRequested && r.datetimeISO) {
                const d = new Date(r.datetimeISO);
                if (isNaN(d.getTime())) return false;
                
                // Дополнительная проверка: дата должна быть в будущем относительно времени абонента
                if (d <= abonentNow) {
                    return false;
                }
            }
            return true;
        };
        const llmConfig = {
            url: "https://caila.io/api/mlpgate/account/just-ai/model/openai-proxy/predict",
            body: {model: "gpt-4o"}
        }
        const result = await LLM.simpleCall(prompt, 2, true, validateResult, llmConfig);

        let datetime = null;
        let overLimit = false;
        
        if (!result) return false;

        if (result.callRequested && result.datetimeISO) {
            const d = new Date(result.datetimeISO);
            if (!isNaN(d.getTime())) {
                // Проверяем лимит еще раз (на всякий случай)
                const oneWeekLater = new Date(abonentNow.getTime() + 7 * 24 * 60 * 60 * 1000);
                if (d > oneWeekLater) {
                    overLimit = true;
                    log(`Callback requested too far in future: ${result.datetimeISO} (over 1 week limit)`);
                } else {
                    datetime = new Date(d.getTime() - (timezoneInt || 0) * 60 * 60 * 1000);
                    log(`Date adjusted from LLM: ${result.datetimeISO} -> UTC: ${datetime.toISOString()}`);
                }
            }
        }
        
        Logger.info(`Call request detection result: ${JSON.stringify({
            callRequested: result.callRequested,
            datetimeLLM: result.datetimeISO,
            datetimeUTC: datetime?.toISOString(),
            overLimit: overLimit,
            timezone: timezoneInt
        })}`);
        
        return {
            callRequested: result.callRequested,
            datetime: overLimit ? "overLimit" : datetime,
            overLimit: overLimit
        };
    },


}