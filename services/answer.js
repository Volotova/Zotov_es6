// import Utils from "./utils.js"

function _pushReply(ans, isText, bargeIn) {
    if (Array.isArray(ans)) {
        ans.forEach(elem => _pushReply(elem, isText));
    } else {
        if (isText) {
            _text(ans, bargeIn);
        } else {
            _audio(_makeS3Link(ans), bargeIn);
        }
    }
}

function _audio(link, bargeIn) {
    if (!bargeIn) bargeIn = "disable";
    _createReply({
        type: "audio",
        audioUrl: link,
        bargeIn: bargeIn
    })
}

function _text(str, bargeIn) {
    if (!bargeIn) bargeIn = "disable";
    _createReply({
        type: "text",
        text: str,
        bargeIn: bargeIn
    })
}

function _createReply(data) {
    $.temp.answers ||= [];
    $.temp.answers.push(data);
}

function _makeS3Link(fileName) {
    return "https://da44184b-a8f4-434f-a8c4-6aedbc097087.selstorage.ru/" + fileName;
}

global.Answer = {
    addPause(sec) {
        const pauseLengthInSec = sec || 1;
        if (Utils.testMode() || !Utils.isResterisk()) {
            _text("(пауза " + pauseLengthInSec + " сек)");
        } else {
            for (let i = 0; i < pauseLengthInSec; i++) {
                _audio(_makeS3Link("silence1sec_new.wav"));
            }
        }
    },
    
    // TODO описать в доке структуру словаря
    say(state, bargeIn) {
        state ||= $.currentState.split("/").at(-1);
        let answerData = $Answers[state];
        if (!answerData) {
            Logger.warn(`[getAnswerData] Couldn't get answer data for state ${state}`);
            return false;
        }
        if (Array.isArray(answerData)) {
            const key = `Answer_${state}`;
            let attempt = Utils.counter(key);
            if (attempt > answerData.length) {
                attempt = 1;
                $.session.counter[key] = 1;
            }
            answerData = answerData[attempt - 1];
        }
        this.fromObject(answerData, bargeIn);
        return true;
    },

    fromObject(answerData, bargeIn)  {
        const answerType = answerData?.type;
        if (answerType == "brand") {
            const brand = $.session.currentCampaign?.data?.brand || $.session.userInfo?.brand || "IQOS";
            answerData = answerData[brand];
            if (!answerData) {
                Logger.warn(`[Answer.say] No answer found for brand ${brand}`);
                return;
            }
        }

        if (answerType == "device") {
            const device = $.session.currentCampaign?.data?.device || $.session.userInfo?.device || "IQOS";
            answerData = answerData[device];
            if (!answerData) {
                Logger.warn(`[Answer.say] No answer found for device ${device}`);
                return;
            }
        }

        if (answerType == "name") {
            const markedName =  $.session.currentCampaign?.data?.markedName || $.session.userInfo?.markedName;
            if (markedName) {
                return this.imputer(answerData.nameTemplate, {"firstName": markedName});
            }
            answerData = answerData.default;
        }

        $session.chatHistory = $session.chatHistory || [];
        $session.chatHistory.push(`BOT: ${answerData.text || answerData.tts}`);

        if ($.injector.textReplies) {
            _pushReply(answerData.tts, true, bargeIn)
        } else {
            if (answerData.audio) {
                _pushReply(answerData.audio, false, bargeIn)
            } else {
                _pushReply(answerData.tts, true, bargeIn);
            }
        }
    },
    
    common(state, context, bargeIn) {
        if (!$commonAnswers[state]) {
            Logger.warn("[Answer.common] Couldn't find answer with provided state", state);
            return;
        }
        context ||= $.contextPath.split("/")?.at(-1);
        let answerData = $commonAnswers[state][context];
        if (!answerData) {
            Logger.warn("[Answer.common] Couldn't find answer for provided context", {state, context});
            return;
        }
        if (Array.isArray(answerData)) {
            const key = `CommonAnswer_${state}_${context}`;
            let attempt = Utils.counter(key);
            if (attempt > answerData.length) {
                attempt = 1;
                $.session.counter[key] = 1;
            }
            answerData = answerData[attempt - 1];
        }
        this.fromObject(answerData, bargeIn);
        return true;
    },
    
    /*
    Функция для генерации ссылки на аудио на гибридном синтезе
    - template (string) - название шаблона
    - params (object) - ключ: название переменной; значение - значение переменной
    */
    imputer(template, params, bargeIn) {
        if (Utils.testMode()) {
            $reactions.answer(template);
        } else {
            let paramsString = Object.keys(params).map(key => `${key}=${params[key]}`).join('&');
            let imputerUrl = $.injector.imputerAPI || "https://app.jaicp.com/api/imputer/p/fGNfXwTB:6593da7b95df1b7a3e8e6b68efc0fb582c5f184a/imputing/";
            let voiceSpeed = $.injector.voiceSpeed || 1;
            let imputerLink = `${imputerUrl}generate-audio?voiceSpeed=${voiceSpeed}&replicaTemplateId=${template}&${paramsString}`;
            Logger.info("Imputer link", imputerLink);
            _audio(imputerLink, bargeIn);
        }
    }
    
}

export default {};