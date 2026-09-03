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

### 1. 安装插件

在你的 DeepSeek Harness (dsh) 项目根目录下安装：

```bash
npm install dsh-plugin-garmin
```

或在 `dsh.config.ts` / 插件配置中载入：

```typescript
import * as GarminPlugin from 'dsh-plugin-garmin'

export default {
  plugins: [GarminPlugin]
}
```

### 2. Linux 宿主系统环境准备 (用于生成真机 .prg 固件)

如果需要直接在 Linux 环境中完成 `.prg` 编译打包，建议预装以下环境：

```bash
# 1. 安装 Java 运行时环境 (Connect IQ 编译器底层需要 Java 8+)
sudo apt-get update
sudo apt-get install -y default-jre-headless openssl

# 2. (可选) 下载 Garmin Connect IQ SDK (Linux 版)
# 插件会自动扫描系统 PATH 以及 ~/.Garmin/ConnectIQ/Sdks/ 目录
```

> **提示**：如果未安装 `monkeyc`，插件仍然可以完整支持**表盘设计、SVG 实时预览与 Monkey C 源码脚手架生成**，用户可将生成的源码工程直接用 VS Code Garmin 插件编译。

---

## 🛠️ 注册的 Agent 工具列表

插件向 dsh 上下文注入了专属的 System Prompt 规范，并注册了 4 个核心 Agent 工具：

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

## ⚠️ 免责声明 (Disclaimer)

- **非官方项目**：本项目为开源社区第三方开发的 DeepSeek Harness 扩展插件，与 **Garmin Ltd.（佳明）** 无官方合作、赞助或背书关系。
- **商标声明**：`Garmin`、`Connect IQ`、`Monkey C`、`Fenix` 均为 Garmin Ltd. 或其附属公司的注册商标。

---

## 📄 开源许可证

本项目采用 [MIT License](LICENSE) 开源许可证。
欢迎提交 Issue 和 Pull Request 共建！



