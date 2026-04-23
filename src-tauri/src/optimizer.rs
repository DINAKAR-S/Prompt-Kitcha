use std::sync::atomic::{AtomicU64, Ordering};

use futures_util::StreamExt;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

use crate::providers::{build, ChatRequest};
use crate::SharedState;

const META_PROMPT: &str = r#"You are PromptKitcha - a prompt optimization engine. You do NOT chat. You do NOT respond conversationally. You ONLY output a JSON object containing the optimized prompt.

CRITICAL RULES:
1. NEVER respond with conversational text like "Not much! Just here to help."
2. NEVER greet the user or ask follow-up questions
3. ONLY output the JSON object - nothing before or after
4. The "prompt" field must contain the ACTUAL optimized text, not a description of what you would do

You will be told the ACTIVE SURFACE (the app/window the user is typing into). The surface decides the MODE of your output:

MODE A - "prompt" (used when surface is: llm_chat, ide)
Output is an instruction prompt written to another AI in second person ("You are...", "Task:", "Return:"). Not a draft, email body, code answer, or finished artifact.

MODE B - "artifact" (used when surface is: email_client, chat_app, doc_editor, search, browser, unknown)
Output is the FINISHED TEXT the user will paste/send. The user is drafting IN that app; they want the final email body, message, note, search query, or document text -- not a prompt to an LLM.

HARD RULES (both modes):
- Preserve the user's facts exactly. Do not invent names, numbers, dates, or URLs.
- For missing critical info, insert "[specify: <what>]" placeholders.
- Match the input's language.
- Never output code fences, commentary, or "Here is..." preambles.
- NEVER output explanations about what you're doing

STEP 1 - Classify intent. Choose exactly ONE:
code_agent - the user is instructing a coding AI to build, modify, debug, or review software.
email - email draft or reply.
message - chat/DM/Slack/Teams/WhatsApp message.
content - marketing, blog, social, long-form content.
note - personal notes, to-do, meeting notes.
search - search-engine query (<= 1 short sentence, keyword-oriented).
question - explain or answer a question.
analysis - analyze data, a situation, or a document.
summarize - condense a source.
rewrite - polish, translate, or rephrase existing text.
brainstorm - generate ideas or options.
data - extract, transform, or structure data.
other - none of the above.

Intent heuristics:
- If ACTIVE SURFACE is email_client -> intent is usually "email".
- If ACTIVE SURFACE is chat_app -> intent is usually "message".
- If ACTIVE SURFACE is doc_editor (Notepad, Word, Notion) -> "note" unless text clearly says draft an email/post.
- If ACTIVE SURFACE is search -> "search".
- If ACTIVE SURFACE is ide -> "code_agent".
- If ACTIVE SURFACE is llm_chat -> pick the intent that best matches the text (code_agent if it describes software behavior, otherwise email/content/etc).

STEP 2 - Apply the framework for the chosen MODE + intent:

MODE A (prompt) skeletons - use when surface is llm_chat or ide:

[code_agent prompt]
"You are an expert software engineer working in <stack if known, else: this codebase>.

Task: <one-sentence task>

Context:
- <facts pulled from the input>

Requirements:
- <bullets>

Constraints:
- Do not break existing functionality.
- Follow existing codebase patterns.

Clarify before coding:
- [specify: <missing info>]

Output format:
1. Plan (3-5 bullets).
2. Files to create or modify.
3. Code diffs with short reasoning.
4. Blocking questions."

[email prompt] "You are an assistant drafting emails. Goal:... Recipient:... Tone:... Length:... Key points:... Return the body only."

[content prompt] "You are an expert writer. Format:... Audience:... Goal:... Tone:... Length:... Key points:... Must include:... Avoid:... Return the final piece only."

[question prompt] "You are an expert. Background:... Question:... Depth:... Output format:... Answer concisely."

[analysis prompt] "You are an analyst. Subject:... Goal:... Framework:... Output: TL;DR, key findings, evidence, recommendation."

[summarize / rewrite / brainstorm / data / other prompt] - same style as before, instructions to an AI in second person.

MODE B (artifact) skeletons - use when surface is email_client, chat_app, doc_editor, search, browser, unknown:

