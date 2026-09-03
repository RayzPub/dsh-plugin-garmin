# AGENTS.md

> 面向 AI Agent 与开发者的项目工程规范、架构基准及 DeepSeek Harness (dsh) 真实集成测试全流程指引。

---

## 🧭 项目使命与架构全景

`dsh-plugin-garmin` 是专为 **DeepSeek Harness (dsh)** 打造的领域专用扩展插件（包含 Host 端工具集与 Web 浏览器端交互式仿真工作台）。通过自然语言驱动 Garmin Fenix 7 表盘从需求构思、合规校验、矢量仿真、Monkey C 源码脚手架到最终真机 `.prg` 固件的一站式生成。

```
dsh-plugin-garmin/
├── src/
│   ├── index.ts                # Host 端入口：注册 5 个 Agent 工具与 System Prompt 注入
│   ├── prompts/                # Fenix 7 硬件合规与 Monkey C 规范专用提示词
│   ├── preview/                # 260×260 MIP 64 色调色板、欧氏距离吸附、DC 矢量仿真引擎与代码生成器
│   ├── tools/                  # garmin_specs, garmin_preview, garmin_scaffold, garmin_build, garmin_env
│   └── client/                 # 浏览器端前端插件：注册 tool.call.toolview（GarminPreviewRow.tsx）
├── scripts/
│   ├── build-client.mjs        # Client bundle 打包器（esbuild 输出 window.__ModuleLoader__.load 格式）
│   └── test-dsh-integration.mjs # 针对真实 dsh 的端到端集成测试脚本
├── cordis.patch.yml            # dsh 组合包声明层（dsh.bundle.patch）
├── dist/                       # 编译产物：dist/src/index.js (Host) 与 dist/client.js (Client)
└── test/
    └── plugin.test.ts          # 自动化端到端测试套件（17 项全面覆盖）
```

---

## 🧱 核心构建与双端交付规范

本项目采用 **Host / Client 双端分治架构**，任何 Agent 在修改代码后必须严格遵守以下规范：

### 1. Host 端规范 (`dist/src/index.js`)
- 由 `tsc` 转译输出，作为 Node.js 服务端模块运行于 dsh 宿主进程中。
- 负责注册 5 个核心工具（`garmin_specs`、`garmin_preview`、`garmin_scaffold`、`garmin_build`、`garmin_env`）。
- 负责注入 `garmin:fenix7-rules` 系统提示词片段（包含 260×260 圆形分辨率、128KB 内存预算、64 色 MIP 调色板）。

### 2. Client 端规范 (`dist/client.js`)
- **严禁直接输出裸 ESM `export *`**：dsh 的前端模块机制使用 Combo 脚本拼接多个插件（形如 `/plugins/??pkgA/client.js,pkgB/client.js...`），在经典 `<script>` 标签下执行。任何裸露的顶层 `export` 都会触发浏览器的 `SyntaxError: Unexpected token 'export'` 并导致所有插件加载瘫痪。
- **必须使用 [`scripts/build-client.mjs`](scripts/build-client.mjs)**：使用 `esbuild` 将 `src/client/index.ts` 打包为符合 dsh 规范的 CJS 闭包：
  ```javascript
  window.__ModuleLoader__.load({
    id: "dsh-plugin-garmin",
    factory: (require) => {
      var module = { exports: {} }; var exports = module.exports;
      // ...组件逻辑...
      return module.exports;
    }
  });
  ```
- **外部化平台模块**：`react`、`react/jsx-runtime`、`react-dom`、`@deepseek-ai/*` 必须标记为外部依赖（`external`），运行时由 dsh 模块表动态供给。

---

## 🧪 与真实 DeepSeek Harness (dsh) 项目集成测试指引

当需要将本插件接入真实的 `deepseek-harness` 仓库并进行真实集成测试时，请遵循以下标准流程：

### 步骤 1：准备真实 dsh 运行环境

可通过以下两种方式之一获取 `dsh` CLI：

- **方式 1：通过 npm 全局安装（推荐，最快就绪）**：
  ```bash
  npm install -g @deepseek-ai/dsh
  ```
  *(安装完成后，`dsh` 命令将直接可用，版本为 `0.1.1-rc.2` 或更高。)*

- **方式 2：从 deepseek-harness 源码仓库构建**：
  若在开发机上直接使用 `deepseek-harness` monorepo 源码：
  ```bash
  # 1. 全局安装 pnpm（如果系统未安装）
  npm install -g pnpm

  # 2. 进入 deepseek-harness 仓库完成依赖安装与全量构建
  cd /home/ubuntu/dsh/deepseek-harness
  pnpm install
  pnpm run build
  ```
  *(构建完成后，`apps/cli/lib/bin.js` 以及各核心模块的 `lib/client.js` 将全部生成完毕。)*

### 步骤 2：编译本插件

在 `dsh-plugin-garmin` 仓库根目录下执行完整构建：
```bash
npm run build
```
该命令会依次执行 `build:node`（编译 TypeScript）与 `build:client`（打包浏览器端 `dist/client.js`）。

