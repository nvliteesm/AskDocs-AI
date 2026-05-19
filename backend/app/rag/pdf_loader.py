from typing import Dict, List

import fitz


def extract_text_from_pdf(file_path: str) -> List[Dict]:
    """
    Extract text page by page from a PDF.
    """
    pages = []

    doc = fitz.open(file_path)

    for page_index, page in enumerate(doc):
        text = page.get_text("text")

        pages.append({
            "page_number": page_index + 1,
            "text": text.strip(),
        })

    doc.close()

    return pages