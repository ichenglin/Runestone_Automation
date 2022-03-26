import fetch from "node-fetch";
import cheerio from "cheerio";
import { fetch_session } from "../system/fetch_session";
import { LoginCredentials } from "./runestone_login";

interface PracticeQuestion {
    question_remain: number,
    question_course: string,
    question_type: string | null,
    question_id: string,
    question_label: string | null,
    question_answer: number,
    question_answer_multiple: boolean | null,
    question_postpone: {qid: number, q: number}
};

export async function runestone_practice(login_credentials: LoginCredentials): Promise<void> {
    while (true) {
        const practice_question = await runestone_practice_new(login_credentials);
        if (practice_question.question_remain <= 0) {
            // no more question available
            console.log("no question remaining.");
            return;
        }
        console.log(`get question: ${practice_question.question_id} (answer: ${practice_question.question_answer}) (remain: ${practice_question.question_remain})`);
        const automation_available = practice_question.question_type === "multiplechoice" && practice_question.question_answer_multiple === false;
        if (automation_available) {
            // submit answer
            await runestone_practice_submit(login_credentials, practice_question);
            console.log(`submitted question: ${practice_question.question_id}`);
        } else {
            // postpone to next question
            await runestone_practice_postpone(login_credentials, practice_question);
            console.log(`postponed question: ${practice_question.question_id}`);
        }
    }
}

async function runestone_practice_new(login_credentials: LoginCredentials): Promise<PracticeQuestion> {
    const practice_question_html = await fetch("https://runestone.academy/assignments/practice", {method: "GET", headers: fetch_session(login_credentials)});
    const $ = cheerio.load(await practice_question_html.text());
    const practice_question_remain_text = $("#part1 > div > p:nth-child(1)").text() as string;
    const practice_question_remain = runestone_practice_question_remain(practice_question_remain_text);
    if (practice_question_remain <= 0) {
        // no avaiable question, skip the rest
        return {
            question_remain: 0,
            question_course: "",
            question_type: "",
            question_id: "",
            question_label: "",
            question_answer: 0,
            question_answer_multiple: null,
            question_postpone: {qid: 0, q: 0}
        } as PracticeQuestion;
    }
    const practice_question_course = ($("#navbar > div > div.navbar-collapse.collapse.navbar-ex1-collapse > ul:nth-child(2) > li:nth-child(2) > a").html()?.match(/^Back to (.+)$/) as string[])[1];
    const practice_question_header = $("[data-component=multiplechoice]:nth-child(1)") || $("[data-component=activecode]:nth-child(1)");
    const practice_question_id = practice_question_header.attr("id") as string;
    const practice_question_data = practice_question_header.data();
    const practice_question_answer_id = $("[data-component=answer][data-correct=]").attr("id");
    const practice_question_answer = practice_question_answer_id !== undefined ? practice_question_answer_id.charCodeAt(practice_question_id.length + 5) - 97 : null;
    const practice_question_postpone = ($("#PostponeBtn").attr("href") as string).match(/^\/runestone\/assignments\/checkanswer\/\?QID=(\d+)&q=([-\d]+)$/) as string[];
    return {
        question_remain: practice_question_remain,
        question_course: practice_question_course,
        question_type: practice_question_data !== undefined ? practice_question_data.component : null,
        question_id: practice_question_id,
        question_label: practice_question_data !== undefined ? practice_question_data.questionLabel : null,
        question_answer: practice_question_answer,
        question_answer_multiple: practice_question_data !== undefined ? practice_question_data.multipleanswers : null,
        question_postpone: {qid: parseInt(practice_question_postpone[1]), q: parseInt(practice_question_postpone[2])}
    } as PracticeQuestion;
}

async function runestone_practice_submit(login_credentials: LoginCredentials, practice_question: PracticeQuestion): Promise<void> {
    // have to send in JSON format, therefore not using fetch_body function.
    const practice_question_body = {
        act: `answer:${practice_question.question_answer}:correct`,
        answer: `${practice_question.question_answer}`,
        clientLoginStatus: true,
        correct: "T",
        course_name: practice_question.question_course,
        div_id: practice_question.question_id,
        event: "mChoice",
        percent: 1,
        timezoneoffset: login_credentials.access_timezone
    };
    // "Check Me" button
    await fetch("https://runestone.academy/ns/logger/bookevent", {
        method: "POST",
        headers: {
            "content-type": "application/json; charset=utf-8",
            Cookie: fetch_session(login_credentials).Cookie
        },
        body: JSON.stringify(practice_question_body)
    });
    // "Done! Ask me another question!" button
    await fetch(`https://runestone.academy/runestone/assignments/checkanswer/?QID=${practice_question.question_postpone.qid}`, {headers: fetch_session(login_credentials)});
}

async function runestone_practice_postpone(login_credentials: LoginCredentials, practice_question: PracticeQuestion): Promise<void> {
    await fetch(`https://runestone.academy/runestone/assignments/checkanswer/?QID=${practice_question.question_postpone.qid}&q=${practice_question.question_postpone.q}`, {headers: fetch_session(login_credentials)});
}

function runestone_practice_question_remain(remain_text: string): number {
    if (remain_text === "Hang in there. Last question for today.") {
        return 1;
    }
    if (remain_text === undefined) {
        return 0;
    }
    const question_remain_matcher = remain_text.match(/^(\d+) questions left/);
    if (question_remain_matcher === null) {
        return 0;
    }
    return parseInt(question_remain_matcher[1]);
}