### 步骤 3：挂载插件到 dsh Profile

由于 Node.js 模块解析机制要求 Profile 能定位到包名，请先将本地插件链接进目标 Profile：

```bash
# 在 dsh-plugin-garmin 仓库目录下直接执行：
dsh plugin --profile web add .
dsh plugin --profile headless add .

# 或在任意目录下指定绝对路径：
dsh plugin --profile web add /path/to/dsh-plugin-garmin
```
*(注：执行后，Profile 目录下的 `node_modules` 会软链接当前插件，且 `package.json` 中的 `dsh.profile.bundles` 会自动注册本插件。)*

### 步骤 4：执行真实端到端集成测试矩阵

#### 4.1 零 API Key 离线防崩集成验证（推荐优先运行）

当系统**未配置任何 LLM API Key（如 `DEEPSEEK_API_KEY`）**时，依然可以通过以下方式完整验证插件的加载、模块解析与服务集成，保证**绝对无崩溃（Zero Crash）**：

- **自动化脚本验证**：
  ```bash
  npm run test:integration
  ```
  *(注：该脚本内置了零凭据守护。在未检测到 API Key 时，会自动执行「配置树装载校验」与「Web 运行时启动冒烟测试」，验证进程启动无报错、客户端模块未被破坏且无语法崩溃，全绿通过。)*

- **手动执行零 Key 离线防崩指令**：
  ```bash
  # 1. 验证配置树合并与 Cordis Schema 解析（纯离线，秒级返回）
  dsh --profile web --patch ./cordis.patch.yml --dump-config | grep garmin

  # 2. 验证 Web 运行时与双端插件加载（纯离线，验证无 SyntaxError 崩溃）
  dsh web --patch ./cordis.patch.yml --no-open
  ```
  *(只要 Web 服务能正常输出监听端口、未抛出 `loaded without registering` 或 `SyntaxError: Unexpected token 'export'` 即可确认集成零崩溃。)*

#### 4.2 有 API Key 时的真实 Agent 对话与工具调用验证
配置好 `DEEPSEEK_API_KEY` 后，可执行完整的 Headless 矩阵指令：
```bash
# 1. 硬件规格查询测试 (garmin_specs)
dsh --profile headless --patch ./cordis.patch.yml \
  "调用 garmin_specs 工具查询 Fenix 7 规格"

# 2. 表盘矢量仿真与内存预算测试 (garmin_preview)
dsh --profile headless --patch ./cordis.patch.yml \
  "设计一款带电量、心率与橙色指针的战术表盘，调用 garmin_preview 渲染并在当前目录保存 preview.svg"

# 3. 完整 Monkey C 源码工程生成测试 (garmin_scaffold)
dsh --profile headless --patch ./cordis.patch.yml \
  "使用 garmin_scaffold 在 ./test-output-face 目录生成生产级 Garmin 工程"

# 4. 编译环境与开发者私钥诊断测试 (garmin_env)
dsh --profile headless --patch ./cordis.patch.yml \
  "调用 garmin_env 工具检查当前系统的 Java、Connect IQ SDK 与 RSA 开发者私钥"
```

#### 4.3 Web UI 浏览器端集成验证
启动 Web 服务：
```bash
dsh web --patch ./cordis.patch.yml --no-open
```
在浏览器中打开 `http://127.0.0.1:3080`，验证以下项：
1. **网络加载**：打开浏览器开发者工具 Network 面板，确认 `/plugins/??...` 请求返回 HTTP 200，响应正文中包含 `dsh-plugin-garmin`。
2. **模块注册**：控制台无 `SyntaxError`，无 `loaded without registering` 错误。
3. **UI 渲染**：让 Agent 生成表盘时，会话流中应成功渲染由 `GarminPreviewRow` 呈现的交互式表盘视图（包含背光切换、夜间模式、仿真数据与 SVG 视图）。

---

## 🛡️ 代码安全门禁与质量红线 (Invariants)

1. **测试基准必须 100% 通过**：任何代码改动前和提交前，必须运行 `npm test`，确保 17 项单元与端到端测试全绿。
2. **命令注入防护**：
   - 严禁在任何源码中使用未过滤的 `child_process.exec()`。
   - 所有 shell 参数调用必须使用 `execFile()` 或通过内置的 `quoteSh()` 工具函数转义。
   - 严格白名单校验 `device` 参数（只允许 `fenix7`, `fenix7s`, `fenix7x` 等）。
3. **MIP 64 色硬件合规**：
   - 所有的色彩映射必须经过 `mapColorToGarminMIP64()` 吸附算法，禁止在 WatchFaceSpec 中产生无法被 Fenix 7 显示屏渲染的非法 Hex 颜色。
4. **无头环境密钥安全**：
   - 生成 4096 位 RSA 开发者私钥时，首选 `node:crypto.generateKeyPairSync` 直接输出 PKCS#8 DER 格式，免去外部 OpenSSL 依赖；若环境缺少 crypto 则自动降级至安全转义的 openssl 命令行调用。
