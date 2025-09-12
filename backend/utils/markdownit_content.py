import asyncio
from markitdown_no_magika import MarkItDown


class MarkdownitContent:
    def __init__(self) -> None:
        self.md = MarkItDown(enable_plugins=False)

    async def markdownit(self, source: str) -> str:
        """Convert the content to Markdown format."""
        result = await asyncio.to_thread(self.md.convert, source)

        return result.text_content


markdownit_helper = MarkdownitContent()
