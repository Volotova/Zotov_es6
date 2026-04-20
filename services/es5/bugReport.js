function formatPhone(format, phone) {
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
}

function getPhone(format) {
    var ctx = $jsapi.context();
    var phone;
    if (ctx.session.currentCampaign && ctx.session.currentCampaign.data) {
        phone = ctx.session.currentCampaign.data.phone;
    }
    // Если номер не найден в кампании, пытаемся получить через $dialer.getCaller()
    if (!phone) {
        phone = $dialer.getCaller();
    }
    return formatPhone(format, phone);
}

function botInfoForBugReport() {
    var ctx = $jsapi.context();
    var botData = {
        projectName: ctx.injector.project,
        botId: ctx.request.botId,
        externalId: ctx.session.currentUserId || "default",
        phone: getPhone()
    };
    return botData;
}

function sendBugReportEs5(errorType, requestTime, responseFromBot, requestData) {
    var ctx = $jsapi.context();
    var botData = botInfoForBugReport();
    var rawBugReportSecret = ctx.session.bugReportSecret || $secrets.get("BUG_REPORT", "BUG_REPORT token not found");
    if (typeof rawBugReportSecret === "string") {
        ctx.session.bugReportSecret = JSON.parse(rawBugReportSecret);
    }
    // Форматируем время по московскому часовому поясу (UTC+3)
    var requestTimeFormatted = moment.utc(requestTime).utcOffset("+03:00").format("ddd, DD MMM YYYY HH:mm:ss").toString();

    var responseWithError = {};
    for (var key in responseFromBot) {
        if (responseFromBot.hasOwnProperty(key)) {
            responseWithError[key] = responseFromBot[key];
        }
    }
    responseWithError.error = (responseFromBot && responseFromBot.errorMessage) || "No error message available";

    var config = {
        method: "POST",
        body: {
            clientId: "test",
            query: errorType,
            data: {
                botData: botData,
                requestTime: requestTimeFormatted,
                requestData: requestData,
                response: responseWithError
            }
        }
    };
    var response = $http.query(ctx.session.bugReportSecret.url + "?clientId=${clientId}&query=${query}", config);
    return response;
}