[email artifact]
Output a finished email body the user can send. Inferred tone from input; professional warm by default. 2-6 short paragraphs. Use [specify: ...] for unknown recipient name, date, time, link. Do NOT include "Subject:" unless the input asks for one. No signature unless named.

[message artifact]
Output a finished chat message (Slack/Teams/DM). 1-4 sentences. Conversational tone matching the input. No greeting like "Dear X" unless the input implies formality.

[note artifact]
Output clean note text. If the input is a list of tasks or features, render as a hyphen bulleted list. If the input is freeform thinking, render as well-structured paragraphs with a short heading line. No meta-commentary.

[content artifact]
Output the finished post / blog / tweet. Infer format from input (e.g. "linkedin post" -> LinkedIn post). 120-220 words for long-form, shorter for tweets. Plain text, line breaks between paragraphs.

[search artifact]
Output a single search-engine-ready query. <= 12 words. No full sentence. Keywords + operators. No quotes unless phrase search is needed.

[question artifact]
Output the finished, well-phrased question as one clear sentence or short paragraph.

[summarize artifact]
Output the finished summary. No "Here is the summary:" preamble.

[rewrite artifact]
Output the rewritten text only. No original/rewritten labels.

[brainstorm artifact]
Output a numbered list of 10 ideas. One line each. No commentary.

[data / code / analysis / other artifact]
Output the finished result only. No preamble or explanation.

STEP 3 - Return STRICT JSON on a single line, nothing else:
{"intent":"<intent>","prompt":"<the finished text OR the prompt, per MODE>"}

EXAMPLES:

SURFACE: doc_editor (Notepad)
INPUT: email john meet tomorrow
OUTPUT: {"intent":"email","prompt":"Hi John,\n\nJust confirming we're still on for tomorrow at [specify: time]. Happy to meet at [specify: location or video link].\n\nLet me know if something's shifted on your side and we can reschedule.\n\nThanks,\n[specify: your name]"}

SURFACE: llm_chat (ChatGPT)
INPUT: email john meet tomorrow
OUTPUT: {"intent":"email","prompt":"You are an assistant that drafts emails. Draft a short, warm, professional email to John confirming tomorrow's meeting. Include placeholders for [specify: time] and [specify: location or video link]. Offer to reschedule if needed. Return the email body only, no subject line."}

SURFACE: ide (VS Code / Cursor)
INPUT: add email sign up, sign in, and draft-creation features
OUTPUT: {"intent":"code_agent","prompt":"You are an expert software engineer working in this codebase.\n\nTask: Add email-based authentication (sign up, sign in) and a draft-creation feature.\n\nRequirements:\n- Sign up: email + password, validation, persistence.\n- Sign in: session/token, logout.\n- Draft creation: create, list, edit, delete drafts per user.\n\nConstraints:\n- Follow existing codebase patterns.\n- Do not break current auth flows.\n\nClarify before coding:\n- [specify: framework / ORM / session store]\n- [specify: password hashing strategy]\n- [specify: where drafts are stored]\n\nOutput format:\n1. Plan (3-5 bullets).\n2. Files to create or modify.\n3. Diffs with short reasoning.\n4. Blocking questions."}

SURFACE: chat_app (Slack)
INPUT: tell team standup moved to 10
OUTPUT: {"intent":"message","prompt":"Heads up - standup is moving to 10:00 [specify: time zone] starting [specify: date]. Calendar invites updated shortly."}

SURFACE: search (Chrome)
INPUT: how to use tauri global shortcut plugin v2
OUTPUT: {"intent":"search","prompt":"tauri v2 global-shortcut plugin register example"}"#;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OptimizeRequest {
    pub text: String,
    pub job_id: u64,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub base_url: Option<String>,
    #[serde(default)]
    pub feedback: Option<String>,
    #[serde(default)]
    pub previous_output: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct OptimizeEvent {
    pub job_id: u64,
    pub kind: &'static str,
    pub intent: Option<String>,
    pub prompt_delta: Option<String>,
    pub full_prompt: Option<String>,
    pub error: Option<String>,
}

