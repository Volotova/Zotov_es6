import moment from "moment";

global.go = function(param) {
    $reactions.transition(param);
}

global.changeState = function(state) {
    $reactions.transition({value: state, deferred: true});
}

global.Utils = {
    
    /**
     * Получение последнего активного externalId. 
     * Если он не зафиксирован в переменной, то берем externalId самого позднего звонка 
     * @param {string} externalId [optional] - id кампании, который требуется получить
     * @returns string - external id последнего звонка
     */


    /**
     * Проверка на телефонный канал 
     * @returns {boolean} - true, если это тлф канал, иначе - false  
     */
    isResterisk() {
        return ($.request.channelType === "resterisk");
    },

    /**
     * Проверка на входящий звонок в телефонном канале
     * @returns {boolean} - true, если это тлф канал и звонок входящий, иначе - false  
     */
    isIncoming() {
        try {
            return this.isResterisk() && $.request.data.resterisk.incoming;
        } catch (e) {
            log(`[isIncoming] Error: ${e}`);
            return false;
        }
    },

    /**
     * Получение числового представления локального времени клиента
     * @returns {int} - целое число, соответствующее часу в таймзоне клиента  
     */
    getLocalHour() {
        try {
            const campaignTimezone = $session.currentCampaign?.timezoneStr || "+03:00";
            return moment
                .utc($jsapi.currentTime())
                .utcOffset(campaignTimezone)
                .hour();
        } catch(e) {
            Logger.warn("[getCurrentHour()] NO TIMEZONE. Setting manually");
            const campaignTimezoneInt = $session.currentCampaign?.timezoneInt || 3;
            return moment
                .utc($jsapi.currentTime())
                .add(campaignTimezoneInt, 'hours')
                .hour();

        }
    },

    getLocalDate() {
        try {
            const campaignTimezone = $session.currentCampaign?.timezoneStr || "+03:00";
            return moment
                .utc($jsapi.currentTime())
                .utcOffset(campaignTimezone)
                .format("DD.MM.YYYY");
        } catch(e) {
            Logger.warn("[getLocalDate()] NO TIMEZONE. Setting manually");
            const campaignTimezoneInt = $session.currentCampaign?.timezoneInt || 3;
            return moment
                .utc($jsapi.currentTime())
                .add(campaignTimezoneInt, 'hours')
                .format("DD.MM.YYYY");
        }
    },

    /**
     * Проверка на автотест
     * @returns {bool} - true, если вызвана из тестовой среды (в автотестах), иначе - false  
     */
    testMode() {
        return !!$.testContext;
    },
    
    /**
     * Счетчик вызова с инкрементацией
     * @param {string} param [optional] - id счетчика, по дефолту равен текущему стейту
     * @returns {int} - номер вызова функции с этим параметром
     */
    counter(param) {
        const key = param || $.currentState;
        $.session.counter ||= {};
        $.session.counter[key] ||= 0;
        $.session.counter[key] += 1;
        return $.session.counter[key];
    },

    /**
     * Счетчик вызова попаданий в стейт подряд с инкрементацией
     * @param {string} param [optional] - id счетчика, по дефолту равен текущему стейту
     * @returns {int} - номер вызова функции с этим параметром
     */
    counterInARow(param) {
        const key = param || $.currentState;
        $.session.counterInARow ||= {};
        $.session.counterInARow[key] ??= { value: 0, changed: false };
        const byKey = $.session.counterInARow[key];
        byKey.value += 1;
        byKey.changed = true;
        $.session.counterInARow[key] = byKey;
        return byKey.value;
    },
    
    /**
     * Счетчик вызова без инкрементации
     * @param {string} param [optional] - id счетчика, по дефолту равен текущему стейту
     * @returns {int} - номер вызова функции с этим параметром
     */
    getCounter(param) {
        const key = param || $.currentState;
        if ($.session.counter) {
            return $.session.counter[key];
        } else {
            return false;
        }
    },
    
    /**
     * Преобразование номера в нужный формат
     * @param {string} format - название формата. Может быть равен "seven", "eight", "plus"
     * @param {string} phone - номер телефона для преобразования
     * @returns {string} - номер телефона в запрошенном формате
     */
    formatPhone(format, phone) {
        phone = (phone || $dialer.getCaller() || "0000000000").toString().slice(-10);
        switch (format) {
            case "seven":
                return "7" + phone;
            case "eight":
                return "8" + phone;
            case "plus":
                return "+7" + phone;
            default:
                return phone;
        }
    },

    /**
     * Универсальная функция. Берет номер телефона из кампании или из dialer 
     * @param {string} format - название формата. Может быть равен "seven", "eight", "plus"
     * @returns {string} - номер телефона в запрошенном формате
     */
    getPhone(format) {
        return this.formatPhone(format, $.session.currentCampaign?.data?.phone);
    },
    
    /**
     * Фиксирование стейта для возврата
     * @param {string} state - путь до стейта. По дефолту берется вложенный
     * @param {boolean} deferred - отложенность перехода. По дефолту - false
     */
    setRetrievalState(value = $.currentState, deferred = false) {
        $session.stateForRetrieval = {value, deferred};
    },

    /** 
     * Функция возврата в контекст, указанный в stateForRetrieval 
     */
    retrievalTransition() {
        // Известно, что будет ошибка, если stateForRetrieval отсутствует. Сделано специально.
        $reactions.transition($session.stateForRetrieval);
    },
    
    /**
     * Клонирование объекта
     * @param {any} obj - ссылка на объект, который нужно клонировать
     * @returns {any} - ссылка на клонированный объект
     */
    cloneDeep(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    /**
     * Возвращает историю сообщений в сессии
     * @param {int} lastPhrasesNum [optional] - количество последних сообщений, которое нужно включить в результат. 
     * Если не указан - ограничения на количество не ставятся
     * @param {bool} includeQuery - нужно ли включать последнее сообщение пользователя в выгрузку
     * @returns {string} - история сообщений в сессии в строковом представлении
     */
    async getFullChatHistory(lastPhrasesNum = false, includeQuery = false) {
        let chatHistoryArray = this.cloneDeep(await $session.chatHistory);
        if (!chatHistoryArray) {
            Logger.warn("[getFullChatHistory] Couldn't get ChatHistory");
            return "";
        }
        if (!includeQuery) chatHistoryArray.pop();
        if (lastPhrasesNum) chatHistoryArray = chatHistoryArray.slice(lastPhrasesNum * (-1));
        if (chatHistoryArray) {
            return chatHistoryArray.join("\n");
        } else {
            Logger.warn("[getFullChatHistory] Couldn't get ChatHistory after filter");
            return "";
        }
    },
    
    /**
     * Обновление значения tooLateToRedial
     * @param {boolean} newValue - новое значение tooLateToRedial
     */
    noRedial(newValue) {
        $session.tooLateToRedial = newValue;
        Logger.info(`TooLateToRedial is set to ${JSON.stringify(newValue)}`);
    },

    getSecret(secretName) {
        $session.secrets ||= {};
        if ($.session.secrets[secretName]) return $.session.secrets[secretName];

        let secret = $secrets.get(secretName, null);
        if (!secret) {
            Logger.warn(`[getSecret] couldn't get secret with name ${secretName}`);
            return;
        }
        try {
            secret = JSON.parse(secret);
        } catch (e) {
            Logger.info(`[getSecret] Couldn't parse secret ${secretName}`);
        }
        $.session.secrets[secretName] = secret;
        return secret;
    },

    getMarkedName(name) {
        try {
            return $MarkedNames[name];
        } catch (e) {
            Logger.info("[getMarkedName] Couldn't get marked name from dict");
        }
    },
    
    isLastAttempt() {
        return sessionSync().currentCampaign?.isLastAttempt();
    }
};

export default {}