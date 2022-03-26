import { runestone_login } from "./forms/runestone_login";
import { runestone_practice } from "./forms/runestone_practice";
import { send_log } from "./system/send_log";
import { wait_milliseconds } from "./system/wait_milliseconds";

import * as time_unit_milliseconds from "./data/time_unit_milliseconds.json";
import * as automate_settings from "./data/automate_settings.json";

(async () => {
    while (true) {
        // convert UTC+0 date to local time
        const timezone_date = Date.now() + (automate_settings.schedule.timezone * time_unit_milliseconds.hour);
        const today_milliseconds = timezone_date % time_unit_milliseconds.day;
        // scheduled automate time (local time)
        const automate_milliseconds = (automate_settings.schedule.hours * time_unit_milliseconds.hour) + (automate_settings.schedule.minutes * time_unit_milliseconds.minute);
        // milliseconds until next scheduled time (local time)
        let automate_delay = (
            today_milliseconds <= automate_milliseconds
            ? automate_milliseconds - today_milliseconds // today's schedule not completed yet
            : automate_milliseconds - today_milliseconds + time_unit_milliseconds.day // today's schedule completed, go for next day.
        );
        // wait for next scheduled time
        send_log(`waiting ${Math.ceil(automate_delay / time_unit_milliseconds.hour * 10) / 10} hours (${Math.ceil(automate_delay / time_unit_milliseconds.second)} seconds)`);
        await wait_milliseconds(automate_delay);
        // submit practice question answer for students
        for (let profile_index = 0; profile_index < automate_settings.profiles.length; profile_index++) {
            const student_profile = automate_settings.profiles[profile_index];
            const automate_status = await student_runestone(student_profile.student_username, student_profile.student_password, student_profile.student_timezone);
            send_log(`submitted answers for ${student_profile.student_username}, success: ${automate_status}`);
        }
    }
})();

async function student_runestone(username: string, password: string, timezone: number): Promise<boolean> {
    try {
        const access_token = await runestone_login(username, password, timezone);
        await runestone_practice(access_token);
        return true;
    } catch (error) {
        // fallback if automate process throws error
        return false;
    }
}