import os
from loguru import logger
from openai import AsyncOpenAI
from dataclasses import dataclass
from openai.types.chat import ChatCompletion
from openai.lib.streaming.chat._completions import ChatCompletionStreamState


@dataclass
class LLMResponse:
    completion_text: str
    raw_response: ChatCompletion | None = None
    is_chunk: bool = False


class ProviderOpenAI:
    def __init__(self, api_key: str, model: str, base_url: str | None = None):
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        self.model = model

    async def text_chat(
        self,
        prompt: str,
        images: list[str] | None = None,  # base64
        context: list | None = None,
        system_prompt: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ):
        model = model or self.model
        context = context or []

        query = {"role": "user", "content": prompt}
        if images:
            content = [{"type": "text", "text": prompt}]
            content.extend(
                [{"type": "image_url", "image_url": {"url": img}} for img in images]  # type: ignore
            )  # type: ignore
            query["content"] = content  # type: ignore

        query = [*context, query]
        if system_prompt:
            query.insert(0, {"role": "system", "content": system_prompt})

        resp = await self.client.chat.completions.create(
            model=model,
            messages=query,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        content = resp.choices[0].message.content
        if not content:
            raise ValueError("No content returned from OpenAI API")

        return LLMResponse(
            completion_text=content.strip(),
            raw_response=resp,
        )

    async def text_chat_stream(
        self,
        prompt: str,
        images: list[str] | None = None,  # base64
        context: list | None = None,
        system_prompt: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ):
        model = model or self.model
        context = context or []

        query = {"role": "user", "content": prompt}
        if images:
            content = [{"type": "text", "content": prompt}]
            content.extend(
                [{"type": "image_url", "image_url": {"url": img}} for img in images]  # type: ignore
            )  # type: ignore
            query["content"] = content  # type: ignore

        query = [*context, query]
        if system_prompt:
            query.insert(0, {"role": "system", "content": system_prompt})

        stream = await self.client.chat.completions.create(
            model=model,
            messages=query,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        state = ChatCompletionStreamState()

        async for chunk in stream:
            try:
                state.handle_chunk(chunk)
            except Exception as e:
                logger.warning("Saving chunk state error: " + str(e))
            if len(chunk.choices) == 0:
                continue
            delta = chunk.choices[0].delta
            yield LLMResponse(
                completion_text=delta.content.strip() if delta.content else "",
                is_chunk=True,
            )

        # TODO(Soulter): Handle final completion
        # final_completion = state.get_final_completion()
        # if final_completion:
        #     yield LLMResponse(
        #         completion_text=final_completion.content.strip(),
        #         raw_response=final_completion,
        #     )
        # else:
        #     logger.warning("No final completion found in stream response")


# global
provider_openai = ProviderOpenAI(
    api_key=os.getenv("OPENAI_API_KEY", ""),
    model=os.getenv("OPENAI_MODEL", "gpt-4o"),
    base_url=os.getenv("OPENAI_BASE_URL", None),
)
