# pi-qwencloud-provider 🚀

[![npm](https://img.shields.io/npm/v/pi-qwencloud-provider)](https://www.npmjs.com/package/pi-qwencloud-provider)
[![npm downloads](https://img.shields.io/npm/dm/pi-qwencloud-provider)](https://www.npmjs.com/package/pi-qwencloud-provider)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/jellydn/pi-qwencloud-provider/workflows/CI/badge.svg)](https://github.com/jellydn/pi-qwencloud-provider/actions)

> QwenCloud provider for [pi](https://github.com/earendil-works/pi) — Qwen3.7, DeepSeek V4, GLM-5.2, Wan image generation, and HappyHorse video generation through QwenCloud's OpenAI-compatible API.

QwenCloud uses a **static API key** (no OAuth) and exposes an **OpenAI-compatible Chat Completions API**, so no custom streaming protocol is needed — pi's built-in `openai-completions` streaming handles SSE parsing, tool calls, and usage tracking.

## 📦 Installation

### As a pi extension (recommended)

```sh
pi install npm:pi-qwencloud-provider
# or from git
pi install git:github.com/jellydn/pi-qwencloud-provider
# or local path
pi install /path/to/pi-qwencloud-provider
```

### As an npm package

```sh
npm install pi-qwencloud-provider
# or
pnpm add pi-qwencloud-provider
```

> **Note:** This package requires `@earendil-works/pi-ai` and `@earendil-works/pi-coding-agent` as peer dependencies. They are automatically available when installed as a pi extension; install them manually when using as a standalone npm dependency.

## Pre-requirements

- [pi](https://github.com/earendil-works/pi) coding agent
- A [QwenCloud](https://home.qwencloud.com) Token Plan subscription

## Features

- **Full streaming** via QwenCloud's OpenAI-compatible `/chat/completions` endpoint — SSE parsing, tool calls, and usage tracking handled by pi's built-in `openai-completions` streaming
- **Per-model thinking level support** — maps pi's 6 thinking levels (`off` / `minimal` / `low` / `medium` / `high` / `xhigh`) to provider-specific `reasoning_effort` values, with per-model capability matrices (see table below)
- **Per-token cost tracking** against QwenCloud reference pricing
- **Static API key auth** — no OAuth flow; paste your key once via `pi /login` or set `QWENCLOUD_API_KEY`
- **API key auto-discovery** from the `QWENCLOUD_API_KEY` env var or `~/.pi/agent/auth.json`
- **Dynamic model discovery** — fetches the live model list from the QwenCloud `/models` endpoint at startup (5s timeout), falling back to a curated static list on error
- **`/login` integration** — opens the QwenCloud dashboard and prompts for a paste; keys are sanitized (terminal paste wrappers and control chars stripped)
- **Modular architecture** — 13 focused source modules (`env`, `auth`, `thinking`, `catalog`, `discovery`, `models`, `oauth`, `error-handler`, `errors`, `utils`, `wan`, `happyhorse`) + entry point (`index`), all covered by per-module unit tests

## Supported Models

| Model               | Model ID                        | Context | Reasoning                   |
| :------------------ | :------------------------------ | :------ | :-------------------------- |
| Qwen3.8 Max Preview | `qw/qwen3.8-max-preview` | 262K    | low / medium / high         |
| Qwen3.7 Max         | `qw/qwen3.7-max`         | 262K    | low / medium / high         |
| Qwen3.7 Plus        | `qw/qwen3.7-plus`        | 1M      | low / medium / high         |
| Qwen3.6 Flash       | `qw/qwen3.6-flash`       | 131K    | low / medium / high         |
| DeepSeek V4 Pro     | `qw/deepseek-v4-pro`     | 1M      | high (xhigh → max)          |
| GLM-5.2             | `qw/glm-5.2`             | 200K    | low / medium / high / xhigh |

> **Thinking levels**: pi supports 6 levels — `off`, `minimal`, `low`, `medium`, `high`, `xhigh`. Each model declares which levels it supports, mapped to the provider's `reasoning_effort` parameter. Set the thinking level with pi's `--thinking` flag or `/thinking` command. A level marked as unsupported maps to `null` — no `reasoning_effort` is sent to the API, so the model runs with its default reasoning behavior.
>
> **Image & video generation**: Wan (image) and HappyHorse (video) are available via slash commands — `/wan` for image generation and `/happyhorse` for video generation. They use separate API endpoints (not chat/completions) and are not available for chat.

## Authentication

QwenCloud uses **static API keys** (no OAuth). The extension resolves the key in this order:

1. Explicit key passed to `pi /login`
2. `QWENCLOUD_API_KEY` environment variable
3. `~/.pi/agent/auth.json` — `{ "apiKey": "..." }`, `{ "qw": "..." }`, or `{ "qw": { "access": "..." } }`

Set the environment variable:

```sh
echo 'export QWENCLOUD_API_KEY="your_key_here"' >> ~/.zshrc
source ~/.zshrc
```

Or run `pi /login` and select **QwenCloud** — it opens the dashboard and prompts you to paste your key (sanitized on input).

## Usage

```sh
# Non-interactive
pi --model qw/qwen3.7-plus -p "Explain async/await in JavaScript"

# Interactive
pi --model qw/deepseek-v4-pro

# List available models
pi --list-models qw

# Generate an image with Wan
pi --model qw/qwen3.7-plus -p "/wan a cyberpunk cat on a rainy street"

# Generate a video with HappyHorse
pi --model qw/qwen3.7-plus -p "/happyhorse a sunset over the ocean"

# Use in another project
cd my-project
pi --model qw/glm-5.2 --trust "Refactor the auth module"
```

Switch models in-session with `/model qw/qwen3.7-max`.

### Thinking levels

Set the reasoning effort per model using pi's `--thinking` flag or the in-session `/thinking` command:

```sh
# Use high reasoning with DeepSeek V4 Pro
pi --model qw/deepseek-v4-pro --thinking high -p "Design a scalable microservice architecture"

# GLM-5.2 supports four levels up to xhigh
pi --model qw/glm-5.2 --thinking xhigh -p "Solve this complex math proof"

# Disable reasoning for a quick code gen task
pi --model qw/qwen3.6-flash --thinking off -p "Write a React form component"
```

Each model's supported thinking levels are listed in the [Supported Models](#supported-models) table above. Unsupported levels are not sent to the API — the model runs with its default reasoning behavior.

## Environment Variables

| Variable             | Description               | Default                                                                  |
| :------------------- | :------------------------ | :----------------------------------------------------------------------- |
| `QWENCLOUD_API_KEY`  | Your QwenCloud API key    | —                                                                        |
| `QWENCLOUD_API_BASE` | Override the API base URL | `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` |

## Run tests

```sh
npm test
```

## Pre-commit

This project uses [prek](https://github.com/earendil-works/prek) to enforce code quality. To install hooks:

```sh
prek install
```

## Notes

- **Pricing**: Per-token costs are reference values for usage tracking only. QwenCloud uses tiered pricing by input length for long-context models — the values in the catalog are entry-tier estimates and may not reflect your actual bill.
- **Context windows**: taken from QwenCloud model docs — verify against the live `/models` endpoint.
- **Custom API base**: set `QWENCLOUD_API_BASE` env var to override the endpoint.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## author

👤 **Huynh Duc Dung**

- Website: https://productsway.com/
- Twitter: [@jellydn](https://twitter.com/jellydn)
- Github: [@jellydn](https://github.com/jellydn)

## Show your support

Give a ⭐️ if this project helped you!

<a href="https://ko-fi.com/dunghd">
  <img src="https://img.shields.io/badge/ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white" alt="ko-fi">
</a>
<a href="https://paypal.me/dunghd">
  <img src="https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white" alt="PayPal">
</a>
<a href="https://www.buymeacoffee.com/dunghd">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee">
</a>
