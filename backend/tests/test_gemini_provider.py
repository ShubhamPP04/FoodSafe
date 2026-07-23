import unittest
from unittest.mock import patch

from services import ai_service


class FakeResponse:
    status_code = 200

    def raise_for_status(self):
        return None

    def json(self):
        return {
            "choices": [{"message": {"content": '{"status":"ok"}'}}],
            "usage": {"prompt_tokens": 3, "completion_tokens": 2},
        }


class FakeAsyncClient:
    last_request = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def post(self, url, *, headers, json):
        type(self).last_request = (url, headers, json)
        return FakeResponse()


class GeminiProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_gemini_text_request_uses_compatible_endpoint(self):
        with (
            patch.object(ai_service, "GEMINI_KEY", "test-key"),
            patch.object(ai_service, "GEMINI_MODEL", "gemini-test"),
            patch.object(ai_service.httpx, "AsyncClient", FakeAsyncClient),
        ):
            result = await ai_service._call_gemini("system", "user", max_tokens=123)

        url, headers, payload = FakeAsyncClient.last_request
        self.assertEqual(result, {"status": "ok"})
        self.assertTrue(url.endswith("/v1beta/openai/chat/completions"))
        self.assertEqual(headers["Authorization"], "Bearer test-key")
        self.assertEqual(payload["model"], "gemini-test")
        self.assertEqual(payload["max_tokens"], 123)
        self.assertEqual(payload["messages"], [
            {"role": "system", "content": "system"},
            {"role": "user", "content": "user"},
        ])

    async def test_gemini_vision_request_embeds_image(self):
        with (
            patch.object(ai_service, "GEMINI_KEY", "test-key"),
            patch.object(ai_service, "GEMINI_MODEL", "gemini-test"),
            patch.object(ai_service.httpx, "AsyncClient", FakeAsyncClient),
        ):
            result = await ai_service._call_gemini_vision(
                "system", "inspect", "YWJj", "image/png", max_tokens=321
            )

        _, _, payload = FakeAsyncClient.last_request
        image = payload["messages"][1]["content"][1]["image_url"]["url"]
        self.assertEqual(result, {"status": "ok"})
        self.assertEqual(image, "data:image/png;base64,YWJj")
        self.assertEqual(payload["max_tokens"], 321)
