// TODO удаление завершенных кампаний, если есть более поздняя незавершенная

global.CampaignManager = class CampaignManager {
    constructor() {
        this.__className__ = "CampaignManager";
    }
    
    init() {
        this.campaigns = {};
        return this;
    }
    
    /** 
     * @param {string} externalId - id кампании, который требуется указать как последнюю активную
     * Если externalId не указан, то ищет в кампаниях актуальный с предыдущего звонка, если ничего не удалось, то ставит ID = default
     * Если кампании не существует, инициирует ее
     * 
     */
    setActiveId(externalId) {
        let _externalId = externalId;
        if (!_externalId) {
            if (!Utils.isIncoming()) {
                _externalId = $dialer.getPayload().externalId;
            }
            _externalId = _externalId || this.getActiveId() || "default";
        }
        Logger.info("[setActiveId] setting _externalId", _externalId);
        this.active = _externalId;
        return _externalId;
    }

    /**
     * Возвращает кампанию по заданному externalId. Если ее нет, то создает. Старые кампании удаляет
     * @param {string} externalId [optional] - id кампании, который требуется получить
     */
    getOrInitCampaign = function(externalId) {
        let _externalId = externalId || this.getActiveId();
        Logger.info("[getOrInitCampaign] _externalId", _externalId);
        Logger.debug("[getOrInitCampaign] campaigns before check", this.campaigns);
        if (!this.campaigns[_externalId] || (this.campaigns[_externalId].isOver && !Utils.isIncoming())) {
            Logger.debug(`[getOrInitCampaign] no campaign with id ${_externalId} or it's over\nCheck res: ${toPrettyString(this.campaigns[_externalId])}`);
            this.campaigns[_externalId] = new Campaign().init();
            this.deleteOldCampaigns();
        }
        Logger.debug("[getOrInitCampaign] campaigns after check", this.campaigns);
        return this.campaigns[_externalId];
    }
    
    /**
     * Возвращает кампанию по заданному externalId.
     * @param {string} externalId [optional] - id кампании, который требуется получить
     */
    getCampaign = function(externalId) {
        if (!this.campaigns) return;
        let _externalId = externalId || this.getActiveId();
        Logger.debug("[getCampaign] _externalId", _externalId);
        return this.campaigns[_externalId];
    }

    /**
     * Получение последнего активного externalId. 
     * Если он не зафиксирован в переменной, то берем externalId самого позднего звонка 
     * @returns string - external id последнего звонка
     */
    getActiveId = function() {
        if (this.active) {
            return this.active;
        } else {
            let latestCampaignId  = null;
            let latestTimestamp = 0;
            for (const [id, campaign] of Object.entries(this.campaigns)) {
                const lastCall = campaign.getLastCall();
                if (lastCall && lastCall.endTime) {
                    const timestamp = new Date(lastCall.endTime).getTime();
                    if (timestamp > latestTimestamp) {
                        latestTimestamp = timestamp;
                        latestCampaignId = id;
                    }
                }
            }
            return latestCampaignId;
        }
    }
    
    /**
     * Возвращает текущую кампанию
     */
    getCurrentCampaign = function() {
        const activeId = this.getActiveId();
        if (!activeId) return;
        
        return getCampaign(activeId);
    }
    
    
    /**
     * Возвращает кампанию по заданному externalId. Если ее нет, то создает
     * @param {string} externalId [optional] - id кампании, который требуется обновить
     * @param {Campaign} campaign [optional] - экзмемпляр кампании, на который требуется обновить 
     */
    updateCampaign = function(externalId, campaign) {
        this.campaigns[externalId] = campaign;
    }
    
    /**
     * Удаляет все старые кампании
     */
    deleteOldCampaigns = function() {
        if (!this.campaigns) return;
    
        for (const [externalId, campaign] of Object.entries(this.campaigns)) {
            if (campaign?.isOver) {
                Logger.info(`[deleteOldCampaigns] Deleting campaign ${externalId}`);
                delete this.campaigns[externalId];
            }
        }
    }

}

