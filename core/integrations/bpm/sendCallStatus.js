import { getBpmHttpClient } from "./basis.js"

export default {
    /**
     * 
     * @param {string} callStatus - статус звонка, который надо направить в BPM, по умолчанию берется из session
     * @returns {boolean} - true - если запрос успешно выполнен
     */
    async sendCallStatus(callStatus = $.session.callStatus) {
        Logger.info("[sendCallStatus] Function started...");
        $.session.bpmHttpClient ||= await getBpmHttpClient();
        const bpmClient = (await session()).bpmHttpClient?.clone("BPM. Send Call Status");
        if (!bpmClient) {
            Logger.warn("[sendCallStatus] Couldn't get BPM Http Client instance");
            return false;
        }
        
        const externalId = $.session.currentExternalId;
        if (!callStatus) {
            callStatus = "Завершен без ответа";
        }

        const ATSCode = callStatus?.includes("Автоответчик") ? "Завершен / Завершен без ответа" : "Завершен";
        let subject = "Исходящий звонок";
        // TODO уточнить у PMI насколько необходимо такое разделение
        if ($.injector.project === "Trans") {
            subject = "NPS Survey Voice Bot Call_Main_Delight 1"
        }
        
        const data = {
            "Telephony": "Voicebot",
            "Subject": subject,
            "ActivityCode": externalId,
            "ATSCode": ATSCode,
            "CallStatus": callStatus,
            "Attemptstarttime": $.session.sessionStartTime
        }

        return await bpmClient.post("/rest/outgoingCall/create", data);
    }
}