global.Logger = {
    _formatLog(prefix, message) {
        if (message !== undefined && typeof message !== "string") {
            message = toPrettyString(message);
        }
        const text = message ? `${prefix}: ${message}` : prefix;
        const timestamp = new Date().toISOString();
        return `[${timestamp}] ${text}`;
    },
    
    debug(prefix, message) {
        $.session.LOG_LEVEL ||= $env.get("LOG_LEVEL", "INFO");
        if ($.session.LOG_LEVEL !== "DEBUG") return;
        const text = this._formatLog(prefix, message);
        log(`PMI_LOG DEBUG ${text}`);
    },
    
    info(prefix, message) {
        const text = this._formatLog(prefix, message);
        log(`PMI_LOG INFO ${text}`);
    },
    
    
    warn(prefix, message) {
        const text = this._formatLog(prefix, message);
        $session.logger ||= {};
        $session.logger.warnings ||= [];
        $session.logger.warnings.push(text);
        log(`PMI_LOG WARN ${text}`); // TODO ждем фикса на стороне JAICP по ограничению кол-ва символов
    },
    
    integration(integrationName, status, statusText) {
        $session.logger ||= {};
        $session.logger.integrations ||= [];
        const logText = `${integrationName}. ${status}: ${statusText}`;
        $session.logger.integrations.push(logText);
        log(`PMI_LOG INTEGRATION ${logText}`);
    },

    endMessage() {
        const warnings = $session.logger?.warnings;
        if (!warnings) return;
        const logMessage = warnings.length
          ? `PMI_LOG END - WARNINGS:\n${warnings.map(w => `- ${w}`).join("\n")}`
          : `PMI_LOG END - NO WARNINGS`;
        log(logMessage);
        if ($session.logger?.integrations) {
            log(`PMI_LOG END - INTEGRATIONS:\n${$session.logger.integrations.join("\n")}`);
        }
    }
};

export default {}
