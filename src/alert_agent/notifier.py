"""Slack notifier for alert summaries.

Delivers summary to configured Slack channel with retries and thread support.
Handles message splitting and exponential backoff for rate limits.
"""


async def send_to_slack(summary: str, channel_id: str):
    """Send summary to Slack channel.
    
    Args:
        summary: The markdown summary to send.
        channel_id: Slack channel ID to post to.
        
    Returns:
        Success status and message timestamp.
    """
    pass


async def post_message(channel: str, text: str, thread_ts: str = None):
    """Post a message to Slack using chat.postMessage API.
    
    Args:
        channel: Channel ID to post to.
        text: Message text to post.
        thread_ts: Optional thread timestamp for threaded replies.
        
    Returns:
        Slack API response.
    """
    pass


def split_for_slack(text: str, max_length: int = 4000):
    """Split long text into Slack-friendly chunks.
    
    Args:
        text: Text to split.
        max_length: Maximum length per message.
        
    Returns:
        List of text chunks.
    """
    pass