global.Campaign = class Campaign {
    constructor()  {
        this.__className__ = "Campaign";
    }
    
    init(){
        Logger.info("Initializing campaign...")
        this.callAttempt = 0;
        this.callsHistory = [];
        this.payload = {};
        this.data = {};
        this.isOver = false;
        this.callsLimit = 1;

        let dialInfo = {};
        if (!Utils.isIncoming()) {
            this.payload = $dialer.getPayload();
            this.data = parsePayloadData();
            dialInfo = $dialer.getDialHistory();
            this.dialSchedule = $dialer.getCampaignSchedule();
            Logger.info("DIALER CAMPAIGN SCHEDULE", this.dialSchedule);
            Logger.info("DIALER CAMPAIGN HISTORY", dialInfo);
            this.timezoneStr = $dialer.getAbonentTimezone() || "+03:00:00";
            this.timezoneInt = this.setupIntTimezone(this.timezoneStr);
            this.retryIntervals = $dialer.getRetryIntervals();
        } else {
            // Для входящих звонков получаем номер телефона из $dialer.getCaller()
            const callerPhone = $dialer.getCaller();
            if (callerPhone) {
                this.data.phone = callerPhone.toString();
                Logger.info("[Campaign.init] Incoming call, phone set from getCaller()", this.data.phone);
            }
        }

        if (dialInfo && dialInfo.availableAttemptsToPhone) {
            this.callsLimit = Math.floor(dialInfo.availableAttemptsToPhone / 2);
        } else if ($.injector.callsLimit) {
            this.callsLimit = $.injector.callsLimit;
        }

        this.dialSchedule = this.dialSchedule;
        this.callJobInfo = {
            host: getCallJobHost(),
            token: getCallJobToken()
        }
        Logger.info("Initialized campaign", this);
        return this;
    }

    getLastCall() {
        return this.callsHistory.at(-1);
    }

    addCallRecord() {
        const startDateTime = new Date($.session.sessionStartTime).toISOString() || "undefined";
        const endTime = new Date($jsapi.currentTime()).toISOString();
    
        this.callsHistory.push({
            type: $.session.incoming ? "Incoming" : "Outgoing",
            startDateTime,
            endTime,
            error: !!$.session.endedOnError,
            status: $.session.callStatus
        });
    }
    
    getPhone(format) {
        return Utils.formatPhone(format, this.data.phone);
    }
    
    isLastAttempt() {
        if (!Utils.isResterisk() || Utils.testMode()) return false;
        const res = this.callAttempt >= this.callsLimit;
        Logger.info("[isLastAttempt] result", res);
        return res;
    }
        
    // TODO адаптировать под +03:30, а не только цельно-часовые таймзоны
    setupIntTimezone(timezoneStr) {
        Logger.info(`[setupTimezone] Original timezone: ${timezoneStr}`);
        if (!timezoneStr) {
           return 3; 
        }
        
        if (!timezoneStr || !timezoneStr.match(/^[+-]\d{2}:\d{2}(:\d{2})?$/)) {
            log("Invalid timezone format, using MSK");
            return 3;
        }
        
        const sign = timezoneStr[0];
        const hours = parseInt(timezoneStr.slice(1, 3), 10);
        
        const result = (sign === '+') ? hours : -hours;
        Logger.info(`Timezone converted to hours: ${result}`);
        return result; 
    }
    
    async cancelNextCallJob() {
        if (!this.callJobInfo) {
            Logger.warn("[cancelNextCallJob] Couln't cancel call job. NO CALLJOB INFO");
            return;
        }
        
        const reportBaseUrl = `${this.callJobInfo.host}/api/calls/campaign/${this.callJobInfo.token}`
        const httpCalls = new HttpClient().init(
            {
                "baseURL": reportBaseUrl,
                "timeout": 20000,
                "headers": {
                    "Content-Type": "application/json"
                }
            }, "CallsAPI", 2
        )
        
        let body = {
            "phones": [this.data.phone]
        }
        
        const searchRes = await httpCalls.post("/callJob/getReport", body);
        
        
        if (!searchRes || !searchRes.isOk) {
            Logger.warn(`[cancelNextCallJob] Couln't get calls info`);
            return;
        }
        const reports = searchRes.data;
        if (!reports || !reports.length) {
            Logger.info(`[cancelNextCallJob] No reports found`);
            return;
        }
        
        const externalId = this.data?.externalId;
        const callIdsToCancel = reports
            .filter(({ reportData }) =>
                reportData?.externalId === externalId
            )
            .map(({ callJobId }) => callJobId);
        
        if (!callIdsToCancel || !callIdsToCancel.length) {
            Logger.info(`[cancelNextCallJob] No call IDs to cancel`);
            return;
        }
        
        Logger.info(`[cancelNextCallJob] Call IDs to cancel`, callIdsToCancel);
        
        // Отменяем звонки по текущему externalId (последнему callID, который нашли)
        
        body = { "ids": [callIdsToCancel.at(-1)] };
        const deleteRes = await httpCalls.post("/callJob/cancel", body);
        Logger.info(`[cancelNextCallJob] Cancelling result: ${deleteRes?.data}`);
        return deleteRes?.isOk;
    }
}

