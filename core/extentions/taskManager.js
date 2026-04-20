// TODO задокументировать

function generateId(prefix = "task") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureJobs() {
    $session.jobs = (await $session.jobs) || {};
    return $session.jobs;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startTask(asyncFn, prefix) {
    const id = generateId(prefix);
    const jobs = await ensureJobs();
    jobs[id] = { status: "pending", started: Date.now() };
    $session.jobs = jobs;

    // Фоновый запуск
    (async () => {
        try {
            const result = await asyncFn();
            const jobs = await ensureJobs();
            jobs[id] = { status: "done", data: result, finished: Date.now() };
            $session.jobs = jobs;
            Logger.info(`Job with ID ${id} is done`);
        } catch (err) {
            const jobs = await ensureJobs();
            jobs[id] = { status: "error", error: toPrettyString(err), finished: Date.now() };
            $session.jobs = jobs;
        }
    })();

    return id;
}

async function getTask(id) {
    const jobs = await ensureJobs();
    Logger.info(`Request for job with ID ${id}. Job\`s state: ${toPrettyString(jobs[id])}`);
    return jobs[id] || null;
}

async function waitForTask(id, timeoutSec = 30, intervalMs = 1000) {
    const start = Date.now();
    while (Date.now() - start < timeoutSec * 1000) {
        const job = await getTask(id);
        if (!job) return { status: "not_found" };
        if (job.status !== "pending") return job;
        await sleep(intervalMs);
    }
    return { status: "timeout" };
}

async function cleanOldTasks(maxAgeSec = 300) {
    const now = Date.now();
    const jobs = await ensureJobs();
    for (const [id, job] of Object.entries(jobs)) {
        if (job.finished && now - job.finished > maxAgeSec * 1000) {
            delete jobs[id];
        }
    }
    $session.jobs = jobs;
}

export default { startTask, getTask, waitForTask, cleanOldTasks };


/*
ПРИМЕР ИСПОЛЬЗОВАНИЯ В СЦЕНАРИИ

    state: TaskManager
        q!: task manager
        scriptEs6:
            let simpleTask = async function() {
                setTimeout(() => {
                    console.log("Delayed for 1 second.");
                }, "5000");
                return "ASSSSSSSSSAAAA";
            };
            $temp.taskId = await taskManager.startTask(
                simpleTask,
                "simple"
            );
            $reactions.answer(`Задача определения категории запущена, ID: ${$temp.taskId}`);

        state: Check 
            q: check
            scriptEs6:
                const result = await taskManager.waitForTask($temp.taskId, 5, 1000);
                $reactions.answer(result);
                $reactions.answer("CHECK OVER"); 

*/