static NEXT_JOB: AtomicU64 = AtomicU64::new(1);
static CANCEL: Lazy<Mutex<Option<u64>>> = Lazy::new(|| Mutex::new(None));

pub fn next_job_id() -> u64 { NEXT_JOB.fetch_add(1, Ordering::Relaxed) }

#[tauri::command]
pub async fn cancel_optimize(job_id: u64) {
    *CANCEL.lock().await = Some(job_id);
}

async fn cancelled(job_id: u64) -> bool {
    matches!(*CANCEL.lock().await, Some(x) if x == job_id)
}

#[tauri::command]
pub async fn optimize_text(
    app: AppHandle,
    state: State<'_, SharedState>,
    req: OptimizeRequest,
) -> Result<u64, String> {
    let job_id = if req.job_id == 0 { next_job_id() } else { req.job_id };

    let cfg = state.config.read().clone();
    let provider_id = req.provider.unwrap_or(cfg.provider.clone());
    let model = req.model.unwrap_or(cfg.model.clone());
    let base_url = req.base_url.or(cfg.base_url.clone());

    let max_chars = cfg.max_input_chars;
    let body = if req.text.chars().count() > max_chars {
        let truncated: String = req.text.chars().take(max_chars).collect();
        format!("{truncated}\n\n[truncated at {max_chars} chars]")
    } else {
        req.text.clone()
    };

    let hint = state.active_app.read().clone().unwrap_or_default();
    let surface = if hint.surface.is_empty() { "unknown" } else { hint.surface };
    let app_label = if hint.process.is_empty() {
        "unknown".to_string()
    } else {
        format!("{} - {}", hint.process, hint.title)
    };
    let user = match (req.feedback.as_deref(), req.previous_output.as_deref()) {
        (Some(fb), Some(prev)) if !fb.trim().is_empty() => format!(
            "ACTIVE SURFACE: {surface}\nACTIVE APP: {app_label}\n\nORIGINAL INPUT:\n{body}\n\nPREVIOUS OUTPUT:\n{prev}\n\nUSER FEEDBACK on previous output:\n{fb}\n\nProduce a revised output applying the feedback. Keep the same MODE (artifact vs prompt) and intent unless the feedback explicitly asks for a different form. Return the same strict JSON schema.",
        ),
        _ => format!(
            "ACTIVE SURFACE: {surface}\nACTIVE APP: {app_label}\n\nINPUT:\n{body}"
        ),
    };

    let provider = build(&provider_id, base_url.as_deref()).map_err(|e| e.to_string())?;

    let chat = ChatRequest {
        model,
        system: META_PROMPT.to_string(),
        user,
        temperature: 0.2,
        max_tokens: 1200,
    };

    let app2 = app.clone();
    tauri::async_runtime::spawn(async move {
        let emit = |ev: OptimizeEvent| {
            let _ = app2.emit("pw:optimize", ev);
        };

        let mut stream = match provider.stream_chat(chat).await {
            Ok(s) => s,
            Err(e) => {
                emit(OptimizeEvent {
                    job_id,
                    kind: "error",
                    intent: None,
                    prompt_delta: None,
                    full_prompt: None,
                    error: Some(e.to_string()),
                });
                return;
            }
        };

        let mut raw = String::new();
        let mut parser = StreamingJsonExtractor::new();
        let mut sent_intent: Option<String> = None;

        while let Some(chunk) = stream.next().await {
            if cancelled(job_id).await {
                emit(OptimizeEvent {
                    job_id,
                    kind: "cancelled",
                    intent: None,
                    prompt_delta: None,
                    full_prompt: None,
                    error: None,
                });
                return;
            }
            match chunk {
                Ok(delta) => {
                    raw.push_str(&delta);
                    let events = parser.push(&delta);
                    for ev in events {
                        match ev {
                            ExtractorEvent::Intent(intent) => {
                                if sent_intent.as_ref() != Some(&intent) {
                                    sent_intent = Some(intent.clone());
                                    emit(OptimizeEvent {
                                        job_id,
                                        kind: "intent",
                                        intent: Some(intent),
                                        prompt_delta: None,
                                        full_prompt: None,
                                        error: None,
                                    });
                                }
                            }
                            ExtractorEvent::PromptDelta(text) => emit(OptimizeEvent {
                                job_id,
                                kind: "delta",
                                intent: None,
                                prompt_delta: Some(text),
                                full_prompt: None,
                                error: None,
                            }),
                        }
                    }
                }
                Err(e) => {
                    emit(OptimizeEvent {
                        job_id,
                        kind: "error",
                        intent: None,
                        prompt_delta: None,
                        full_prompt: None,
                        error: Some(e.to_string()),
                    });
                    return;
                }
            }
        }

        let (intent, prompt) = parser.finalize(&raw);
        emit(OptimizeEvent {
            job_id,
            kind: "done",
            intent,
            prompt_delta: None,
            full_prompt: Some(prompt),
            error: None,
        });
    });

    Ok(job_id)
}

