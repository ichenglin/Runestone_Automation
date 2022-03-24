import { runestone_login } from "./forms/runestone_login";
import { runestone_practice } from "./forms/runestone_practice";

(async () => {
    const access_token = await runestone_login("USERNAME", "PASSWORD", -8 /*timezone*/);
    await runestone_practice(access_token);
})();