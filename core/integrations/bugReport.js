import axios from "axios";

function botInfoForBugReport() {
    var botData = {
        projectName: $.injector.project,
        botId: $.request.botId,
        externalId: $.session.currentUserId || "default",
        phone: Utils.getPhone()
    };
    return botData;
}

global.sendBugReport = async function (errorType, requestTime, responseFromBot, requestData) {
    const botData = botInfoForBugReport();
    // Форматируем время по московскому часовому поясу (UTC+3)
    const requestTimeFormatted = moment.utc(requestTime).utcOffset("+03:00").format("ddd, DD MMM YYYY HH:mm:ss");
    const clientId = "test";
    const query = errorType;

    const responseWithError = {
        ...responseFromBot,
        error: responseFromBot?.errorMessage || "No error message available"
    };

    const data = {
        botData,
        requestTime: requestTimeFormatted,
        requestData,
        response: responseWithError
    };

    try {
        const secret = Utils.getSecret("BUG_REPORT");
        const url = `${secret.url}/?clientId=${clientId}&query=${encodeURIComponent(query)}`;
        const { data: responseData } = await axios.post(url, {
            clientId,
            query,
            data
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        return responseData;
    } catch (error) {
        Logger.warn(`[sendBugReport] Exception: ${error}`);
        return false;
    }
}

export default {}