enum ExtractorState {
    SeekingObject,
    SeekingKey,
    SeekingColon { key: String },
    InStringValue { key: String, out: String, escape: bool },
    SeekingNextKey,
    Done,
}

pub enum ExtractorEvent {
    Intent(String),
    PromptDelta(String),
}

pub struct StreamingJsonExtractor {
    buf: String,
    cursor: usize,
    state: ExtractorState,
    intent_emitted: bool,
}

impl StreamingJsonExtractor {
    pub fn new() -> Self {
        Self {
            buf: String::new(),
            cursor: 0,
            state: ExtractorState::SeekingObject,
            intent_emitted: false,
        }
    }

    pub fn push(&mut self, delta: &str) -> Vec<ExtractorEvent> {
        self.buf.push_str(delta);
        let mut events = Vec::new();
        let bytes: Vec<char> = self.buf.chars().collect();

        while self.cursor < bytes.len() {
            let c = bytes[self.cursor];
            match &mut self.state {
                ExtractorState::SeekingObject => {
                    if c == '{' {
                        self.state = ExtractorState::SeekingKey;
                    }
                    self.cursor += 1;
                }
                ExtractorState::SeekingKey => {
                    if c == '"' {
                        let rest: String = bytes[self.cursor + 1..].iter().collect();
                        if let Some(end) = rest.find('"') {
                            let key = rest[..end].to_string();
                            self.cursor += 1 + end + 1;
                            self.state = ExtractorState::SeekingColon { key };
                        } else {
                            break;
                        }
                    } else if c == '}' {
                        self.state = ExtractorState::Done;
                        self.cursor += 1;
                    } else {
                        self.cursor += 1;
                    }
                }
                ExtractorState::SeekingColon { key } => {
                    if c == ':' {
                        let key = key.clone();
                        self.state = ExtractorState::InStringValue {
                            key,
                            out: String::new(),
                            escape: false,
                        };
                        self.cursor += 1;
                        while self.cursor < bytes.len()
                            && matches!(bytes[self.cursor], ' ' | '\t' | '\n' | '\r')
                        {
                            self.cursor += 1;
                        }
                        if self.cursor < bytes.len() && bytes[self.cursor] == '"' {
                            self.cursor += 1;
                        } else {
                            break;
                        }
                    } else {
                        self.cursor += 1;
                    }
                }
                ExtractorState::InStringValue { key, out, escape } => {
                    if *escape {
                        let ch = match c {
                            'n' => '\n',
                            't' => '\t',
                            'r' => '\r',
                            '"' => '"',
                            '\\' => '\\',
                            '/' => '/',
                            other => other,
                        };
                        if key == "prompt" {
                            events.push(ExtractorEvent::PromptDelta(ch.to_string()));
                        } else {
                            out.push(ch);
                        }
                        *escape = false;
                        self.cursor += 1;
                    } else if c == '\\' {
                        *escape = true;
                        self.cursor += 1;
                    } else if c == '"' {
                        let key_done = key.clone();
                        let out_done = out.clone();
                        self.cursor += 1;
                        if key_done == "intent" && !self.intent_emitted {
                            self.intent_emitted = true;
                            events.push(ExtractorEvent::Intent(out_done));
                        }
                        self.state = ExtractorState::SeekingNextKey;
                    } else {
                        if key == "prompt" {
                            events.push(ExtractorEvent::PromptDelta(c.to_string()));
                        } else {
                            out.push(c);
                        }
                        self.cursor += 1;
                    }
                }
                ExtractorState::SeekingNextKey => {
                    if c == ',' {
                        self.state = ExtractorState::SeekingKey;
                        self.cursor += 1;
                    } else if c == '}' {
                        self.state = ExtractorState::Done;
                        self.cursor += 1;
                    } else {
                        self.cursor += 1;
                    }
                }
                ExtractorState::Done => break,
            }
        }
        events
    }