function getCallJobHost() {
    try {
        let downloadUrl = $.request.data.resterisk.callRecordsDownloadData.downloadUrl;
        return downloadUrl.split("/").slice(0, 3).join("/");
    } catch (e) {
        return "";
    }
}

function getCallJobToken() {
    if ($.request.channelType === "resterisk") {
        return $.request.rawRequest?.originateData?.callScenarioData?.campaignToken;
    }
    return "";
}


/**
 * Преобразовывает payload. Парсит comment, формирует номер телефона, устройство и бренд для использования в сценарии. 
 * Все остальные данные - просто копирует
 * @returns Object - объект с преобразованными данными
 */
function parsePayloadData() {
    if (Utils.isIncoming()) return;
    const data = {};
    const payload = $session.testData?.payload || $dialer.getPayload() || {};
    
    Object.entries(payload).forEach(([key, payloadField]) => {
        const isComment = key === "Comment" || key === "comment";

        if (isComment) {
            const mapping = $.injector.commentMapping;
            const delimiter = mapping?.delimiter || ";";
            const comment = payload.comment || payload.Comment;

            if (mapping?.entities && comment && delimiter) {
                try {
                    const commentSplitted = comment.split(delimiter);
                    
                    commentSplitted.forEach((entity, index) => {
                        const fieldName = mapping.entities[index];
                        if (fieldName) {
                            data[fieldName] = entity;
                        }
                    });
                } catch (e) {
                    Logger.warn(
                        `[parsePayloadData] Couldn't parse payload data by mapping: ${e}`
                    );
                }
            } else {
                data[key] = payloadField;
            }
        } else {
            data[key] = payloadField;
        }
    });
    

    // Получение номера телефона
    data.phone = (data.phone || payload.phone || $dialer.getCaller() || "0000000000").toString();

    // Значения по умолчанию
    data.device ||= $.injector.defaultValues?.device;

    // Получение бренда
    if (data.device && !data.brand) {
        const device = data.device.toLowerCase();

        if (device.includes("solid")) data.brand = "LIL SOLID";
        else if (device.includes("hybrid")) data.brand = "LIL HYBRID";
        else data.brand = "IQOS";
    }
    

    data.brand ||= $injector.defaultValues?.brand;
    if (data.name) {
        data.markedName = Utils.getMarkedName(data.name);
    }

    Logger.info("Parsed payload", data);
    return data;
};

async function initCampaigns() {
    // Инициализация CampaignManager для пользователя
    (await client()).campaignManager ||= new CampaignManager().init();
    Logger.info("[initCampaigns] CampaignManager", await $client.campaignManager);
    // Получение активного externalId
    Logger.debug("[initCampaigns] Setting active ID");
    $session.currentExternalId = (await client()).campaignManager.setActiveId();
    Logger.info("[initCampaigns] currentExternalId", await $session.currentExternalId);
    $analytics.setSessionData("externalId", $session.currentExternalId);

    // Обеспечение доступа по ссылке
    Logger.debug("[initCampaigns] Getting currentCampaign");
    $session.currentCampaign = (await client()).campaignManager.getOrInitCampaign();

    if (!Utils.isIncoming()) {
        Logger.info("[initCampaigns] Outgoing call");
        await $session.currentCampaign.callAttempt++;
    } else {
        Logger.info("[initCampaigns] Incoming call");
    }
    Logger.info("[initCampaigns] currentCampaign", await $session.currentCampaign);
}

global.campaign = async function() {
    if (!await $session.currentCampaign) {
        await initCampaigns()
    }
    return await $session.currentCampaign;
}

export default { initCampaigns }