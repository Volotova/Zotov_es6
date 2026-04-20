async function updateAuthTokenInClient(httpClient) {
    const token = await getAuthToken(true);
    httpClient.updateOptions({
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    });
}

async function getBpmHttpClient() {
    // TODO в конце url в секрете убрать "/"
    const bpmSecret = Utils.getSecret("BPM_AUTH");
    if (!bpmSecret) {
        Logger.warn("[getBpmHttpClient] Couldn't create BPM Http Client. NO BPM_AUTH");
        return null;
    }

    const token = await getAuthToken();
    if (!token) {
        Logger.warn("[getBpmHttpClient] Couldn't create BPM Http Client. NO AUTH");
        return null;
    }

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    }
    return new HttpClient()
        .init({ baseURL: bpmSecret.url, headers, timeout: 10000}, "BPM API", 2)
        .installMask("Authorization")
        .addErrorHandler([403], updateAuthTokenInClient, false, true);
}

export { getBpmHttpClient }