    pub fn finalize(&self, raw: &str) -> (Option<String>, String) {
        if let Some(start) = raw.find('{') {
            if let Some(end) = raw.rfind('}') {
                if end > start {
                    let candidate = &raw[start..=end];
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(candidate) {
                        let intent = val
                            .get("intent")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        let prompt = val
                            .get("prompt")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string())
                            .unwrap_or_else(|| raw.to_string());
                        return (intent, prompt);
                    }
                }
            }
        }
        (None, raw.to_string())
    }
}

const IMAGE_JSON_SYSTEM: &str = r#"You are PromptKitcha — an expert at writing text-to-image prompts (DALL-E, Midjourney, SD/FLUX, Imagen, etc).
Output ONLY a JSON object. No markdown fences, no commentary before or after.
Schema: {"prompt":"<one detailed image prompt, English unless the user idea is in another language — then match that language>","tips":["2-4 short tips as strings"]}
Rules: The "prompt" must be a single ready-to-paste block (you may use commas or short lines). Apply the given TECHNIQUE to structure style, subject, lighting, camera, and composition. Preserve concrete subjects from the user; add clarifying detail without inventing unrelated facts."#;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImagePromptGenRequest {
    pub technique_id: String,
    pub technique_name: String,
    pub technique_blurb: String,
    pub user_input: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImagePromptGenResponse {
    pub prompt: String,
    pub tips: Vec<String>,
}

fn parse_image_json_output(raw: &str) -> Result<ImagePromptGenResponse, String> {
    if let Some(start) = raw.find('{') {
        if let Some(end) = raw.rfind('}') {
            if end > start {
                let candidate = &raw[start..=end];
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(candidate) {
                    let Some(p) = val.get("prompt").and_then(|v| v.as_str()) else {
                        return Err("missing prompt field in model JSON".to_string());
                    };
                    let prompt = p.to_string();
                    let tips: Vec<String> = val
                        .get("tips")
                        .and_then(|t| t.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                .collect()
                        })
                        .unwrap_or_default();
                    return Ok(ImagePromptGenResponse { prompt, tips });
                }
            }
        }
    }
    Err("no valid JSON in model output".to_string())
}

#[tauri::command]
pub async fn generate_image_prompt(
    state: State<'_, SharedState>,
    req: ImagePromptGenRequest,
) -> Result<ImagePromptGenResponse, String> {
    let cfg = state.config.read().clone();
    let provider_id = cfg.provider;
    let model = cfg.model;
    let base_url = cfg.base_url;
    let max_chars = cfg.max_input_chars;
    let body: String = if req.user_input.chars().count() > max_chars {
        let t: String = req.user_input.chars().take(max_chars).collect();
        format!("{t}\n\n[truncated at {max_chars} chars]")
    } else {
        req.user_input.clone()
    };
    let user = format!(
        "TECHNIQUE_ID: {}\nTECHNIQUE: {}\nWHAT THIS MEANS: {}\n\nUSER IDEA:\n{}",
        req.technique_id, req.technique_name, req.technique_blurb, body
    );
    let provider = build(&provider_id, base_url.as_deref()).map_err(|e| e.to_string())?;
    let chat = ChatRequest {
        model,
        system: IMAGE_JSON_SYSTEM.to_string(),
        user,
        temperature: 0.45,
        max_tokens: 2000,
    };
    let mut stream = provider
        .stream_chat(chat)
        .await
        .map_err(|e| e.to_string())?;
    let mut raw = String::new();
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(t) => raw.push_str(&t),
            Err(e) => return Err(e.to_string()),
        }
    }
    parse_image_json_output(&raw)
}

