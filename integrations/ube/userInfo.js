export default {
    async getUserInfo() {
        const secret = Utils.getSecret("LOYALTY");
        if (!secret) {
            Logger.warn("[getUserInfo] No LOYALTY secret found");
            return false;
        }
        let httpClient = new HttpClient().init(
            {
                method: "get",
                url: secret.url,
                params: {
                    permanentToken: secret.token,
                    phone: Utils.getPhone()
                },
                headers: { "Content-Type": "application/json" },
                timeout: 10000
            }, 
            "UbeClient", 2
        ).installMask(["permanentToken", "mobile_phone_full"]);
        return await httpClient.execute();
    },

    async getProcessedUserInfo() {
        const apiRes = await this.getUserInfo();
        if (!apiRes?.isOk || !apiRes?.data) {
            Logger.warn("[getProcessedUserInfo] Couldn't get data from UBE");
            return false;
        }
        const data = apiRes.data;
        const person = data.person;
        if (!person) {
            Logger.warn("[getProcessedUserInfo] Couldn't get person data from UBE")
        }
        const av = person?.av == 1 ? 1 : 0;
        return {
            name: person?.first_name,
            surname: person?.last_name,
            kladr_code: person?.kladr_code,
            birth_date: person?.birth_date,
            AVstatus: av,
            smsSub: person?.smsSub,
            telegramSub: person?.telegramBotSub,
            userId: person?.user_id,
            spiceId: data.userId
        }
    }
}
