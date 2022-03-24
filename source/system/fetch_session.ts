import { LoginCredentials } from "../forms/runestone_login";

export function fetch_session(login_credentials: LoginCredentials) {
    return {
        Cookie: `session_id_runestone=${login_credentials.access_session}; access_token=${login_credentials.access_token};`
    };
}