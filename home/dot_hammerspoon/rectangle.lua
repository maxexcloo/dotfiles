-- Keep Rectangle's global gap in sync with the connected display layout.
local appliedGap
local automation = { sleeping = false }
local bundleID = 'com.knollsoft.Rectangle'
local logger = hs.logger.new('rectangleGap', 'info')
local targetDisplayName = 'P40WD-40'

local function applyGap(gap)
    automation.task = hs.task.new(
        '/usr/bin/defaults',
        -- Reopen Rectangle and report the result.
        function(code, _, stderr)
            local launched = hs.application.launchOrFocusByBundleID(bundleID)

            automation.task = nil
            if code ~= 0 then
                logger.e('Could not write gap: ' .. stderr)
            elseif not launched then
                logger.e('Could not reopen Rectangle')
            else
                appliedGap = gap
                logger.i('Applied gap ' .. gap)
            end
        end,
        { 'write', bundleID, 'gapSize', '-float', tostring(gap) }
    )

    if not automation.task:start() then
        automation.task = nil
        hs.application.launchOrFocusByBundleID(bundleID)
        logger.e('Could not start preference update')
    end
end

local function restartWithGap(gap)
    local application = hs.application.applicationsForBundleID(bundleID)[1]
    local deadline = hs.timer.secondsSinceEpoch() + 5

    if not application then
        applyGap(gap)
        return
    end

    application:kill() -- Requests a graceful quit.

    -- Wait for Rectangle to exit, with a five-second limit.
    automation.quitTimer = hs.timer.doEvery(0.1, function()
        if not application:isRunning() then
            automation.quitTimer:stop()
            automation.quitTimer = nil
            applyGap(gap)
        elseif hs.timer.secondsSinceEpoch() >= deadline then
            automation.quitTimer:stop()
            automation.quitTimer = nil
            logger.e('Rectangle did not quit within five seconds')
        end
    end)
end

local function scheduleUpdate()
    automation.retryTimer:start()
    automation.settleTimer:start()
end

local function updateGap()
    if automation.quitTimer or automation.sleeping or automation.task then
        return
    end

    local gap = 0
    local screens = hs.screen.allScreens()

    if #screens == 0 then
        return
    end

    for _, screen in ipairs(screens) do
        if screen:name() == targetDisplayName then
            gap = 20
            break
        end
    end

    if appliedGap ~= gap then
        restartWithGap(gap)
    end
end

-- Debounce display changes, then retry after the connection has settled.
automation.retryTimer = hs.timer.delayed.new(12, updateGap)
automation.settleTimer = hs.timer.delayed.new(3, updateGap)
automation.screenWatcher = hs.screen.watcher.new(scheduleUpdate):start()
automation.wakeWatcher = hs.caffeinate.watcher.new(function(event)
    local events = hs.caffeinate.watcher

    if event == events.screensDidSleep or event == events.systemWillSleep then
        automation.sleeping = true
        automation.retryTimer:stop()
        automation.settleTimer:stop()
    elseif
        event == events.screensDidUnlock
        or event == events.screensDidWake
        or event == events.sessionDidBecomeActive
        or event == events.systemDidWake
    then
        automation.sleeping = false
        scheduleUpdate()
    end
end):start()

scheduleUpdate()

return automation
