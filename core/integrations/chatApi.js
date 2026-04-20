global.chatApiRequest = async function(botURL, query = "query", clientId = "PMI_BOT") {
    const url = `${botURL}?clientId=${clientId}&query=${encodeURIComponent(query)}`

    const http = new HttpClient()
        .init(undefined, "ChatAPI", 2)
        .installMask("token");

    return await http.get(url);
}

export default {}