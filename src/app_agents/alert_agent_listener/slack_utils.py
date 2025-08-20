from app_agents.alert_agent_listener.const import ChannelType


def channel_type_is(kind: ChannelType):
    async def _matcher(body, **kwargs) -> bool:
        return body.get("event", {}).get("channel_type") == kind.value
    return _matcher


async def fetch_last_messages_in_im(client, channel: str, latest_ts: str | None = None, limit: int = 4):
    """
    Returns a list of strings like: "Alice: hello" in chronological order.
    If latest_ts is provided, it anchors the query at that message (inclusive).
    """
    params = {"channel": channel, "limit": limit}
    if latest_ts:
        params.update({"latest": latest_ts, "inclusive": True})

    resp = await client.conversations_history(**params)
    msgs = resp.get("messages", [])

    # Slack returns newest-first; flip to chronological and clamp to limit
    msgs = list(reversed(msgs[:limit]))

    # Resolve user display names (IMs typically have only one human, but this is general)
    user_ids = {m["user"] for m in msgs if "user" in m}
    name_of = {}
    for uid in user_ids:
        ui = await client.users_info(user=uid)
        u = ui["user"]
        name_of[uid] = (
            u.get("profile", {}).get("display_name")
            or u.get("real_name")
            or u.get("name")
            or uid
        )

    def author_for(m):
        if "user" in m:
            return "user"
        if "bot_profile" in m:
            # bot_profile.name is usually the app’s display name
            return "assistant"
        return "System"

    def text_of(m):
        message_text = m.get("text", "") or "[no text]"
        if "user" in m:
            user_name = name_of.get(m["user"], m["user"])
            message_text =  f"{user_name}: {message_text}"
        return message_text


    return [{"role": author_for(m), "content": text_of(m)} for m in msgs]