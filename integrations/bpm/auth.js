async function getAuthTokenFromBpm() {
    const secret = Utils.getSecret("BPM_AUTH");
    if (!secret) {
        Logger.warn("[getAuthTokenFromBpm] Couldn't get BPM_AUTH");
        return false;
    }
    const url = secret.url + "/auth/connect/token";
    const options = {
        url: url,
        method: "post",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        form: {
            "grant_type": "client_credentials",
            "client_id": secret.clientId,
            "client_secret": secret.clientSecret
        }
    }
    const http = new HttpClient()
        .init(options, "BPMAuth", 2)
        .installMask(["client_id", "client_secret", "access_token"]); 
        // TODO handlers
    const res = await http.execute();
    if (res.isOk) {
        return res.data?.access_token;
    }
}

async function getAuthTokenFromDB(update) {
    const dbBotUrl  = Utils.getSecret("DBBOT")?.url;
    if (!dbBotUrl) {
        Logger.warn("[getAuthTokenFromDB] Couldn't get dbBotUrl");
        return false;
    }
    const query = update ? "updateAuthToken" : "getAuthToken";
    let res = await chatApiRequest(dbBotUrl, query);
    if (res.isOk) {
        try {
            const reply = res.data.data.replies[0].text;
            return JSON.parse(reply).token;
        } catch (e) {
            Logger.warn(`[getAuthTokenFromDB] Couldn't get or parse token ${e}`);
        }
    }
}

global.getAuthToken = async function(update = false) {
    const tokenLiveTime = 86400;
    const cached = $.client.auth;

    if (cached && !update && ($jsapi.currentTime() - cached.updatedAt) / 1000 < tokenLiveTime) {
        return cached.token;
    }

    const token = await getAuthTokenFromDB(update) || await getAuthTokenFromBpm();
    $.client.auth = token ? { token, updatedAt: $jsapi.currentTime() } : null;

    return $.client.auth?.token;
};

export default {}
