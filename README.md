# ⌚ dsh-plugin-garmin

> **自然语言驱动的 Garmin Fenix 7 表盘生成与全自动 PRG 编译引擎插件**  
> *Garmin Watch Face Generator & Workbench Plugin for DeepSeek Harness (dsh)*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ES2022-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green)](https://nodejs.org/)
[![Garmin Connect IQ](https://img.shields.io/badge/Connect%20IQ-4.x%20%2F%205.x-orange)](https://developer.garmin.com/connect-iq/)

`dsh-plugin-garmin` 是专为 **DeepSeek Harness (dsh)** 打造的领域专用扩展插件。用户只需在聊天窗口中通过**自然语言对话**，即可完成针对 **Garmin Fenix 7** 系列（260×260、64 色 MIP 显示屏）的表盘设计、矢量仿真预览、资源合规校验、Monkey C 源码生成以及最终 `.prg` 安装二进制的编译打包。

---

## ✨ 核心特性

- 🗣️ **对话式表盘生成**：向 Agent 描述需求（如“*生成一款战术风表盘，带橙色分钟指针、心率弧环与电量进度条*”），全流程自动化驱动。
- 🎨 **MIP 64 色硬件合规守护**：内置 Garmin Fenix 7 专用的 64 色 Memory-in-Pixel 调色板映射与欧氏距离色彩吸附算法，杜绝不可渲染的色彩错误。
- 🖥️ **高保真 260×260 矢量模拟器**：将声明式表盘规范（`WatchFaceSpec`）即时渲染为 SVG 视图，内置夜间背光模式与 1Hz 动态仿真。
- ⚡ **动态 Monkey C 源码生成引擎**：彻底告别写死模板，根据布局规范动态插桩指针三角函数运算、电量/心率/步数传感器安全查询与休眠模式低功耗（Sleep Mode）处理。
- 🔑 **免交互开发者密钥签发**：无头 Linux 环境下自动调用 OpenSSL 生成 Garmin 必需的 4096 位 RSA 私钥（PKCS#8 DER 规范），免去手动配置烦恼。
- 🛠️ **一键编译与环境诊断**：集成 `garmin_build` 与 `garmin_env`，支持调用 `monkeyc` 编译器直接输出可侧载（Sideload）的 `.prg` 固件，并提供清晰的环境缺失诊断。
- 🎛️ **Web 仿真工作台 (Workbench UI)**：提供独立的三栏式表盘设计工作室（包含表圈模拟器、图层树、实时控件与环境诊断面板）。

---

## 🚀 快速上手

### 1. 源码编译与安装到 dsh

目前本插件**仅支持源码安装**（npm 包尚未发布）。安装步骤包含“本地编译”与“挂载到 dsh”两步：

#### 第一步：克隆仓库并编译源码

插件采用 TypeScript 开发，需要先编译生成 `dist/` 运行产物：

```bash
# 1. 克隆插件仓库
git clone https://github.com/your-org/dsh-plugin-garmin.git
cd dsh-plugin-garmin

# 2. 安装依赖并编译构建（会生成 dist/ 目录）
npm install
npm run build
```

#### 第二步：挂载进 DeepSeek Harness

DeepSeek Harness 基于 **Profile 机制**，你可以选择以下任一方式将插件挂载到 `dsh`：

- **方式 A：永久安装进 Profile（推荐）**  
  在 `dsh-plugin-garmin` 目录下直接执行：
  ```bash
  # 将当前本地目录添加到 dsh 的 web profile
  dsh plugin --profile web add .

  # 或者在任意路径下指定绝对路径
  dsh plugin --profile web add /path/to/dsh-plugin-garmin
  ```
  *(注：如果习惯使用命令行 Headless 模式，把 `--profile web` 改为 `--profile headless` 即可)*

- **方式 B：免安装一次性启动（适合临时测试）**  
  无需修改 profile 配置，启动时直接用 `--patch` 参数传入本项目的补丁文件：
  ```bash
  dsh web --patch /path/to/dsh-plugin-garmin/cordis.patch.yml
  ```

---

### 2. 验证插件是否生效

安装完成后，怎么确认 `dsh` 真的成功加载了本插件？有以下两种最直观的检验方式：

#### 验证方式 1：终端一行命令快速测试（最推荐，耗时 5 秒）

直接使用 `dsh` 的 headless 模式调用一次硬件规格查询工具：

```bash
dsh --profile headless "调用 garmin_specs 工具查询 Fenix 7 的硬件规格"
```

- **成功标志**：终端看到 Agent 成功调用了 `garmin_specs`，并输出了屏幕尺寸（260×260）、128KB 内存限制和 64 色 MIP 调色板信息。
- **失败标志**：Agent 表示“没有找到相关工具”或“无法处理 Garmin 规格”，说明插件未成功挂载。

#### 验证方式 2：在 Web 界面中对话验证

启动 Web 界面：
```bash
dsh web
```
浏览器打开 `http://127.0.0.1:3080`，在对话框中问 Agent：
> *“你现在可以使用哪些 Garmin 相关的工具？”*

如果 Agent 列出了 `garmin_specs`、`garmin_preview`、`garmin_scaffold`、`garmin_build` 等工具，即代表插件已经完全加载就绪！

> **提示（未配置 API Key 时如何验证防崩？）**：  
> 如果当前尚未配置 `DEEPSEEK_API_KEY`，完全不需要发起大模型对话，可直接运行以下离线指令验证基础集成**绝无崩溃（Zero Crash）**：
> ```bash
> # 1. 验证配置树合并（纯离线，检查输出中是否包含 garmin）
> dsh --profile web --patch ./cordis.patch.yml --dump-config | grep garmin
> 
> # 2. 验证 Web 服务与浏览器插件打包（无报错且成功输出端口即通过）
> dsh web --patch ./cordis.patch.yml --no-open
> ```

---

### 3. 运行与自然语言交互查询

插件生效后，可通过 **Web UI 交互** 或 **Headless 命令行任务** 两种方式与 Agent 协同生成表盘。

#### 模式 1：Web UI 对话交互（推荐，支持可视化预览与工作台）

启动 DeepSeek Harness Web 服务：

```bash
dsh web
# 或通过 npx 启动（默认监听 http://127.0.0.1:3080）
npx @deepseek-ai/dsh web --no-open
```

在浏览器中打开 `http://127.0.0.1:3080`，即可直接在对话输入框中以**自然语言**进行查询与指令生成：

- **硬件约束查询**：
  > “查询一下 Garmin Fenix 7 的屏幕尺寸、内存预算上限和 MIP 64 色调色板限制。”
- **表盘设计与 SVG 实时渲染**：
  > “帮我设计一款极简战术风表盘，带橙色指针、心率弧环与电量百分比，渲染预览图并检查色彩合规性。”
- **工程脚手架生成**：
  > “把刚才设计的表盘生成生产级 Connect IQ 源码工程，放在 `./output/tactical-wf` 目录。”
- **一键环境诊断与 .prg 固件编译**：
  > “检查当前编译环境，并将 `./output/tactical-wf` 编译打包为真机安装的 .prg 二进制文件。”

Web UI 会实时呈现 260×260 SVG 矢量渲染图、内存开销估算以及 MIP 调色板合规建议。

#### 模式 2：Headless 命令行单次任务模式（适合脚本与自动化）

对于 CI 批处理或习惯在终端运行的用户，可通过 `dsh --profile headless "<任务>"` 进行单次任务执行：

```bash
# 查询与检查环境
dsh --profile headless "检查当前系统是否已安装 Garmin Connect IQ SDK、Java 运行环境与开发者私钥"

# 一键端到端生成表盘工程
dsh --profile headless "为 Garmin Fenix 7 设计一款高对比度运动表盘，并在 ./fenix7-runner 生成完整 Monkey C 源码工程"
```

---

### 4. Linux 宿主系统环境准备 (用于生成真机 .prg 固件)

如果需要直接在 Linux 环境中完成 `.prg` 编译打包，建议预装以下环境：

```bash
# 1. 安装 Java 运行时环境与 OpenSSL (Connect IQ 编译器底层需要 Java 8+，密钥签发需要 OpenSSL)
sudo apt-get update
sudo apt-get install -y default-jre-headless openssl

# 2. (可选) 下载 Garmin Connect IQ SDK (Linux 版)
# 插件会自动扫描系统 PATH 以及 ~/.Garmin/ConnectIQ/Sdks/ 目录
# 也可以让 Agent 调用 garmin_env 工具自动诊断与引导配置
```

> **提示**：如果宿主环境尚未安装 `monkeyc`，插件仍然完整支持**表盘规格查询、规范设计、SVG 实时模拟仿真与 Monkey C 源码工程脚手架生成**，用户可将生成的工程直接用 VS Code Garmin Connect IQ 插件编译。

---

## 🛠️ 注册的 Agent 工具列表

插件向 dsh 上下文注入了专属的 System Prompt 规范，并注册了 5 个核心 Agent 工具：

| 工具名称 | 描述 | 核心输入参数 |
| :--- | :--- | :--- |
| **`garmin_specs`** | 获取 Fenix 7 的硬件约束（260×260 圆形、128KB 内存上限、64 色 MIP 调色板） | `device` (默认 `fenix7`) |
| **`garmin_preview`** | 验证声明式 `WatchFaceSpec` 并输出 260×260 SVG 及内存估算 | `spec`, `simulationState` |
| **`garmin_scaffold`** | 根据表盘模型一键生成生产级 Connect IQ 源码工程 | `projectDir`, `appName`, `clockType`, `spec` |
| **`garmin_build`** | 调用 `monkeyc` 编译器将工程编译为 `.prg` 二进制固件 | `projectDir`, `device`, `outputPrg`, `sdkPath` |
| **`garmin_env`** | 检查或一键自动初始化 Linux 编译环境与签名密钥 | `action` ("check" \| "setup"), `sdkPath` |

---

## 📲 如何安装到 Garmin 手表 (Sideload 侧载)

当插件成功编译出 `.prg` 文件后：

1. 使用 USB 数据线将 Garmin Fenix 7 连接至电脑。
2. 打开挂载的手表磁盘目录，进入 `GARMIN/` 文件夹。
3. 将生成的 `xxx.prg` 文件复制到 `GARMIN/APPS`（或某些固件版本的 `GARMIN/Debug`）目录中。
4. 安全弹出设备并拔掉数据线，手表将自动加载并应用新表盘。

---

## 🧪 本地开发与测试

```bash
# 克隆仓库
git clone https://github.com/your-org/dsh-plugin-garmin.git
cd dsh-plugin-garmin

# 安装开发依赖
npm install

# 编译 TypeScript
npm run build

# 运行全套端到端单元测试
npm test
```

---

## 🔄 RSI 递归自演进引擎 (Recursive Self-Improvement)

本项目内置针对表盘生成质量与硬件约束的自动评估与自递归提升系统，支持人类开发者与外部 AI Agent 自主推进成功率：

```bash
# 执行全量原型评估看板 (5 大典型表盘形态)
npm run rsi:eval

# 机器可读 JSON 输出 (供外部 AI Agent 自动化消费)
node rsi/loop.mjs --json

# 评估对比与演进 Delta 报告
node rsi/loop.mjs --compare rsi/history/latest.json
```

详细规范、实测演进报告与 Agent 协作 SOP 请查阅 [docs/RSI_FRAMEWORK.md](docs/RSI_FRAMEWORK.md)、[docs/RSI_EVOLUTION_LOG.md](docs/RSI_EVOLUTION_LOG.md) 与 [AGENTS.md](AGENTS.md)。

---

## ⚠️ 免责声明 (Disclaimer)

- **非官方项目**：本项目为开源社区第三方开发的 DeepSeek Harness 扩展插件，与 **Garmin Ltd.（佳明）** 无官方合作、赞助或背书关系。
- **商标声明**：`Garmin`、`Connect IQ`、`Monkey C`、`Fenix` 均为 Garmin Ltd. 或其附属公司的注册商标。

---

## 📄 开源许可证

本项目采用 [MIT License](LICENSE) 开源许可证。
欢迎提交 Issue 和 Pull Request 共建！



