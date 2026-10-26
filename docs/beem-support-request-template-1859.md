# Beem support request — WhatsApp template 1859 rejected

**To:** support@beem.africa
**Subject:** WhatsApp template 1859 — "Template id and channel do not match" on api-send

Hello Beem team,

We are sending an approved WhatsApp template through the Broadcast API and
every request is rejected. Please confirm the template/channel association
on our account.

**Request** (exactly as our system sends it; numbers partly masked here — the
full sender number is the WhatsApp number registered on our Beem account):

```
POST https://apibroadcast.beem.africa/v1/broadcast/template/api-send
Authorization: Basic <api_key:secret>
Content-Type: application/json

{"from_addr":"255XXXXXXXXX",
 "destination_addr":[{"phoneNumber":"255674022265","params":["<guest name>","<event name>","<event date>","<event time>","<venue>","<invitation URL>"]}],
 "channel":"whatsapp",
 "messageTemplateData":{"id":1859}}
```

**Response:** HTTP 400
`API_INVALID_PARAMETER: Template id and channel do not match. Contact support if the issue persists.`

`GET https://apichatcore.beem.africa/v1/message-templates/list` (as in your
Moja docs) returns HTTP 404 `Cannot GET /v1/message-templates/list` for our
account, so we cannot check the association ourselves.

**Template:** "KADI YA MWALIKO" — six variables:

```
Habari {{0}}, Tunayofuraha kukualika/kuwaalika kuhudhuria:

💍 {{1}}
🗓️ Tarehe: {{2}}
🕒 Muda: {{3}}
📍 Mahali: {{4}}

Fungua mwaliko wako rasmi hapa:
{{5}}

Karibu sana!
```

**Please confirm:**

1. Is **1859** the Beem template `id` to use in `messageTemplateData.id`
   (and not the Meta `template_id`)?
2. Is template 1859 **approved/enabled for WhatsApp** and assigned to the
   sender number we use in `from_addr` (please state that number's exact
   format, e.g. `2557XXXXXXXX`)? If it belongs to a different channel/sender,
   which one — or can it be assigned to ours?
3. Are the six `params` filled in order (first value → first placeholder),
   so `{{0}}…{{5}}` map to params[0]…params[5]?
4. Does our template need a `content.mediaUrl` (header media), or is it text-only?
5. Is the template-list endpoint available for our account, and at which URL?

Thank you.
