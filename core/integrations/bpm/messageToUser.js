import { getBpmHttpClient } from "./basis.js"

async function getConsumerOrContacts() {
    $.session.bpmHttpClient ||= await getBpmHttpClient();
    const bpmClient = (await session()).bpmHttpClient?.clone("BPM. Get Consumer Or Contacts");
    if (!bpmClient) {
        Logger.warn("[getConsumerOrContacts] Couldn't get BPM Http Client instance");
        return false;
    }

    const url = `/ServiceModel/consumer/getConsumerOrContacts?PhoneNumber=${Utils.getPhone("seven")}`
    return await bpmClient.get(url);
}

async function createUserTrackAction() {
    $.session.bpmHttpClient ||= await getBpmHttpClient();
    const bpmClient = (await session()).bpmHttpClient?.clone("BPM. Get Consumer Or Contacts");
    if (!bpmClient) {
        Logger.warn("[createUserTrackAction] Couldn't get BPM Http Client instance");
        return false;
    }

    const timeStamp = new Date().toISOString();
    const smsCode = Utils.getSecret("SMS_CODE")?.code;
    const data = {
        "$type": "PMI.BDDM.Staticdata.UserTrackAction",
        "EndDate": timeStamp,
        "StartDate": timeStamp,
        "User": {
            "$type": "PMI.BDDM.StaticData.ADUserReference",
            "Code": smsCode,
            "CodeSpace": "ActiveDirectory"
        },
        "Application": {
            "Code": "B2CCRM",
            "Name": "B2C CRM"
        },
        "Category": {
            "Code": "SendActDevicesReturn",
            "Name": "Отправка клиенту акта возврата аренды"
        },
        "CreatedBy": {
            "$type": "PMI.BDDM.StaticData.ADUserReference",
            "Code": smsCode,
            "CodeSpace": "ActiveDirectory"
        },
        "UpdatedBy": {
            "$type": "PMI.BDDM.StaticData.ADUserReference",
            "Code": smsCode,
            "CodeSpace": "ActiveDirectory"
        }
    };
    
    bpmClient.installMask("Code");
    return await bpmClient.post("/ServiceModel/userTrackAction/create", data);
}

async function consumerCommunicationRequest(messageObj, consumerData, trackActionData) {
    if (!messageObj || !consumerData || !trackActionData) {
        Logger.warn("[consumerCommunicationRequest] No required data provided", {messageObj, consumerData, trackActionData});
        return false;
    }

    $.session.bpmHttpClient ||= await getBpmHttpClient();
    const bpmClient = (await session()).bpmHttpClient?.clone("BPM. Get Consumer Or Contacts");
    if (!bpmClient) {
        Logger.warn("[consumerCommunicationRequest] Couldn't get BPM Http Client instance");
        return false;
    }

    const smsCode = Utils.getSecret("SMS_CODE")?.code;
    const data = {
        "$type": "PMI.BDDM.Transactionaldata.ConsumerCommunicationRequest",
        "BusinessDomain": "RRP",
        "PreferredCommunicationChannel": "SMS",
        "CommunicationText": messageObj.text || "",
        "CommunicationLink": messageObj.link || "",
        "Consumer": consumerData,
        "Type": {
            "Code": "FreeFormCommunicationVoiceBot",
            "Name": "Коммуникация в свободной форме Voice Bot"
        },
        "CreatedBy": {
            "$type": "PMI.BDDM.StaticData.ADUserReference",
            "Code": smsCode,
            "CodeSpace": "ActiveDirectory"
        },
        "UpdatedBy": {
            "$type": "PMI.BDDM.StaticData.ADUserReference",
            "Code": smsCode,
            "CodeSpace": "ActiveDirectory"
        },
        "Basis": {
            $type: trackActionData.$type,
            Code: trackActionData.Code,
            CodeSpace: trackActionData.CodeSpace
        }
    };

    bpmClient.installMask("Code");
    return await bpmClient.post("/ServiceModel/consumerCommunicationRequest/create", data)

}

export default {
    /**
     * Проводит интеграционную цепочку по отправке сообщения пользовалю
     * @param {string} messageOrId - ID сообщения в словаре $Messages или 
     * @param {string} name (optional) - имя, которое нужно подставить в сообщение
     * @returns {boolean} - true, если сообщение успешно отправлено
     */
    async sendMessage(messageOrId, name) {
        // Setting message content
        if (!messageOrId) {
            Logger.warn("[sendSms] No messageOrId provided");
            return false;
        }
        let messageObj;
        try { 
            messageObj = $Messages[messageOrId];
        } catch (e) {};
        messageObj ||= {text: messageOrId};
        messageObj.link ||= "";
        if (name) {
            const text = messageObj.text;
            messageObj.text = `${capitalize(name)}, ${text[0].toLowerCase() + text.slice(1)}`
        }

        // Getting consumer data
        let consumerData = await getConsumerOrContacts();
        consumerData = consumerData?.data?.Consumer || consumerData?.data?.Contacts?.[0];
        if (!consumerData) {
            Logger.warn("[sendSms] Couldn't get consumer data");
            return false;
        }

        // Creating track action
        let trackActionData = (await createUserTrackAction())?.data;
        if (!trackActionData) {
            Logger.warn("[sendSms] Couldn't create track action");
            return false;
        }

        // Communication request
        const res = await consumerCommunicationRequest(messageObj, consumerData, trackActionData);
        return res?.isOk;
    }
}