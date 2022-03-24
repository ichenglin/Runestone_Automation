import fetch from "node-fetch";
import cheerio from "cheerio";
import { fetch_body } from "../system/fetch_body";
import { fetch_session } from "../system/fetch_session";

export interface LoginCredentials {access_session: string, access_token: string, access_timezone: number};
interface PreLoginCredentials {login_form_session: string, login_form_key: string, login_form_name: string};

export async function runestone_login(username: string, password: string, timezone: number): Promise<LoginCredentials> {
    // login
    const login_form = await runestone_login_new();
    const login_credentials = await runestone_login_request(username, password, timezone, login_form);
    // submit timezone
    await runestone_login_timezone(login_credentials);
    return login_credentials;
}

async function runestone_login_new(): Promise<PreLoginCredentials> {
    // first fetch for login form
    const login_request = await fetch("https://runestone.academy/user/login?_next=/");
    const $ = cheerio.load(await login_request.text());
    // get login form credentials
    const login_form_session_matcher = login_request.headers.raw()["set-cookie"][0].match(/session_id_runestone=(\w+:[\w-]+);/);
    const login_form_session = login_form_session_matcher !== null ? login_form_session_matcher[1] : undefined;
    const login_form_key = $("input[name=_formkey]").attr("value");
    const login_form_name = $("input[name=_formname]").attr("value");
    if (login_form_session === undefined || login_form_key === undefined || login_form_name === undefined) {
        throw Error("failed to fetch login form credentials");
    }
    // finalize form credentials
    return {
        login_form_session: login_form_session,
        login_form_key: login_form_key,
        login_form_name: login_form_name
    } as PreLoginCredentials;
}

async function runestone_login_request(username: string, password: string, timezone: number, form_credentials: PreLoginCredentials): Promise<LoginCredentials> {
    const login_form_body = fetch_body({
        username: username,
        password: password,
        remember_me: "on",
        _next: "/",
        _formkey: form_credentials.login_form_key,
        _formname: form_credentials.login_form_name
    });
    const login_form = await fetch("https://runestone.academy/user/login?_next=/", {
        method: "POST",
        body: login_form_body,
        redirect: "manual",
        headers: {
            Cookie: `session_id_runestone=${form_credentials.login_form_session}`
        }
    });
    // extract redirect session
    const login_redirect_session_matcher = login_form.headers.raw()["set-cookie"][0].match(/session_id_runestone=(\w+:[\w-]+);/);
    if (login_redirect_session_matcher === null) {
        throw Error("failed to fetch login form session");
    }
    // fetch for access token
    const login_redirect = await fetch("https://runestone.academy/", {
        method: "GET",
        redirect: "manual",
        headers: {
            Cookie: `session_id_runestone=${login_redirect_session_matcher[1]}`
        }
    });
    // extract access token
    if (login_redirect.headers.raw()["set-cookie"].length < 2) {
        throw Error("failed to fetch access token (1)");
    }
    const access_token_matcher = login_redirect.headers.raw()["set-cookie"][1].match(/access_token=([^;]+);/);
    if (access_token_matcher === null) {
        throw Error("failed to fetch access token (2)");
    }
    return {
        access_session: login_redirect_session_matcher[1],
        access_token: access_token_matcher[1],
        access_timezone: timezone
    } as LoginCredentials;
}

async function runestone_login_timezone(login_credentials: LoginCredentials): Promise<void> {
    const timezone_body = fetch_body({timezoneoffset: login_credentials.access_timezone});
    await fetch("https://runestone.academy/ns/logger/set_tz_offset", {method: "POST", body: timezone_body, headers: fetch_session(login_credentials)});
}