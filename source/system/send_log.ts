import * as automate_settings from "../data/automate_settings.json";
import * as time_unit_milliseconds from "../data/time_unit_milliseconds.json";

export function send_log(message: string): void {
    console.log(`[${get_debug_time()}] ${message}`);
}

function get_debug_time(): string {
    const date_display_pattern = new Date(Date.now() + (automate_settings.schedule.timezone * time_unit_milliseconds.hour)).toISOString().match(/^(.+)T(.+)\..+$/);
    if (date_display_pattern === null) {
        return "error";
    }
    return date_display_pattern[1] + " " + date_display_pattern[2];
}