from enum import Enum

class ChannelType(str, Enum):
    CHANNEL = "channel"
    GROUP = "group"
    IM = "im"
    MPIM = "mpim"
    