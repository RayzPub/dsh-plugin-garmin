# Garmin Fenix 7 表盘生成真实环境基准评估与 RSI 优化路线图

> 本文档记录基于真实 `deepseek-harness` (dsh) 与 LLM 运行环境下的表盘生成任务轨迹分析、成功率瓶颈诊断及自递归自我提升 (RSI) 架构规划。

---

## 📊 一、 首批基准任务规划与执行成果

我们针对 Garmin Fenix 7（260×260 MIP 64色）的三种典型形态，规划并运行了端到端生成任务，产物保存在 `./eval-runs/`：

| 评估任务 | 目标形态与规格 | 产出路径 | 运行状态 |
|---|---|---|---|
| **任务 1: Tactical Stealth** | 战术混合表盘：橙色指针、纯黑底色、底部电量进度条、心率/步数弧环、顶部数字时间 | `./eval-runs/tactical/` | ✅ 预览 + 源码全部交付 |
| **任务 2: Sport Runner** | 竞技纯数字表盘：荧光绿大字时间 (`FONT_NUMBER_HOT`)、外圈步数进度环、心率与卡路里微件、日期 | `./eval-runs/sport/` | ✅ 预览 + 源码全部交付 |
| **任务 3: Aviator Pilot** | 经典飞行员模拟指针表盘：粗体夜光时分针、橙黄细秒针、12/3/6/9 经典大刻度、气压海拔计、日期视窗 | `./eval-runs/pilot/` | ✅ 预览 + 源码全部交付 |

---

## 🔍 二、 全链路五个步骤执行轨迹与瓶颈分析

通过回溯真实会话轨迹（`session.jsonl`），我们对 5-Step Protocol 的各个环节成功率进行深入剖析：

```
[1. garmin_specs] -> [2. garmin_preview] -> [3. garmin_scaffold] -> [4. 静态门禁] -> [5. garmin_build]
   成功率 100%           成功率 85%            首次成功率 40%         通过率 50%        受环境约束
```

### 1. 步骤 1 (`garmin_specs`)：硬件规格查询
- **首次成功率**：100%
- **表现**：Agent 快速获得 260×260、128KB 预算及 64 色调色板，格式严谨，无歧义。

### 2. 步骤 2 (`garmin_preview`)：矢量仿真与色彩预算
- **首次成功率**：85%
- **瓶颈与摩擦点**：
  - **参数别名容错缺失**：工具描述写明 `battery`，但内部模型校验为 `batteryPercent`。Agent 传入 `{ battery: 72 }` 时未能覆盖默认 86% 电量。类似别名如 `hour/hours`、`min/minutes` 同样存在映射需求。
  - **模板微件覆盖机制**：部分模板微件定义较为精简，当用户需求与模板存在差异时，需要更灵活的局部合并能力。

### 3. 步骤 3 (`garmin_scaffold`)：Monkey C 脚手架工程生成（最大痛点）
- **首次成功率**：40%
- **核心矛盾：预览与生成的 Monkey C 代码严重脱节**：
  - 在 `dc-emulator.ts`（SVG 预览）中，`arc_progress` 呈现为优雅的弧形环，`bar_progress` 呈现为按百分比填充的电量条，`badge` 呈现为视窗边框。
  - 但在 `code-generator.ts`（Monkey C 代码生成器）中，所有微件一律被粗暴降级为单行文字 `dc.drawText("HR " + ...)`！
  - 甚至 `altitude`（高度计）在生成器中缺失分支，直接输出字符串字面量 `"alt"`。
- **后果**：三个任务中，Agent 均在拿到脚手架后**被迫额外花费大量轮次重写 `View.mc`**，不仅极大拖慢交付速度，而且消耗数倍 Token。

### 4. 步骤 4 (Pre-Build 静态门禁)：代码合规与规范校验
- **首次通过率**：50%
- **问题定位**：
  - **零分配违规**：脚手架生成的代码在 `onUpdate()` 中包含 `var hours = [12, 3, 6, 9];`，每秒分配数组，撞上自身静态门禁。
  - **Manifest XSD 缺失**：脚手架未默认生成 `<iq:languages><iq:language>eng</iq:language></iq:languages>`。
  - **权限策略不够智能**：当微件包含高度计（气压传感器）时，脚手架未自动声明 `<iq:uses-permission id="SensorHistory"/>`。

### 5. 步骤 5 (`garmin_build` / `garmin_env`)：编译与环境
- **环境诊断假阳性**：`checkGarminEnvironment` 仅判断器件目录是否存在，未判断器件包（`compiler.json`）是否完整，导致报假阳性。

---

## 🚀 三、 RSI (Recursive Self-Improvement) 自我提升模块规划

为了让表盘生成的每一个步骤达到 **100% 首次确定性成功（First-Try Success）**，我们设立专门的 **RSI 模块 (`src/rsi/`)**，实现「生成-评估-自愈」的闭环迭代：

### 1. 模块架构职责划分
```
src/rsi/
├── index.ts             # 模块统一入口与公共接口
├── quality-gate.ts      # 静态门禁与规则评估器 (Rule-based Evaluator)
├── code-refiner.ts      # 零分配与视觉对齐自愈修复器 (Deterministic Refiner)
├── archetype-suite.ts   # 标准表盘原型测试基准套件 (Benchmark Archetypes)
└── rsi-runner.ts        # 自递归迭代执行引擎 (Loop Runner)
```

### 2. RSI 核心能力
1. **自动评估 (Evaluator)**：
   - 扫描 `View.mc` 与 `manifest.xml`，输出 0~100 分综合质量评分。
   - 检查项：零分配（Zero Allocation）、64 色 MIP 合规、微件保真度（Arc/Bar/Badge 是否真实绘制）、Manifest 结构与权限。
2. **自愈修复 (Auto-Refiner)**：
   - 自动消除 `onUpdate` 中的数组字面量与 `Lang.format`。
   - 自动将微件升级为高保真矢量绘制代码（注入 `drawArcRing`、`drawProgressBar`、`drawDateBadge`）。
   - 自动补全 Manifest 语言标签与精准权限。
3. **闭环集成**：
   - 在 `garmin_scaffold` 内部自动执行 RSI 评估与自愈流程，确保输出即为 100 分满分工程，Agent 无需二次手工修补！
