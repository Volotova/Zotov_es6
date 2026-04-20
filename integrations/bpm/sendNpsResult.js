import { getBpmHttpClient } from "./basis.js"
import moment from "moment";

global.sendNpsResult = async function(questionsData, scenarioCode, externalId, timeStamp) {
    Logger.info("[sendCallStatus] Function started...");
    $.session.bpmHttpClient ||= await getBpmHttpClient();
    const bpmClient = (await session()).bpmHttpClient?.clone("BPM. Send NPS Result");
    if (!bpmClient) {
        Logger.warn("[sendNpsResult] Couldn't get BPM Http Client instance");
        return false;
    }
    
    const data = {
        "TransactionId": externalId || $.session.currentExternalId,
        "ConsumerSurvey": {
            "$type": "PMI.BDDM.Transactionaldata.ConsumerSurvey",
            "Answers": questionsData,
            "Questionnaire": {
                "$type": "PMI.BDDM.Transactionaldata.FieldForceQuestionnaireReference",
                "Code": scenarioCode,
                "CodeSpace": "ConsumerSurveyTool"
            },
            "EndDate": timeStamp || moment().format(),
            "StartDate": timeStamp || moment().format(),
            "CollectionChannel": "VoiceBot"
        }
    }
    return await bpmClient.post("/rest/consumerSurvey/createNPSSurvey", data);
}

export default {}
