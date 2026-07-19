# pi-qwencloud-provider

QwenCloud provider for [pi](https://github.com/jellydn/pi) — access Qwen3.8, DeepSeek V4, GLM-5.2, Wan image generation, and HappyHorse video generation through QwenCloud's OpenAI-compatible API.

## Setup

1. Sign up at [home.qwencloud.com](https://home.qwencloud.com) and get a Token Plan
2. Create an API key (navigate to **API Keys** in your dashboard)
3. Install the extension:
   ```bash
   pi install git:github.com/jellydn/pi-qwencloud-provider
   ```
4. Run `pi /login` and select **QwenCloud**, then paste your API key
5. Use `/model` to select a QwenCloud model

Alternatively, set the `QWENCLOUD_API_KEY` environment variable:
```bash
export QWENCLOUD_API_KEY="your-api-key"
```

## Supported Models

### Text & Reasoning
| Model | Context | Reasoning | Description |
|-------|---------|-----------|-------------|
| `qwencloud/qwen3.8-max-preview` | 262K | ✅ | Complex reasoning and coding |
| `qwencloud/qwen3.7-plus` | 1M | ✅ | Balanced performance, speed, and cost |
| `qwencloud/qwen3.7-max` | 262K | ✅ | Premium reasoning |
| `qwencloud/qwen3.6-flash` | 131K | ✅ | Fast and cost-effective |
| `qwencloud/deepseek-v4-pro` | 1M | ✅ | DeepSeek V4 Pro |
| `qwencloud/glm-5.2` | 200K | ✅ | Zhipu AI GLM-5.2 |

### Image Generation
| Model | Description |
|-------|-------------|
| `qwencloud/wan2.7-image` | Wan2.7 text-to-image |
| `qwencloud/wan2.7-image-pro` | Wan2.7 text-to-image (higher quality) |

### Video Generation
| Model | Description |
|-------|-------------|
| `qwencloud/happyhorse-1.1-i2v` | Image-to-video |
| `qwencloud/happyhorse-1.1-t2v` | Text-to-video |
| `qwencloud/happyhorse-1.1-r2v` | Reference-to-video |

> **Note:** Image and video generation models use separate API endpoints. They are listed in the catalog for discovery but may not work through the standard chat completions interface.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `QWENCLOUD_API_KEY` | Your QwenCloud API key | — |
| `QWENCLOUD_API_BASE` | Override the API base URL | `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` |

## License

MIT
