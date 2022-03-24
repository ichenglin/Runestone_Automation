export function fetch_body(parameters: {[key: string]: any}): URLSearchParams {
    const request_body = new URLSearchParams();
    Object.keys(parameters).forEach(parameter_name => {
        request_body.append(parameter_name, parameters[parameter_name]);
    });
    return request_body;
}