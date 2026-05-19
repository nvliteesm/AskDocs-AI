import re


def clean_text(text: str) -> str:
    """
    Basic cleanup for extracted PDF text.
    """
    text = text.replace("\x00", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()