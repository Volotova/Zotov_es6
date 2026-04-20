import BindChain from "../core/extentions/bindChain.js"
import Campaigns from "./campaigns.js"
import Analytics from "./analytics.js"
import UserInfo from "../integrations/ube/userInfo.js"

export default {
    async initSession() {
        if (!Utils.isResterisk()) {
            $jsapi.startSession();
        }
        if ($session.isInitialized) return;
        Logger.info(`SCENARIO VERSION: ${$.injector?.scenarioVersion} --- COMMON VERSION: 1.0.0`);
        // Для корректной обработки стейта StartWithPayload
        if ($.temp.testData) {
            $.session.testData = $.temp.testData;
        }
        
        Logger.info("Starting session. Client", await $client);
        if ($injector?.features?.bindChain) {
            await BindChain.installBind(); 
        }
        if ($injector?.features?.campaigns) {
            await Campaigns.initCampaigns();
        }
        if ($injector?.features?.metrics) {
            await Analytics.initMetrics();
        }
        if ($injector?.features?.getUbeData) {
            const ubeInfo = await UserInfo.getProcessedUserInfo()
            if (ubeInfo) {
                $session.userInfo = {...$session.userInfo, ...ubeInfo};
                if ($session.userInfo?.name) {
                    $session.userInfo.markedName = Utils.getMarkedName($session.userInfo.name);
                }
            }
        }
        $session.isInitialized = true;
        $session.sessionStartTime = $jsapi.currentTime();
        Logger.info("Started session", await $session);
    }
}